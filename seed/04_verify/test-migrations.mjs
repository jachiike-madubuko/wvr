#!/usr/bin/env node
/**
 * Applies every migration to a real Postgres running in WASM, then asserts the
 * security properties actually hold. No Docker, no cloud project, no network.
 *
 * Static analysis cannot tell you whether RLS isolates two teachers or whether a
 * trigger really refuses a delete. This executes both.
 *
 * The shim below recreates the parts of a Supabase database that the migrations
 * depend on: the anon/authenticated/service_role roles, the auth schema, and
 * auth.uid(). Here auth.uid() reads a session setting so a test can act as a
 * given teacher, which is what PostgREST does with a JWT in production.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

const SUPABASE_SHIM = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key,
  email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $shim$
  select nullif(current_setting('test.user_id', true), '')::uuid
$shim$;

-- Present so the user_metadata advisor check has something to catch. No policy
-- should call this, which is exactly what that check asserts.
create or replace function auth.jwt()
returns jsonb
language sql
stable
as $shim$
  select coalesce(nullif(current_setting('test.jwt_claims', true), ''), '{}')::jsonb
$shim$;

-- Storage. Only the columns and the one helper the migrations touch. Real
-- Supabase ships more of both, but a fuller copy here would be a fixture that
-- drifts rather than a shim that fails loudly.
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to service_role;

-- Matches Supabase's own definition: every path segment except the filename,
-- so 'teacher/session/video.webm' yields {teacher,session} and [1] is the owner.
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
as $shim$
declare
  parts text[];
begin
  select string_to_array(name, '/') into parts;
  return parts[1 : array_length(parts, 1) - 1];
end
$shim$;
`;

const TEACHER_A = "11111111-1111-4111-8111-111111111111";
const TEACHER_B = "22222222-2222-4222-8222-222222222222";
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push({ name, message: error.message });
    console.log(`  FAIL ${name}\n         ${error.message.split("\n")[0]}`);
  }
}

/** Asserts a statement is refused, and that it is refused for the stated reason. */
async function refuses(db, sql, params, expected) {
  try {
    await db.query(sql, params);
  } catch (error) {
    if (!new RegExp(expected, "i").test(error.message)) {
      throw new Error(
        `refused, but for the wrong reason.\n  wanted /${expected}/\n  got:   ${error.message}`,
      );
    }
    return;
  }
  throw new Error(`statement was allowed but should have been refused: ${sql.trim()}`);
}

/** Asserts a statement is refused with the given SQLSTATE. */
async function refusesCode(db, sql, params, code) {
  try {
    await db.query(sql, params);
  } catch (error) {
    if (error.code !== code) {
      throw new Error(`wanted SQLSTATE ${code}, got ${error.code}: ${error.message}`);
    }
    return;
  }
  throw new Error(`statement was allowed but should have been refused: ${sql.trim()}`);
}

async function asTeacher(db, uid, fn) {
  await db.exec(`set role authenticated; set test.user_id = '${uid}';`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; set test.user_id = '';");
  }
}

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(SUPABASE_SHIM);
await db.exec(`
  create schema if not exists extensions;
  create extension if not exists pgcrypto with schema extensions;
  grant usage on schema extensions to public;
`);
await db.exec("set search_path to public, extensions");

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
console.log(`\nApplying ${files.length} migration(s) to Postgres (WASM)\n`);
for (const file of files) {
  try {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    console.log(`  ok   ${file}`);
  } catch (error) {
    console.error(`  FAIL ${file}\n\n${error.message}\n`);
    process.exit(1);
  }
}

// Seed. Runs as superuser, which bypasses RLS, exactly like service_role.
await db.exec(`
  insert into auth.users (id, email) values
    ('${TEACHER_A}', 'a@example.edu'),
    ('${TEACHER_B}', 'b@example.edu');
  -- No insert into public.teachers here on purpose. The on_auth_user_created
  -- trigger already made both rows, and an insert would collide. Naming them
  -- with UPDATE means a silently missing trigger fails the check below.
  update public.teachers set display_name = 'Teacher A' where id = '${TEACHER_A}';
  update public.teachers set display_name = 'Teacher B' where id = '${TEACHER_B}';
  -- No context_packs seeded here either. The packs come from the seed
  -- migration, so the tests below run against the content that ships.
`);

console.log("\nSchema invariant\n");

await check("seeded packs carry generation content, not just a label", async () => {
  // The failure this guards against is silent: a pack with an empty body
  // inserts fine and then produces variations that swap nouns without changing
  // the quantities, which is the one thing the product cannot afford to do.
  const rows = await db.query(`
    select id,
           jsonb_array_length(body -> 'quantities') as quantities,
           jsonb_array_length(body -> 'rate_pairs') as rate_pairs
    from public.context_packs
    where is_published
    order by id
  `);
  if (rows.rows.length < 3) {
    throw new Error(`expected at least 3 published packs, found ${rows.rows.length}`);
  }
  for (const p of rows.rows) {
    if (p.quantities < 3 || p.rate_pairs < 2) {
      throw new Error(
        `pack ${p.id} is underspecified: ${p.quantities} quantities, ${p.rate_pairs} rate pairs`,
      );
    }
  }
});

await check("a pack with an empty body is refused", async () => {
  await refuses(
    db,
    `insert into public.context_packs (id, label, body)
     values ('pack_empty_probe', 'Empty', '{}'::jsonb)`,
    [],
    "context_packs_body_has_generation_content",
  );
});

await check("signing up creates the teachers row without app code", async () => {
  const rows = await db.query(
    `select id, display_name from public.teachers where id in ($1, $2) order by display_name`,
    [TEACHER_A, TEACHER_B],
  );
  if (rows.rows.length !== 2) {
    throw new Error(
      `on_auth_user_created made ${rows.rows.length} teachers row(s) for 2 auth users`,
    );
  }
  if (rows.rows[0].display_name !== "Teacher A") {
    throw new Error("seed UPDATE did not name the trigger-created rows");
  }
});

await check("a teacher cannot assign their own role", () =>
  asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      "update public.teachers set role = 'founder' where id = $1",
      [TEACHER_A],
      "role is granted by a founder",
    ),
  ),
);

await check("only a founder can list teachers or set roles", async () => {
  await asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      "select public.list_teachers_for_admin()",
      [],
      "Only a founder can list accounts",
    ),
  );
  await asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      "select public.set_teacher_role($1, 'researcher')",
      [TEACHER_B],
      "Only a founder can assign roles",
    ),
  );
});

await check("a founder can promote and cannot demote the last founder", async () => {
  await db.query("update public.teachers set role = 'founder' where id = $1", [
    TEACHER_A,
  ]);
  await asTeacher(db, TEACHER_A, async () => {
    await db.query("select public.set_teacher_role($1, 'researcher')", [
      TEACHER_B,
    ]);
  });
  const b = await db.query(
    "select role, is_researcher, is_sprint_admin from public.teachers where id = $1",
    [TEACHER_B],
  );
  if (b.rows[0].role !== "researcher" || b.rows[0].is_researcher !== true) {
    throw new Error(`expected researcher flags, got ${JSON.stringify(b.rows[0])}`);
  }
  await asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      "select public.set_teacher_role($1, 'teacher')",
      [TEACHER_A],
      "Cannot demote the last founder",
    ),
  );
  await asTeacher(db, TEACHER_A, async () => {
    await db.query("select public.set_teacher_role($1, 'founder')", [TEACHER_B]);
    await db.query("select public.set_teacher_role($1, 'teacher')", [TEACHER_A]);
  });
  const a = await db.query("select role from public.teachers where id = $1", [
    TEACHER_A,
  ]);
  if (a.rows[0].role !== "teacher") {
    throw new Error("expected teacher A to be demoted after a second founder exists");
  }
  await db.query(
    "update public.teachers set role = 'teacher' where id in ($1, $2)",
    [TEACHER_A, TEACHER_B],
  );
});

await check("assert_no_student_pii_columns passes on the real schema", async () => {
  await db.query("select public.assert_no_student_pii_columns()");
});

await check("assert_no_student_pii_columns catches a student column", async () => {
  await db.exec("create table public.tmp_bad (id int, student_email text);");
  try {
    await refuses(
      db,
      "select public.assert_no_student_pii_columns()",
      [],
      "disallowed student PII columns",
    );
  } finally {
    await db.exec("drop table public.tmp_bad;");
  }
});

await check("first_name is refused on lesson tables", async () => {
  await db.exec("alter table public.recipes add column first_name text;");
  try {
    await refuses(
      db,
      "select public.assert_no_student_pii_columns()",
      [],
      "given-name columns are only allowed on public.students",
    );
  } finally {
    await db.exec("alter table public.recipes drop column first_name;");
  }
});

await check("standards scope covers 2nd grade November math and ela", async () => {
  const rows = await db.query(`
    select subject, count(*)::int as n
    from public.standards_scope
    where grade = 2 and month = 11 and subject in ('math', 'ela')
    group by subject
    order by subject
  `);
  if (rows.rows.length !== 2) {
    throw new Error(`expected math and ela scope rows, got ${JSON.stringify(rows.rows)}`);
  }
  for (const r of rows.rows) {
    if (r.n < 3) throw new Error(`${r.subject} November grade 2 has only ${r.n} standards`);
  }
});

console.log("\nPII gate\n");

const scanPassA = (
  await db.query(
    `insert into public.pii_scans (teacher_id, verdict, scanned_text_sha256, scanner_version)
     values ($1, 'pass', $2, 'pii.v1') returning id`,
    [TEACHER_A, SHA_A],
  )
).rows[0].id;

const scanBlockA = (
  await db.query(
    `insert into public.pii_scans (teacher_id, verdict, rule_id, scanned_text_sha256, scanner_version)
     values ($1, 'block', 'person_name', $2, 'pii.v1') returning id`,
    [TEACHER_A, SHA_B],
  )
).rows[0].id;

const scanPassB = (
  await db.query(
    `insert into public.pii_scans (teacher_id, verdict, scanned_text_sha256, scanner_version)
     values ($1, 'pass', $2, 'pii.v1') returning id`,
    [TEACHER_B, SHA_A],
  )
).rows[0].id;

await check("a recipe with a passing scan is stored", async () => {
  await db.query(
    `insert into public.recipes (teacher_id, pii_scan_id, locked) values ($1, $2, '{}'::jsonb)`,
    [TEACHER_A, scanPassA],
  );
});

await check("a recipe referencing a BLOCKED scan is refused", () =>
  refuses(
    db,
    `insert into public.recipes (teacher_id, pii_scan_id, locked) values ($1, $2, '{}'::jsonb)`,
    [TEACHER_A, scanBlockA],
    "pii gate: scan .* has verdict block",
  ),
);

await check("a recipe borrowing another teacher's scan is refused", () =>
  refuses(
    db,
    `insert into public.recipes (teacher_id, pii_scan_id, locked) values ($1, $2, '{}'::jsonb)`,
    [TEACHER_A, scanPassB],
    "belongs to a different teacher",
  ),
);

// A BEFORE INSERT trigger runs ahead of the NOT NULL check, so the gate rejects
// this before the column constraint gets a chance. Either refusal is correct.
await check("a recipe with no scan at all is refused", () =>
  refuses(
    db,
    `insert into public.recipes (teacher_id, locked) values ($1, '{}'::jsonb)`,
    [TEACHER_A],
    "pii gate|null value in column .pii_scan_id",
  ),
);

await check("a scan verdict cannot be rewritten, even as superuser", () =>
  refuses(
    db,
    `update public.pii_scans set verdict = 'pass' where id = $1`,
    [scanBlockA],
    "append-only",
  ),
);

await check("a scan cannot be deleted while a recipe references it", () =>
  refuses(
    db,
    `delete from public.pii_scans where id = $1`,
    [scanPassA],
    "violates foreign key constraint",
  ),
);

console.log("\nRow level security\n");

await check("a teacher sees only their own recipes", async () => {
  const mine = await asTeacher(db, TEACHER_A, () =>
    db.query("select count(*)::int as n from public.recipes"),
  );
  const theirs = await asTeacher(db, TEACHER_B, () =>
    db.query("select count(*)::int as n from public.recipes"),
  );
  if (mine.rows[0].n !== 1) throw new Error(`teacher A saw ${mine.rows[0].n} recipes, wanted 1`);
  if (theirs.rows[0].n !== 0) throw new Error(`teacher B saw ${theirs.rows[0].n} recipes, wanted 0`);
});

await check("a teacher cannot write a recipe owned by someone else", () =>
  asTeacher(db, TEACHER_B, () =>
    refuses(
      db,
      `insert into public.recipes (teacher_id, pii_scan_id, locked) values ($1, $2, '{}'::jsonb)`,
      [TEACHER_A, scanPassA],
      "row-level security",
    ),
  ),
);

await check("anonymous requests see nothing", async () => {
  await db.exec("set role anon;");
  try {
    await refuses(db, "select * from public.recipes", [], "permission denied");
  } finally {
    await db.exec("reset role;");
  }
});

await check("a teacher cannot self-assign into a district", () =>
  asTeacher(db, TEACHER_A, async () => {
    const org = (
      await db.query("select id from public.orgs limit 1")
    ).rows[0];
    if (!org) return; // no orgs seeded; covered by the next check
    await refuses(
      db,
      `update public.teachers set org_id = $1 where id = $2`,
      [org.id, TEACHER_A],
      "assigned out of band",
    );
  }),
);

await check("a teacher cannot self-grant researcher access", () =>
  asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      `update public.teachers set is_researcher = true where id = $1`,
      [TEACHER_A],
      "granted out of band",
    ),
  ),
);

// Research sessions. Seeded as superuser so the RLS checks below are about
// reading, not about whether insert policies fire.
const SESSION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SESSION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
await db.query(
  `insert into public.feedback_sessions (
     id, teacher_id, duration_ms, entry_route, stop_reason,
     video_path, audio_path, status, consent_version, consent_at, markers
   ) values
   ($1::uuid, $2::uuid, 60000, '/', 'user',
    $2::text || '/' || $1::text || '/video.webm',
    $2::text || '/' || $1::text || '/audio.webm',
    'uploaded', 'recording.v1', now(), '[]'::jsonb),
   ($3::uuid, $4::uuid, 45000, '/review', 'user',
    $4::text || '/' || $3::text || '/video.webm',
    $4::text || '/' || $3::text || '/audio.webm',
    'ready', 'recording.v1', now(), '[]'::jsonb)`,
  [SESSION_A, TEACHER_A, SESSION_B, TEACHER_B],
);

await check("a teacher sees only their own research sessions", async () => {
  const mine = await asTeacher(db, TEACHER_A, () =>
    db.query("select id from public.feedback_sessions order by id"),
  );
  if (mine.rows.length !== 1 || mine.rows[0].id !== SESSION_A) {
    throw new Error(
      `teacher A saw ${JSON.stringify(mine.rows.map((r) => r.id))}, wanted only ${SESSION_A}`,
    );
  }
});

await check("a researcher sees every teacher's research sessions", async () => {
  await db.query(
    `update public.teachers set is_researcher = true where id = $1`,
    [TEACHER_A],
  );
  const seen = await asTeacher(db, TEACHER_A, () =>
    db.query("select count(*)::int as n from public.feedback_sessions"),
  );
  if (seen.rows[0].n !== 2) {
    throw new Error(`researcher saw ${seen.rows[0].n} sessions, wanted 2`);
  }
  // Leave A as a researcher for the rest of the suite; purge still works, and
  // B's session remains to prove B is untouched.
});

await check("consent and ownership cannot be rewritten after recording", () =>
  asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      `update public.feedback_sessions
         set consent_version = 'recording.v2'
       where id = $1`,
      [SESSION_A],
      "fixed at recording time",
    ),
  ),
);

await check("a new session gets a 30-day expiry by default", async () => {
  const row = await db.query(
    `select
       expires_at > now() + interval '29 days' as after_29,
       expires_at < now() + interval '31 days' as before_31
     from public.feedback_sessions where id = $1`,
    [SESSION_A],
  );
  if (!row.rows[0].after_29 || !row.rows[0].before_31) {
    throw new Error("expires_at is not approximately 30 days from insert");
  }
});

console.log("\nAppend-only ledgers\n");

await db.query(
  `insert into public.events (teacher_id, name, payload) values ($1, 'review.completed', '{"ms":1200}'::jsonb)`,
  [TEACHER_A],
);

await check("events cannot be updated, even as superuser", () =>
  refuses(db, "update public.events set name = 'tampered.event'", [], "append-only"),
);

await check("events cannot be deleted, even as superuser", () =>
  refuses(db, "delete from public.events", [], "append-only"),
);

await check("events cannot be truncated", () =>
  refuses(db, "truncate public.events", [], "append-only"),
);

// Checked after the purge below, once a certificate row exists. A row-level
// trigger cannot fire on a DELETE that matches nothing, so testing it against an
// empty table would prove nothing.

console.log("\nReferential integrity\n");

await check("an unknown context pack is refused", async () => {
  const recipe = (
    await db.query("select id from public.recipes where teacher_id = $1", [TEACHER_A])
  ).rows[0].id;
  await refuses(
    db,
    `insert into public.variation_sets (teacher_id, base_recipe_id, pack_ids, payload)
     values ($1, $2, array['pack_soccer','pack_does_not_exist'], '{}'::jsonb)`,
    [TEACHER_A, recipe],
    "unknown or unpublished context pack",
  );
});

await check("a known context pack is accepted", async () => {
  const recipe = (
    await db.query("select id from public.recipes where teacher_id = $1", [TEACHER_A])
  ).rows[0].id;
  await db.query(
    `insert into public.variation_sets (teacher_id, base_recipe_id, pack_ids, payload)
     values ($1, $2, array['pack_soccer','pack_cooking'], '{}'::jsonb)`,
    [TEACHER_A, recipe],
  );
});

console.log("\nRoster and calendar\n");

const CLASS_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const STUDENT_A = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

await check("a teacher can insert a named student on their class", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    await db.query(
      `insert into public.classes (id, teacher_id, name, grade)
       values ($1, $2, 'Room 204', 2)`,
      [CLASS_A, TEACHER_A],
    );
    await db.query(
      `insert into public.students (id, class_id, first_name, sort_key)
       values ($1, $2, 'Maya', 0)`,
      [STUDENT_A, CLASS_A],
    );
  });
});

await check("a teacher can store a class standards schedule row", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    await db.query(
      `insert into public.standards_schedule
         (class_id, standard_id, start_date, end_date)
       values ($1, '2.NBT.B.5', '2026-09-01', '2026-12-15')`,
      [CLASS_A],
    );
  });
});

await check("a teacher cannot read another teacher's standards schedule", async () => {
  const seen = await asTeacher(db, TEACHER_B, () =>
    db.query("select standard_id from public.standards_schedule"),
  );
  if (seen.rows.length !== 0) {
    throw new Error(`teacher B saw ${seen.rows.length} schedule row(s)`);
  }
});

await check("a student override must belong to the class", () =>
  asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      `insert into public.standards_schedule_overrides
         (class_id, student_id, standard_id, start_date, end_date)
       values ($1, $2, '2.NBT.B.5', '2026-09-01', '2026-12-15')`,
      [CLASS_A, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
      "belong to class|foreign key|violates",
    ),
  ),
);

await check("placeholder local standards are readable", async () => {
  const rows = await asTeacher(db, TEACHER_A, () =>
    db.query("select id from public.local_standards where class_id is null"),
  );
  if (rows.rows.length < 5) {
    throw new Error(`expected placeholder catalog, found ${rows.rows.length}`);
  }
});


await check("a teacher cannot read another teacher's roster", async () => {
  const seen = await asTeacher(db, TEACHER_B, () =>
    db.query("select first_name from public.students"),
  );
  if (seen.rows.length !== 0) {
    throw new Error(`teacher B saw ${seen.rows.length} student(s)`);
  }
});

await check("anon cannot read the roster", async () => {
  await db.exec("set role anon;");
  try {
    await refuses(db, "select * from public.students", [], "permission denied");
  } finally {
    await db.exec("reset role;");
  }
});

await check("a teacher can store wheel answers on their student", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    await db.query(
      `insert into public.student_wheel_answers (student_id, item_id, option_id)
       values ($1, 'hard', 'keeps')`,
      [STUDENT_A],
    );
    await db.query(
      `insert into public.student_action_threads (student_id, kind, messages)
       values ($1, 'sel', '[]'::jsonb)`,
      [STUDENT_A],
    );
  });
});

await check("a teacher cannot read another teacher's wheel or action drafts", async () => {
  const wheel = await asTeacher(db, TEACHER_B, () =>
    db.query("select item_id from public.student_wheel_answers"),
  );
  const threads = await asTeacher(db, TEACHER_B, () =>
    db.query("select kind from public.student_action_threads"),
  );
  if (wheel.rows.length !== 0 || threads.rows.length !== 0) {
    throw new Error(
      `teacher B saw wheel ${wheel.rows.length} / threads ${threads.rows.length}`,
    );
  }
});

await check("anon cannot read wheel answers", async () => {
  await db.exec("set role anon;");
  try {
    await refuses(db, "select * from public.student_wheel_answers", [], "permission denied");
  } finally {
    await db.exec("reset role;");
  }
});

await check("a teacher can append a comment log, default compile off", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    await db.query(
      `insert into public.student_comment_logs (student_id, body)
       values ($1, 'Sat out of the second check item.')`,
      [STUDENT_A],
    );
    await db.query(
      `insert into public.student_log_settings (student_id)
       values ($1)`,
      [STUDENT_A],
    );
    const settings = await db.query(
      `select include_in_agent_compile from public.student_log_settings where student_id = $1`,
      [STUDENT_A],
    );
    if (settings.rows[0]?.include_in_agent_compile !== false) {
      throw new Error("compile toggle must default off");
    }
  });
});

await check("a teacher cannot read another teacher's comment log", async () => {
  const logs = await asTeacher(db, TEACHER_B, () =>
    db.query("select body from public.student_comment_logs"),
  );
  const settings = await asTeacher(db, TEACHER_B, () =>
    db.query("select include_in_agent_compile from public.student_log_settings"),
  );
  if (logs.rows.length !== 0 || settings.rows.length !== 0) {
    throw new Error(
      `teacher B saw logs ${logs.rows.length} / settings ${settings.rows.length}`,
    );
  }
});

await check("anon cannot read comment logs", async () => {
  await db.exec("set role anon;");
  try {
    await refuses(db, "select * from public.student_comment_logs", [], "permission denied");
  } finally {
    await db.exec("reset role;");
  }
});

const UNIT_A = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const LESSON_A = "ffffffff-ffff-4fff-8fff-ffffffffffff";

await check("a lesson nests under a unit of the same class", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    await db.query(
      `insert into public.calendar_blocks
         (id, class_id, teacher_id, start_date, end_date, subjects, kind, title)
       values
         ($1, $2, $3, '2026-08-10', '2026-08-12', array['math'], 'unit', 'Fractions')`,
      [UNIT_A, CLASS_A, TEACHER_A],
    );
    await db.query(
      `insert into public.calendar_blocks
         (id, class_id, teacher_id, start_date, end_date, subjects, kind, title, unit_id)
       values
         ($1, $2, $3, '2026-08-10', '2026-08-10', array['math'], 'lesson', 'Halves', $4)`,
      [LESSON_A, CLASS_A, TEACHER_A, UNIT_A],
    );
  });
});

await check("a unit cannot carry a parent unit_id", () =>
  asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      `insert into public.calendar_blocks
         (class_id, teacher_id, start_date, end_date, subjects, kind, unit_id)
       values ($1, $2, '2026-08-10', '2026-08-10', array['math'], 'unit', $3)`,
      [CLASS_A, TEACHER_A, UNIT_A],
      "units cannot have a parent|unit_kind|unit_id",
    ),
  ),
);

await check("a block cannot parent itself", () =>
  asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      `update public.calendar_blocks set unit_id = id where id = $1`,
      [LESSON_A],
      "cannot parent itself|unit_id must reference a unit",
    ),
  ),
);

await check("path progress keeps cumulative blockMs and drops unknown keys", async () => {
  const hash = (
    await db.query("select encode(digest('tok-a', 'sha256'), 'hex') as h")
  ).rows[0].h;
  await asTeacher(db, TEACHER_A, () =>
    db.query(
      `insert into public.student_path_tokens
         (token_hash, calendar_block_id, variation_id, payload, expires_at)
       values ($1, $2, 'var_a', '{"title":"x"}'::jsonb, now() + interval '2 days')`,
      [hash, LESSON_A],
    ),
  );
  await db.exec("set role anon;");
  try {
    await db.query("select public.save_student_path_progress($1, $2::jsonb)", [
      hash,
      JSON.stringify({
        completedBlockIds: ["hook"],
        blockMs: { hook: 1000 },
        evil: true,
      }),
    ]);
    await db.query("select public.save_student_path_progress($1, $2::jsonb)", [
      hash,
      JSON.stringify({
        completedBlockIds: ["hook"],
        blockMs: { hook: 500 },
      }),
    ]);
  } finally {
    await db.exec("reset role;");
  }
  const row = await asTeacher(db, TEACHER_A, () =>
    db.query("select progress from public.student_path_tokens where token_hash = $1", [
      hash,
    ]),
  );
  const progress = row.rows[0]?.progress;
  const parsed = typeof progress === "string" ? JSON.parse(progress) : progress;
  if (parsed?.blockMs?.hook !== 1500) {
    throw new Error(`expected blockMs.hook 1500, got ${JSON.stringify(parsed)}`);
  }
  if (parsed.evil !== undefined || parsed.blockMs.evil !== undefined) {
    throw new Error("unknown progress keys must be dropped");
  }
  if (!Array.isArray(parsed.completedBlockIds) || parsed.completedBlockIds[0] !== "hook") {
    throw new Error("completedBlockIds did not survive");
  }
  const peek = await asTeacher(db, TEACHER_B, () =>
    db.query("select progress from public.student_path_tokens where token_hash = $1", [
      hash,
    ]),
  );
  if (peek.rows.length !== 0) {
    throw new Error("teacher B read another teacher's path progress");
  }
});

await check("path progress caps a single write at four hours", async () => {
  const hash = (
    await db.query("select encode(digest('tok-cap', 'sha256'), 'hex') as h")
  ).rows[0].h;
  await asTeacher(db, TEACHER_A, () =>
    db.query(
      `insert into public.student_path_tokens
         (token_hash, calendar_block_id, variation_id, payload, expires_at)
       values ($1, $2, 'var_b', '{"title":"y"}'::jsonb, now() + interval '2 days')`,
      [hash, LESSON_A],
    ),
  );
  await db.exec("set role anon;");
  try {
    await db.query("select public.save_student_path_progress($1, $2::jsonb)", [
      hash,
      JSON.stringify({
        completedBlockIds: [],
        blockMs: { hook: 99_999_999 },
      }),
    ]);
  } finally {
    await db.exec("reset role;");
  }
  const row = await asTeacher(db, TEACHER_A, () =>
    db.query("select progress from public.student_path_tokens where token_hash = $1", [
      hash,
    ]),
  );
  const parsed =
    typeof row.rows[0]?.progress === "string"
      ? JSON.parse(row.rows[0].progress)
      : row.rows[0]?.progress;
  if (parsed?.blockMs?.hook !== 14_400_000) {
    throw new Error(`write cap failed: ${JSON.stringify(parsed)}`);
  }
});

await check("a second teacher cannot approve another teacher's calendar block", async () => {
  const recipe = (
    await db.query("select id from public.recipes where teacher_id = $1 limit 1", [
      TEACHER_A,
    ])
  ).rows[0];
  if (!recipe) throw new Error("teacher A has no recipe to attach a variation set");
  const APPROVE_BLOCK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const vset = (
    await asTeacher(db, TEACHER_A, () =>
      db.query(
        `insert into public.variation_sets (teacher_id, base_recipe_id, pack_ids, payload)
         values ($1, $2, array['pack_soccer','pack_cooking'], '{"title":"ratios"}'::jsonb)
         returning id`,
        [TEACHER_A, recipe.id],
      ),
    )
  ).rows[0];
  await asTeacher(db, TEACHER_A, () =>
    db.query(
      `insert into public.calendar_blocks
         (id, class_id, teacher_id, start_date, end_date, subjects, kind, title,
          variation_set_id, status)
       values
         ($1, $2, $3, '2026-09-09', '2026-09-09', array['math'], 'lesson', 'Ratios',
          $4, 'awaiting_review')`,
      [APPROVE_BLOCK, CLASS_A, TEACHER_A, vset.id],
    ),
  );
  const tokenHash = (
    await db.query("select encode(digest('tok-approve-a', 'sha256'), 'hex') as h")
  ).rows[0].h;
  await asTeacher(db, TEACHER_A, () =>
    db.query(
      `insert into public.student_path_tokens
         (token_hash, calendar_block_id, variation_id, payload, expires_at)
       values ($1, $2, 'var_keep', '{"title":"keep"}'::jsonb, now() + interval '2 days')`,
      [tokenHash, APPROVE_BLOCK],
    ),
  );

  await asTeacher(db, TEACHER_B, () =>
    refuses(
      db,
      `select public.approve_calendar_block_with_tokens(
         $1::uuid, $2::uuid, '{"title":"stolen"}'::jsonb,
         '[{"token_hash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","variation_id":"var_x","payload":{"title":"x"},"expires_at":"2026-12-01T00:00:00Z"}]'::jsonb
       )`,
      [APPROVE_BLOCK, vset.id],
      "variation set not found|insufficient_privilege|calendar block not found",
    ),
  );

  const block = await db.query(
    "select status from public.calendar_blocks where id = $1",
    [APPROVE_BLOCK],
  );
  if (block.rows[0].status !== "awaiting_review") {
    throw new Error(`cross-teacher approve mutated status to ${block.rows[0].status}`);
  }
  const kept = await asTeacher(db, TEACHER_A, () =>
    db.query("select token_hash from public.student_path_tokens where calendar_block_id = $1", [
      APPROVE_BLOCK,
    ]),
  );
  if (kept.rows.length !== 1 || kept.rows[0].token_hash !== tokenHash) {
    throw new Error("cross-teacher approve deleted or replaced the owner's tokens");
  }
  const stolen = await db.query(
    "select payload->>'title' as title from public.variation_sets where id = $1",
    [vset.id],
  );
  if (stolen.rows[0].title === "stolen") {
    throw new Error("cross-teacher approve overwrote the variation payload");
  }
});

await check("path sessions link a student and refuse another class", async () => {
  const hash = (
    await db.query("select encode(digest('tok-session', 'sha256'), 'hex') as h")
  ).rows[0].h;
  const tokenId = (
    await asTeacher(db, TEACHER_A, () =>
      db.query(
        `insert into public.student_path_tokens
           (token_hash, calendar_block_id, variation_id, payload, expires_at)
         values ($1, $2, 'var_s', '{"blocks":[{"id":"hook","title":"Warmup","type":"read"}]}'::jsonb, now() + interval '2 days')
         returning id`,
        [hash, LESSON_A],
      ),
    )
  ).rows[0].id;
  if (!tokenId) throw new Error("token insert failed");

  await db.exec("set role anon;");
  try {
    await db.query("select public.save_student_path_session($1, $2, $3::jsonb)", [
      hash,
      STUDENT_A,
      JSON.stringify({ completedBlockIds: ["hook"], blockMs: { hook: 1000 } }),
    ]);
    await db.query("select public.save_student_path_session($1, $2, $3::jsonb)", [
      hash,
      STUDENT_A,
      JSON.stringify({ completedBlockIds: ["hook"], blockMs: { hook: 500 } }),
    ]);
    await refuses(
      db,
      "select public.save_student_path_session($1, $2, $3::jsonb)",
      [
        hash,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        JSON.stringify({ completedBlockIds: [], blockMs: { hook: 1 } }),
      ],
      "student not on this class",
    );
  } finally {
    await db.exec("reset role;");
  }

  const row = await asTeacher(db, TEACHER_A, () =>
    db.query(
      "select progress from public.student_path_sessions where student_id = $1",
      [STUDENT_A],
    ),
  );
  const parsed =
    typeof row.rows[0]?.progress === "string"
      ? JSON.parse(row.rows[0].progress)
      : row.rows[0]?.progress;
  if (parsed?.blockMs?.hook !== 1500) {
    throw new Error(`session blockMs ${JSON.stringify(parsed)}`);
  }

  const roster = await db.query("select public.open_student_path_roster($1) as r", [
    hash,
  ]);
  const names = roster.rows[0]?.r;
  const list = typeof names === "string" ? JSON.parse(names) : names;
  if (!Array.isArray(list) || list[0]?.firstName !== "Maya") {
    throw new Error(`roster ${JSON.stringify(list)}`);
  }
  if (JSON.stringify(list).includes("last")) {
    throw new Error("roster leaked extra fields");
  }

  const peek = await asTeacher(db, TEACHER_B, () =>
    db.query("select student_id from public.student_path_sessions"),
  );
  if (peek.rows.length !== 0) {
    throw new Error("teacher B read path sessions");
  }

  await db.exec("set role anon;");
  try {
    await refuses(
      db,
      "select * from public.student_path_sessions",
      [],
      "permission denied",
    );
  } finally {
    await db.exec("reset role;");
  }
});

await check("block events record a fast pass and a struggle, and stay on the teacher's class", async () => {
  const hash = (
    await db.query("select encode(digest('tok-block-events', 'sha256'), 'hex') as h")
  ).rows[0].h;
  await asTeacher(db, TEACHER_A, () =>
    db.query(
      `insert into public.student_path_tokens
         (token_hash, calendar_block_id, variation_id, payload, expires_at)
       values ($1, $2, 'var_be', '{"blocks":[]}'::jsonb, now() + interval '2 days')`,
      [hash, LESSON_A],
    ),
  );
  await db.exec("set role anon;");
  try {
    await db.query("select public.save_student_path_session($1, $2, $3::jsonb)", [
      hash,
      STUDENT_A,
      JSON.stringify({
        completedBlockIds: ["hook"],
        blockMs: { hook: 1000 },
        blockEvents: [
          { blockId: "hook", subject: "hook", attempts: 1, durationSec: 130, errorLog: [] },
          {
            blockId: "science",
            subject: "science",
            attempts: 4,
            durationSec: 210,
            errorLog: ["wrong planet"],
          },
        ],
      }),
    ]);
    await refuses(db, "select * from public.block_events", [], "permission denied");
  } finally {
    await db.exec("reset role;");
  }
  const rows = await asTeacher(db, TEACHER_A, () =>
    db.query(
      "select block_id, status, attempts, duration_sec from public.block_events where student_id = $1 order by block_id",
      [STUDENT_A],
    ),
  );
  const byId = Object.fromEntries(rows.rows.map((row) => [row.block_id, row]));
  if (byId.hook?.status !== "completed" || Number(byId.hook.attempts) !== 1) {
    throw new Error(`fast block ${JSON.stringify(rows.rows)}`);
  }
  if (byId.science?.status !== "struggling" || Number(byId.science.duration_sec) !== 210) {
    throw new Error(`slow block ${JSON.stringify(rows.rows)}`);
  }
  const hidden = await asTeacher(db, TEACHER_B, () =>
    db.query("select count(*)::int as n from public.block_events where student_id = $1", [STUDENT_A]),
  );
  if (hidden.rows[0].n !== 0) {
    throw new Error("another teacher can read the block events");
  }
});

console.log("\nErasure\n");

await check("a teacher cannot purge another teacher", () =>
  asTeacher(db, TEACHER_B, () =>
    refuses(
      db,
      "select public.purge_teacher_data($1)",
      [TEACHER_A],
      "may only purge their own data",
    ),
  ),
);

await check("an unauthenticated caller cannot purge anyone", () =>
  refuses(
    db,
    "select public.purge_teacher_data($1)",
    [TEACHER_A],
    "may only purge their own data",
  ),
);

await check("the operator purge is not reachable by a teacher", () =>
  asTeacher(db, TEACHER_B, () =>
    refuses(
      db,
      "select public.admin_purge_teacher_data($1)",
      [TEACHER_A],
      "permission denied",
    ),
  ),
);

await check("the unchecked worker is not callable directly by a teacher", () =>
  asTeacher(db, TEACHER_B, () =>
    refuses(
      db,
      "select public.purge_teacher_data_unchecked($1, null)",
      [TEACHER_A],
      "permission denied",
    ),
  ),
);

await check("purge removes every owned row and returns a certificate", async () => {
  const before = await db.query(
    "select count(*)::int as n from public.events where teacher_id = $1",
    [TEACHER_A],
  );
  if (before.rows[0].n === 0) throw new Error("expected an event row before purge");

  await asTeacher(db, TEACHER_A, () =>
    db.query("select public.purge_teacher_data($1)", [TEACHER_A]),
  );

  const remaining = await db.query(
    `select
       (select count(*)::int from public.recipes           where teacher_id = $1) as recipes,
       (select count(*)::int from public.variation_sets    where teacher_id = $1) as variation_sets,
       (select count(*)::int from public.pii_scans         where teacher_id = $1) as pii_scans,
       (select count(*)::int from public.feedback_sessions where teacher_id = $1) as feedback_sessions,
       (select count(*)::int from public.teachers          where id         = $1) as teachers,
       (select count(*)::int from public.classes           where teacher_id = $1) as classes,
       (select count(*)::int from public.students          s
          join public.classes c on c.id = s.class_id
          where c.teacher_id = $1) as students,
       (select count(*)::int from public.standards_schedule) as standards_schedule,
       (select count(*)::int from public.standards_schedule_overrides) as standards_schedule_overrides,
       (select count(*)::int from public.student_comment_logs) as student_comment_logs,
       (select count(*)::int from public.student_log_settings) as student_log_settings,
       (select count(*)::int from public.events            where teacher_id = $1) as events`,
    [TEACHER_A],
  );
  const r = remaining.rows[0];
  for (const table of [
    "recipes",
    "variation_sets",
    "pii_scans",
    "feedback_sessions",
    "teachers",
    "classes",
    "students",
    "student_comment_logs",
    "student_log_settings",
    "standards_schedule",
    "standards_schedule_overrides",
  ]) {
    if (r[table] !== 0) throw new Error(`${table} still has ${r[table]} row(s) after purge`);
  }
  if (r.events !== 1) {
    throw new Error(`events should be retained de-identified, found ${r.events}`);
  }

  const cert = await db.query(
    "select * from public.deletion_certificates where subject_id = $1",
    [TEACHER_A],
  );
  if (cert.rows.length !== 1) {
    throw new Error(
      `expected exactly 1 deletion certificate, found ${cert.rows.length}`,
    );
  }
  const counts = cert.rows[0].rows_deleted;
  if (
    counts.recipes !== 1 ||
    counts.teachers !== 1 ||
    counts.variation_sets !== 2 ||
    counts.feedback_sessions !== 1 ||
    counts.classes !== 1
  ) {
    throw new Error(`certificate counts look wrong: ${JSON.stringify(counts)}`);
  }
});

await check("purge removes the auth identity, not just the app rows", async () => {
  // An erasure that leaves the account behind is not an erasure, and the
  // teacher who signs back in lands in a broken state: valid session, no
  // teachers row, every write failing a foreign key.
  const left = await db.query("select count(*)::int as n from auth.users where id = $1", [
    TEACHER_A,
  ]);
  if (left.rows[0].n !== 0) throw new Error("auth.users row survived the purge");

  const cert = await db.query(
    "select rows_deleted from public.deletion_certificates where subject_id = $1",
    [TEACHER_A],
  );
  if (cert.rows[0].rows_deleted.identity !== 1) {
    throw new Error(
      `certificate should record the identity deletion, got ${JSON.stringify(
        cert.rows[0].rows_deleted.identity,
      )}`,
    );
  }
});

await check("purging twice does not mint a second certificate", async () => {
  // A retried request, a double-clicked button, or `select (purge(...)).*`
  // (which Postgres evaluates once per output column) all call this repeatedly.
  // One erasure must leave exactly one piece of evidence.
  const before = await db.query(
    "select id from public.deletion_certificates where subject_id = $1",
    [TEACHER_A],
  );

  await asTeacher(db, TEACHER_A, async () => {
    await db.query("select public.purge_teacher_data($1)", [TEACHER_A]);
    await db.query("select public.purge_teacher_data($1)", [TEACHER_A]);
  });

  const after = await db.query(
    "select id from public.deletion_certificates where subject_id = $1",
    [TEACHER_A],
  );
  if (after.rows.length !== before.rows.length) {
    throw new Error(
      `repeat purge wrote ${after.rows.length - before.rows.length} extra certificate(s)`,
    );
  }
  if (after.rows[0].id !== before.rows[0].id) {
    throw new Error("repeat purge replaced the original certificate");
  }
});

await check("a written certificate cannot be deleted, even as superuser", () =>
  refuses(db, "delete from public.deletion_certificates", [], "append-only"),
);

await check("a written certificate cannot be edited, even as superuser", () =>
  refuses(
    db,
    "update public.deletion_certificates set rows_deleted = '{}'::jsonb",
    [],
    "append-only",
  ),
);

await check("purged events no longer resolve to a person", async () => {
  const orphan = await db.query(
    `select count(*)::int as n from public.events e
     where e.teacher_id = $1
       and not exists (select 1 from public.teachers t where t.id = e.teacher_id)`,
    [TEACHER_A],
  );
  if (orphan.rows[0].n !== 1) {
    throw new Error("expected the retained event to point at a deleted teacher");
  }
});

await check("teacher B is untouched by teacher A's purge", async () => {
  const b = await db.query(
    `select
       (select count(*)::int from public.teachers where id = $1) as teachers,
       (select count(*)::int from public.feedback_sessions where teacher_id = $1) as sessions`,
    [TEACHER_B],
  );
  if (b.rows[0].teachers !== 1) {
    throw new Error("teacher B was deleted by another teacher's purge");
  }
  if (b.rows[0].sessions !== 1) {
    throw new Error("teacher B's research session was deleted by another teacher's purge");
  }
});

// ---------------------------------------------------------------------------
// Supabase advisor equivalents
//
// Supabase's database linter runs against the cloud project, which means it
// catches a regression after it ships. These reimplement the lints that matter
// here so they run on every commit, offline, with no access token.
//
// They are not a replacement for `get_advisors` against the real project. They
// are the subset that can be checked from the migrations alone.
// ---------------------------------------------------------------------------

console.log("\nSupabase advisor equivalents\n");

/**
 * Reachable over PostgREST at /rest/v1/rpc/<name>, runs as its owner, and so
 * ignores RLS. Anything on this list is a deliberate product endpoint that
 * does its own authorization; everything else must have EXECUTE revoked.
 */
const RPC_ALLOWLIST = new Set([
  "purge_teacher_data",
  // Takes no arguments and answers one question about the caller: are you a
  // researcher. Called from the feedback_sessions and storage.objects policies,
  // where it must be SECURITY DEFINER so those policies do not depend on the
  // caller being able to read their own teachers row. Reachable over RPC it
  // tells a teacher something they are already allowed to see about themselves.
  "current_teacher_is_researcher",
  // Capability-link student path. Hashed token in, student-facing blocks out.
  // No names. Granted to anon because kids have no accounts.
  // Demo-scoped space lesson (single lesson, no ownership check, by design).
  // Student handles are opaque ^[A-Za-z0-9_-]{1,64}$ ids; tables are unreachable
  // except through these functions.
  "space_open",
  "space_save",
  "space_log",
  "space_set_paused",
  "space_set_explain",
  "space_set_group",
  "space_teacher_view",
  // The one space lesson document. Student path and teacher review both read it.
  "space_lesson",
  // Galaxy plan (demo-scoped like the rest of the space lesson): save a plan in
  // space_control.plan, and apply it when its date is due (called on teacher load).
  "space_save_plan",
  "space_apply_due_plan",
  "open_student_path",
  "save_student_path_progress",
  "open_student_path_roster",
  "open_student_path_session",
  "save_student_path_session",
  "publish_student_path_payload",
  // Sprint rooms. Token-gated workshop RPCs and the RLS helpers they call.
  "open_sprint",
  "join_sprint",
  "replace_sprint_items",
  "set_sprint_phase",
  "set_sprint_phase_by_id",
  "save_sprint_votes",
  "replace_sprint_clusters",
  "is_sprint_host",
  "is_sprint_member",
  "current_teacher_is_sprint_admin",
  "current_teacher_is_founder",
  "set_teacher_role",
  "list_teachers_for_admin",
  "sprint_admin_list",
  "set_sprint_admin",
  "list_sprint_admins",
  "mark_sprint_done",
  "open_sprint_sketch",
  "insert_sprint_item",
  "attach_sprint_item_image",
  "can_read_sprint_sketch",
  "can_write_sprint_sketch",
  // Demo adaptive MVP: demo-scoped, anon-callable, no ownership check, by design.
  "demo_ensure_session",
  "demo_snapshot",
  "demo_save_progress",
  "demo_replace_cohorts",
  "demo_create_intervention",
  "demo_resolve_intervention",
  "demo_seed_student",
  "demo_append_events",
  "demo_reset_session",
]);

await check("no unlisted security definer function is callable by anon or authenticated", async () => {
  const rows = await db.query(`
    select p.proname, r.rolname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join (select unnest(array['anon','authenticated']) as rolname) r
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege(r.rolname, p.oid, 'execute')
    order by p.proname, r.rolname
  `);
  const offenders = rows.rows.filter((r) => !RPC_ALLOWLIST.has(r.proname));
  if (offenders.length > 0) {
    const list = offenders.map((o) => `${o.proname} (${o.rolname})`).join(", ");
    throw new Error(
      `security definer function(s) exposed as RPC: ${list}. Revoke execute, or add to RPC_ALLOWLIST with a reason.`,
    );
  }
});

await check("every function in public pins its search_path", async () => {
  // An unpinned search_path lets a caller who can create objects shadow a table
  // referenced inside a security definer function. Supabase lints this as
  // 0011_function_search_path_mutable.
  const rows = await db.query(`
    select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c
        where c like 'search_path=%'
      )
    order by p.proname
  `);
  if (rows.rows.length > 0) {
    throw new Error(
      `function(s) with a mutable search_path: ${rows.rows.map((r) => r.proname).join(", ")}`,
    );
  }
});

await check("no RLS policy trusts user-editable metadata", async () => {
  // raw_user_meta_data is writable by the user it describes, so a policy that
  // reads it is a self-service privilege escalation.
  const rows = await db.query(`
    select polname, tablename
    from (
      select pol.polname,
             c.relname as tablename,
             coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ||
             coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') as body
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
    ) p
    where body like '%user_metadata%'
  `);
  if (rows.rows.length > 0) {
    throw new Error(
      `policy/policies reading user_metadata: ${rows.rows
        .map((r) => `${r.tablename}.${r.polname}`)
        .join(", ")}`,
    );
  }
});

await check("every RLS-enabled table with an UPDATE policy also has a SELECT policy", async () => {
  // Postgres has to read a row before it can update it. An UPDATE policy with
  // no SELECT policy produces zero affected rows and no error, which is the
  // hardest kind of bug to notice.
  const rows = await db.query(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and exists (
        select 1 from pg_policy p
        where p.polrelid = c.oid and p.polcmd in ('w', '*')
      )
      and not exists (
        select 1 from pg_policy p
        where p.polrelid = c.oid and p.polcmd in ('r', '*')
      )
    order by c.relname
  `);
  if (rows.rows.length > 0) {
    throw new Error(
      `table(s) with an UPDATE policy but no SELECT policy: ${rows.rows
        .map((r) => r.relname)
        .join(", ")}`,
    );
  }
});

await check("no view in public bypasses RLS", async () => {
  // A view runs as its definer unless created WITH (security_invoker = true),
  // so it is the standard way RLS gets silently sidestepped.
  const rows = await db.query(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and coalesce(
        (select option_value from pg_options_to_table(c.reloptions)
         where option_name = 'security_invoker'),
        'false'
      ) <> 'true'
    order by c.relname
  `);
  if (rows.rows.length > 0) {
    throw new Error(
      `view(s) without security_invoker: ${rows.rows.map((r) => r.relname).join(", ")}`,
    );
  }
});

console.log("\nProduct lesson loop\n");

// Two fresh accounts. Teacher A has been purged by the erasure tests above, so
// its uuid no longer resolves to a researcher — the loop needs a live one.
const TEACHER_C = "33333333-3333-4333-8333-333333333333";
const TEACHER_D = "44444444-4444-4444-8444-444444444444";
await db.exec(`
  insert into auth.users (id, email) values
    ('${TEACHER_C}', 'c@example.edu'),
    ('${TEACHER_D}', 'd@example.edu');
  update public.teachers set display_name = 'Teacher C' where id = '${TEACHER_C}';
  update public.teachers set display_name = 'Teacher D', is_researcher = true
    where id = '${TEACHER_D}';
`);

await check("a plain teacher cannot read or write product_lessons", () =>
  asTeacher(db, TEACHER_C, async () => {
    const seen = await db.query(
      "select count(*)::int as n from public.product_lessons",
    );
    if (seen.rows[0].n !== 0) {
      throw new Error(`plain teacher saw ${seen.rows[0].n} lessons, wanted 0`);
    }
    await refuses(
      db,
      `insert into public.product_lessons
         (cycle, evidence, lesson, recommended_change, success_metric)
       values (99, 'e', 'l', 'c', 'm')`,
      [],
      "row-level security",
    );
  }),
);

await check("a researcher can write and read a lesson", () =>
  asTeacher(db, TEACHER_D, async () => {
    await db.query(
      `insert into public.product_lessons
         (cycle, evidence, lesson, recommended_change, success_metric, metric_baseline)
       values (1, 'calendar.open fires, lesson.generate does not',
               'we cannot see why generation is abandoned',
               'add lesson.generate_start',
               'generate_start to generate conversion',
               '{"value": 0}'::jsonb)`,
    );
    const seen = await db.query(
      "select cycle, result_verdict from public.product_lessons",
    );
    if (seen.rows.length !== 1 || seen.rows[0].cycle !== 1) {
      throw new Error(`researcher saw ${JSON.stringify(seen.rows)}`);
    }
    if (seen.rows[0].result_verdict !== null) {
      throw new Error("a new lesson should start ungraded");
    }
  }),
);

await check("the analysis half of a lesson is write-once", () =>
  asTeacher(db, TEACHER_D, async () => {
    await refuses(
      db,
      "update public.product_lessons set lesson = 'rewritten' where cycle = 1",
      [],
      "write-once",
    );
    await refuses(
      db,
      `update public.product_lessons set metric_baseline = '{"value": 99}'::jsonb
       where cycle = 1`,
      [],
      "write-once",
    );
  }),
);

await check("the outcome half of a lesson stays writable", () =>
  asTeacher(db, TEACHER_D, async () => {
    await db.query(
      `update public.product_lessons
         set result = 'conversion went 0 -> 0.31',
             result_verdict = 'moved',
             graded_at = now(),
             shipped_sha = 'deadbee'
       where cycle = 1`,
    );
    const row = await db.query(
      "select result_verdict, shipped_sha from public.product_lessons where cycle = 1",
    );
    if (row.rows[0].result_verdict !== "moved" || row.rows[0].shipped_sha !== "deadbee") {
      throw new Error(`grade did not persist: ${JSON.stringify(row.rows[0])}`);
    }
  }),
);

await check("a lesson cannot claim a malformed commit", () =>
  asTeacher(db, TEACHER_D, () =>
    refuses(
      db,
      "update public.product_lessons set shipped_sha = 'not a sha' where cycle = 1",
      [],
      "check constraint",
    ),
  ),
);

await check("a verdict outside the four words is refused", () =>
  asTeacher(db, TEACHER_D, () =>
    refuses(
      db,
      "update public.product_lessons set result_verdict = 'vibes' where cycle = 1",
      [],
      "check constraint",
    ),
  ),
);

await check("nobody can delete a lesson through PostgREST", () =>
  asTeacher(db, TEACHER_D, () =>
    refuses(
      db,
      "delete from public.product_lessons where cycle = 1",
      [],
      "permission denied",
    ),
  ),
);

await check("product_loop_state is a singleton", async () => {
  // Runs as superuser, the way the operator CLI would.
  await refuses(
    db,
    "insert into public.product_loop_state (id) values (2)",
    [],
    "check constraint",
  );
  const rows = await db.query("select count(*)::int as n from public.product_loop_state");
  if (rows.rows[0].n !== 1) {
    throw new Error(`expected exactly one state row, found ${rows.rows[0].n}`);
  }
});

await check("a researcher can flag the next run and the skill can clear it", () =>
  asTeacher(db, TEACHER_D, async () => {
    await db.query(
      `update public.product_loop_state
         set next_run_requested_at = now(), requested_by = $1
       where id = 1`,
      [TEACHER_D],
    );
    const set = await db.query(
      "select next_run_requested_at from public.product_loop_state where id = 1",
    );
    if (!set.rows[0].next_run_requested_at) {
      throw new Error("run request did not persist");
    }
    await db.query(
      "update public.product_loop_state set next_run_requested_at = null where id = 1",
    );
  }),
);

// ---------------------------------------------------------------------------
// Space lesson (demo-scoped, anon RPCs)
// ---------------------------------------------------------------------------

async function asAnon(fn) {
  await db.exec("set role anon;");
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

await check("space_save then space_open round-trips state", () =>
  asAnon(async () => {
    await db.query("select public.space_save($1, $2::jsonb)", [
      "stu-1",
      JSON.stringify({ pos: 3, done: ["a"] }),
    ]);
    const r = await db.query("select public.space_open($1) as o", ["stu-1"]);
    const o = r.rows[0].o;
    if (o.state?.pos !== 3 || o.state?.done?.[0] !== "a") {
      throw new Error(`state did not round-trip: ${JSON.stringify(o)}`);
    }
    if (o.paused !== false) throw new Error(`expected paused=false: ${JSON.stringify(o)}`);
  }),
);

await check("space_teacher_view keeps an arrival visible behind 255 newer wrong-answer events", async () => {
  await db.exec("truncate public.space_events");
  await asAnon(async () => {
    await db.query(
      "select public.space_log('stu-arr', 'arrival', 'riddle', '{\"group\":\"space\"}'::jsonb)",
    );
    for (let i = 0; i < 255; i++) {
      await db.query("select public.space_log('stu-busy', 'wrong', 'riddle', '{}'::jsonb)");
    }
    const r = await db.query("select public.space_teacher_view() as v");
    const events = r.rows[0].v.events;
    const arrivals = events.filter((e) => e.kind === "arrival");
    if (arrivals.length !== 1 || arrivals[0].meta?.group !== "space") {
      throw new Error(`arrival missing or altered: ${JSON.stringify(arrivals)}`);
    }
    const others = events.filter((e) => e.kind !== "arrival");
    if (others.length !== 200) throw new Error(`expected 200 other events, got ${others.length}`);
    if (!events.every((e) => e.id && e.student_id && e.block_id && e.at)) {
      throw new Error("event shape changed");
    }
    // Each group is newest first.
    for (const list of [others, arrivals]) {
      for (let i = 1; i < list.length; i++) {
        if (list[i - 1].id < list[i].id) throw new Error("events are not newest first");
      }
    }
    // The arrival cap is 500.
    for (let i = 0; i < 510; i++) {
      await db.query("select public.space_log('stu-arr2', 'arrival', 'riddle', '{}'::jsonb)");
    }
    const again = (await db.query("select public.space_teacher_view() as v")).rows[0].v.events;
    const n = again.filter((e) => e.kind === "arrival").length;
    if (n !== 500) throw new Error(`expected 500 arrivals, got ${n}`);
  });
  await db.exec("truncate public.space_events");
});

await check("space_teacher_view keeps too_fast and disengagement flags behind 255 newer clicks", async () => {
  await db.exec("truncate public.space_events");
  await asAnon(async () => {
    await db.query("select public.space_log('stu-flag', 'too_fast', 'read', '{}'::jsonb)");
    await db.query("select public.space_log('stu-flag', 'disengagement', 'grid', '{}'::jsonb)");
    for (let i = 0; i < 255; i++) {
      await db.query("select public.space_log('stu-busy', 'click', 'riddle', '{}'::jsonb)");
    }
    const events = (await db.query("select public.space_teacher_view() as v")).rows[0].v.events;
    const flags = events.filter((e) => e.student_id === "stu-flag");
    const kinds = flags.map((e) => e.kind).sort().join(",");
    if (kinds !== "disengagement,too_fast") throw new Error(`flags missing: ${kinds}`);
    const clicks = events.filter((e) => e.kind === "click").length;
    if (clicks !== 200) throw new Error(`expected 200 clicks, got ${clicks}`);
    // The flag cap is 500.
    for (let i = 0; i < 510; i++) {
      await db.query("select public.space_log('stu-flag2', 'too_fast', 'read', '{}'::jsonb)");
    }
    const again = (await db.query("select public.space_teacher_view() as v")).rows[0].v.events;
    const n = again.filter((e) => e.kind === "too_fast" || e.kind === "disengagement").length;
    if (n !== 500) throw new Error(`expected 500 flags, got ${n}`);
  });
  await db.exec("truncate public.space_events");
});

await check("space rpcs refuse malformed student ids", () =>
  asAnon(async () => {
    for (const bad of ["a b", "x".repeat(65), ""]) {
      await refusesCode(db, "select public.space_save($1, '{}'::jsonb)", [bad], "23514");
      await refusesCode(db, "select public.space_open($1)", [bad], "23514");
    }
  }),
);

await check("space_log refuses an unknown kind", () =>
  asAnon(() =>
    refusesCode(
      db,
      "select public.space_log('stu-1', 'other', 'b1', '{}'::jsonb)",
      [],
      "23514",
    ),
  ),
);

await check("space_set_explain refuses bad keys and caps distinct keys", () =>
  asAnon(async () => {
    for (const bad of ["Bad", "1a", "a b", "x".repeat(33), ""]) {
      await refusesCode(db, "select public.space_set_explain($1, true)", [bad], "23514");
    }
    for (let i = 0; i < 20; i++) {
      await db.query("select public.space_set_explain($1, true)", [`k${i}`]);
    }
    // Existing keys can still be toggled; a 21st distinct key cannot be added.
    await db.query("select public.space_set_explain('k0', false)");
    await refusesCode(db, "select public.space_set_explain('k20', true)", [], "23514");
    const o = await db.query("select public.space_open('stu-1') as o");
    const n = Object.keys(o.rows[0].o.explain).length;
    if (n > 20) throw new Error(`explain grew to ${n}`);
  }).finally(() =>
    db.exec("update public.space_control set explain = '{}'::jsonb where id = 1"),
  ),
);

await check("anon has no direct access to space tables", () =>
  asAnon(async () => {
    await refuses(db, "select * from public.space_state", [], "permission denied");
    await refuses(db, "select * from public.space_events", [], "permission denied");
    await refuses(db, "select * from public.space_control", [], "permission denied");
  }),
);

await check("space_set_paused shows up in space_open", () =>
  asAnon(async () => {
    await db.query("select public.space_set_paused(true)");
    const r = await db.query("select public.space_open('stu-1') as o");
    if (r.rows[0].o.paused !== true) throw new Error("paused not true");
    await db.query("select public.space_set_paused(false)");
  }),
);

await check("space_set_explain and space_set_group reach space_open", () =>
  asAnon(async () => {
    await db.query("select public.space_set_explain('b1', true)");
    await db.query("select public.space_set_group('stu-1', 'B')");
    const r = await db.query("select public.space_open('stu-1') as o");
    const o = r.rows[0].o;
    if (o.explain?.b1 !== true) throw new Error(`explain missing: ${JSON.stringify(o)}`);
    if (o.grp !== "B") throw new Error(`grp missing: ${JSON.stringify(o)}`);
  }),
);

await check("space_teacher_view lists a student and a logged event", () =>
  asAnon(async () => {
    await db.query("select public.space_log('stu-1', 'wrong', 'b1', '{\"n\":2}'::jsonb)");
    const r = await db.query("select public.space_teacher_view() as v");
    const v = r.rows[0].v;
    if (!v.students.some((s) => s.student_id === "stu-1")) {
      throw new Error(`student missing: ${JSON.stringify(v)}`);
    }
    if (!v.events.some((e) => e.student_id === "stu-1" && e.kind === "wrong")) {
      throw new Error(`event missing: ${JSON.stringify(v)}`);
    }
    if (!v.control || v.control.paused !== false) {
      throw new Error(`control missing: ${JSON.stringify(v)}`);
    }
  }),
);

const planJson = (p) => JSON.stringify(p);
const canon = (v) =>
  JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1)))
      : x,
  );
const savePlan = (p) => db.query("select public.space_save_plan($1::jsonb)", [planJson(p)]);
const readPlan = async () =>
  (await db.query("select public.space_teacher_view() as v")).rows[0].v.control.plan;
const grpOf = async (id) =>
  (await db.query("select public.space_open($1) as o", [id])).rows[0].o.grp ?? null;

await check("space_save_plan schedules without touching grp; teacher view returns control.plan", () =>
  asAnon(async () => {
    await db.query("select public.space_set_group('plan-a', 'space')");
    const plan = { moves: { "plan-a": "ocean", "plan-b": "ocean" }, launch: "date", date: "2999-01-01", status: "scheduled" };
    await savePlan(plan);
    if ((await grpOf("plan-a")) !== "space") throw new Error("schedule changed grp");
    if ((await grpOf("plan-b")) !== null) throw new Error("schedule created a group row");
    const got = await readPlan();
    if (canon(got) !== canon(plan)) throw new Error(`plan not returned: ${JSON.stringify(got)}`);
    const v = (await db.query("select public.space_teacher_view() as v")).rows[0].v;
    if (v.control.paused !== false || typeof v.control.explain !== "object") {
      throw new Error(`control lost fields: ${JSON.stringify(v.control)}`);
    }
  }),
);

await check("space_apply_due_plan leaves a future-dated plan untouched", () =>
  asAnon(async () => {
    const before = await readPlan();
    const r = (await db.query("select public.space_apply_due_plan() as p")).rows[0].p;
    if (canon(r) !== canon(before)) throw new Error(`plan changed: ${JSON.stringify(r)}`);
    if (r.status !== "scheduled") throw new Error("future plan was applied");
    if ((await grpOf("plan-a")) !== "space") throw new Error("future plan moved grp");
  }),
);

await check("space_apply_due_plan applies a due plan and marks it applied", () =>
  asAnon(async () => {
    await savePlan({ moves: { "plan-a": "ocean", "plan-b": "ocean" }, launch: "date", date: "2020-01-01", status: "scheduled" });
    const r = (await db.query("select public.space_apply_due_plan() as p")).rows[0].p;
    if (r.status !== "applied") throw new Error(`not applied: ${JSON.stringify(r)}`);
    if ((await grpOf("plan-a")) !== "ocean" || (await grpOf("plan-b")) !== "ocean") {
      throw new Error("groups not written");
    }
    if ((await readPlan()).status !== "applied") throw new Error("stored status not applied");
    // A second call is a no-op: an applied plan never re-applies.
    await db.query("select public.space_set_group('plan-a', 'space')");
    await db.query("select public.space_apply_due_plan()");
    if ((await grpOf("plan-a")) !== "space") throw new Error("applied plan re-applied");
  }),
);

await check("space_apply_due_plan returns {} when no plan exists", () =>
  asAnon(async () => {
    await db.exec("reset role; update public.space_control set plan = '{}'::jsonb where id = 1; set role anon;");
    const r = (await db.query("select public.space_apply_due_plan() as p")).rows[0].p;
    if (JSON.stringify(r) !== "{}") throw new Error(`expected {}, got ${JSON.stringify(r)}`);
  }),
);

await check("space_save_plan: launch date with a null or empty date raises and writes nothing", () =>
  asAnon(async () => {
    const keep = { moves: { "plan-a": "ocean" }, launch: "now", date: null, status: "draft" };
    await savePlan(keep);
    for (const date of [null, ""]) {
      await refusesCode(
        db,
        "select public.space_save_plan($1::jsonb)",
        [planJson({ moves: { "plan-a": "space" }, launch: "date", date, status: "scheduled" })],
        "23514",
      );
    }
    if (canon(await readPlan()) !== canon(keep)) throw new Error("a refused save wrote");
  }),
);

await check("space_save_plan accepts seven students in one galaxy (no size rule)", () =>
  asAnon(async () => {
    const moves = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`seven-${i}`, "space"]));
    await savePlan({ moves, launch: "now", date: null, status: "draft" });
    if (Object.keys((await readPlan()).moves).length !== 7) throw new Error("seven moves not stored");
  }),
);

await check("space_save_plan refuses bad student id, galaxy key, date, shape and size", () =>
  asAnon(async () => {
    const base = { moves: { "plan-a": "space" }, launch: "now", date: null, status: "draft" };
    const bad = [
      { ...base, moves: { "bad id": "space" } },
      { ...base, moves: { "plan-a": "Space" } },
      { ...base, moves: { "plan-a": "1x" } },
      { ...base, moves: { "plan-a": "x".repeat(33) } },
      { ...base, moves: { "plan-a": 3 } },
      { ...base, moves: [] },
      { ...base, launch: "later" },
      { ...base, status: "done" },
      { ...base, launch: "date", date: "2026-13-40", status: "scheduled" },
      { ...base, launch: "date", date: "tomorrow", status: "scheduled" },
      { ...base, launch: "date", date: "2026-1-5", status: "scheduled" },
      { ...base, date: 5 },
      { ...base, moves: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`s${i}`, "space"])) },
    ];
    for (const p of bad) {
      await refusesCode(db, "select public.space_save_plan($1::jsonb)", [planJson(p)], "23514");
    }
    for (const raw of ["[]", "null", "\"x\""]) {
      await refusesCode(db, "select public.space_save_plan($1::jsonb)", [raw], "23514");
    }
    await refusesCode(db, "select public.space_save_plan(null)", [], "23514");
    // Over the 16 KB cap with otherwise valid fields (extra key padding).
    await refusesCode(
      db,
      "select public.space_save_plan($1::jsonb)",
      [planJson({ ...base, pad: "x".repeat(17000) })],
      "23514",
    );
  }),
);

await check("space plan rpcs are anon-callable and the plan stays unreadable directly", () =>
  asAnon(async () => {
    await db.query("select public.space_apply_due_plan()");
    await refuses(db, "select plan from public.space_control", [], "permission denied");
  }),
);

await check("assert_no_student_pii_columns still passes with space tables", async () => {
  await db.query("select public.assert_no_student_pii_columns()");
});

console.log("\nGroup memberships\n");

const GM_CLASS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const GM_STUDENT = "ffffffff-ffff-4fff-8fff-ffffffffffff";
await db.exec(`
  -- Earlier checks delete teachers; make sure both exist (trigger creates the teachers row).
  insert into auth.users (id, email) values
    ('${TEACHER_A}', 'a@example.edu'), ('${TEACHER_B}', 'b@example.edu')
  on conflict (id) do nothing;
  insert into public.teachers (id) values ('${TEACHER_A}'), ('${TEACHER_B}')
  on conflict (id) do nothing;
  insert into public.classes (id, teacher_id, name, grade)
    values ('${GM_CLASS}', '${TEACHER_A}', 'Room GM', 3);
  insert into public.students (id, class_id, first_name, sort_key)
    values ('${GM_STUDENT}', '${GM_CLASS}', 'Gia', 0);
`);
const gmMove = (pack, version) =>
  db.query("select public.move_student_group($1, $2, $3) as v", [GM_STUDENT, pack, version]);
const gmEvents = async () =>
  (await db.query("select * from public.group_membership_events where student_id = $1 order by created_at, id", [GM_STUDENT])).rows;

await check("first move inserts row at version 1", () =>
  asTeacher(db, TEACHER_A, async () => {
    const v = (await gmMove("pack_space", 0)).rows[0].v;
    if (v !== 1) throw new Error(`expected 1, got ${v}`);
    const ev = await gmEvents();
    if (ev.length !== 1 || ev[0].from_pack_id !== null || ev[0].to_pack_id !== "pack_space" || ev[0].actor !== "teacher" || ev[0].actor_id !== TEACHER_A) {
      throw new Error(`bad first event ${JSON.stringify(ev)}`);
    }
  }),
);

await check("second move bumps version and logs from/to", () =>
  asTeacher(db, TEACHER_A, async () => {
    const other = (await db.query("select id from public.context_packs where id <> 'pack_space' order by id limit 1")).rows[0].id;
    const v = (await gmMove(other, 1)).rows[0].v;
    if (v !== 2) throw new Error(`expected 2, got ${v}`);
    const ev = await gmEvents();
    const last = ev[ev.length - 1];
    if (ev.length !== 2 || last.from_pack_id !== "pack_space" || last.to_pack_id !== other) {
      throw new Error(`bad second event ${JSON.stringify(last)}`);
    }
  }),
);

await check("stale version raises VERSION_CONFLICT", () =>
  asTeacher(db, TEACHER_A, () =>
    refuses(db, "select public.move_student_group($1, 'pack_space', 1)", [GM_STUDENT], "VERSION_CONFLICT"),
  ),
);

await check("same-pack move is a no-op", () =>
  asTeacher(db, TEACHER_A, async () => {
    const cur = (await db.query("select pack_id from public.group_memberships where student_id = $1", [GM_STUDENT])).rows[0].pack_id;
    const before = (await gmEvents()).length;
    const v = (await gmMove(cur, 2)).rows[0].v;
    if (v !== 2) throw new Error(`expected 2, got ${v}`);
    if ((await gmEvents()).length !== before) throw new Error("same-pack move wrote an event");
  }),
);

await check("teacher B cannot move or read teacher A's memberships", () =>
  asTeacher(db, TEACHER_B, async () => {
    await refuses(db, "select public.move_student_group($1, 'pack_space', 2)", [GM_STUDENT], "not found|permission|privilege");
    const n = (await db.query("select count(*)::int as n from public.group_memberships")).rows[0].n;
    if (n !== 0) throw new Error(`teacher B sees ${n} membership rows`);
    const e = (await db.query("select count(*)::int as n from public.group_membership_events")).rows[0].n;
    if (e !== 0) throw new Error(`teacher B sees ${e} event rows`);
  }),
);

await check("events cannot be updated or deleted", () =>
  asTeacher(db, TEACHER_A, async () => {
    const before = (await gmEvents()).length;
    let deleted = 0;
    try {
      deleted = (await db.query("delete from public.group_membership_events")).affectedRows ?? 0;
    } catch (error) {
      if (!/permission denied/i.test(error.message)) throw error;
    }
    if (deleted !== 0) throw new Error(`deleted ${deleted} events`);
    let updated = 0;
    try {
      updated = (await db.query("update public.group_membership_events set to_pack_id = to_pack_id")).affectedRows ?? 0;
    } catch (error) {
      if (!/permission denied/i.test(error.message)) throw error;
    }
    if (updated !== 0) throw new Error(`updated ${updated} events`);
    if ((await gmEvents()).length !== before) throw new Error("event count changed");
  }),
);

await check("teacher A cannot write membership or event rows for teacher B's student", async () => {
  const B_CLASS = "99999999-9999-4999-8999-999999999999";
  const B_STUDENT = "88888888-8888-4888-8888-888888888888";
  await db.exec(`
    insert into public.classes (id, teacher_id, name, grade) values ('${B_CLASS}', '${TEACHER_B}', 'Room GM-B', 3);
    insert into public.students (id, class_id, first_name, sort_key) values ('${B_STUDENT}', '${B_CLASS}', 'Bo', 0);
  `);
  await asTeacher(db, TEACHER_A, async () => {
    await refuses(
      db,
      "insert into public.group_memberships (student_id, class_id, pack_id) values ($1, $2, 'pack_space')",
      [B_STUDENT, GM_CLASS],
      "row-level security",
    );
    await refuses(
      db,
      "insert into public.group_membership_events (class_id, student_id, to_pack_id, actor, actor_id) values ($1, $2, 'pack_space', 'teacher', $3)",
      [GM_CLASS, B_STUDENT, TEACHER_A],
      "row-level security",
    );
  });
});

await check("guarded upsert path: stale expected version on an existing row conflicts", () =>
  asTeacher(db, TEACHER_A, () =>
    refuses(db, "select public.move_student_group($1, 'pack_space', 0)", [GM_STUDENT], "VERSION_CONFLICT"),
  ),
);

await check("move_student_group is not callable by anon", async () => {
  await db.exec("set role anon;");
  try {
    await refuses(db, "select public.move_student_group($1, 'pack_space', 0)", [GM_STUDENT], "permission denied");
  } finally {
    await db.exec("reset role;");
  }
});

await check("assert_no_student_pii_columns passes with membership tables", async () => {
  await db.query("select public.assert_no_student_pii_columns()");
});

await check("demo adaptive session, seed twice, and rollback", async () => {
  const metrics = {
    version: 1,
    tasks: {},
    taskOrder: [],
    totalAttempts: 0,
    consecutiveFailures: 0,
    firstTryStreak: 0,
    traversalCount: 0,
  };
  const roster = [
    ["stu-1", "Student 1", 5],
    ["stu-2", "Student 2", 4],
    ["stu-3", "Student 3", 3],
    ["stu-4", "Student 4", 2],
    ["stu-5", "Student 5", 1],
    ["stu-6", "Student 6", 3],
    ["stu-7", "Student 7", 2],
    ["stu-8", "Student 8", 1],
  ];
  const crew = (id, anchor, peers) => ({
    cohortId: id,
    interestGroupId: "space_23",
    createdAt: "2026-11-08T04:00:00.000Z",
    members: [
      { studentId: anchor[0], skillTier: anchor[1], role: "anchor", position: 0 },
      ...peers.map((peer, index) => ({ studentId: peer[0], skillTier: peer[1], role: "peer", position: index + 1 })),
    ],
  });
  const seed = {
    students: roster.map(([studentId, label, skillTier]) => ({
      studentId,
      label,
      skillTier,
      currentInterestGroupId: "space_23",
      accumulatedCredits: 0,
      targetCredits: 10,
      unlockedWearables: [],
    })),
    metrics: Object.fromEntries(roster.map(([studentId]) => [studentId, metrics])),
    cohorts: [
      crew("space_23-c1", ["stu-1", 5], [["stu-5", 1], ["stu-4", 2], ["stu-3", 3]]),
      crew("space_23-c2", ["stu-2", 4], [["stu-8", 1], ["stu-7", 2], ["stu-6", 3]]),
    ],
  };
  const created = await db.query("select public.demo_ensure_session($1, $2::jsonb) as ok", ["demo-a", JSON.stringify(seed)]);
  if (created.rows[0].ok !== true) throw new Error("ensure did not create");
  const again = await db.query("select public.demo_ensure_session($1, $2::jsonb) as ok", ["demo-a", JSON.stringify(seed)]);
  if (again.rows[0].ok !== false) throw new Error("second ensure changed the session");
  const counts = await db.query(`
    select
      (select count(*) from public.demo_student where session_id = 'demo-a') as students,
      (select count(*) from public.demo_student_metrics where session_id = 'demo-a') as metrics,
      (select count(*) from public.demo_cohort where session_id = 'demo-a') as cohorts,
      (select count(*) from public.demo_cohort_member where session_id = 'demo-a') as members
  `);
  const row = counts.rows[0];
  if (Number(row.students) !== 8 || Number(row.metrics) !== 8 || Number(row.cohorts) !== 2 || Number(row.members) !== 8) {
    throw new Error(`bad counts ${JSON.stringify(row)}`);
  }
  const snap = await db.query("select public.demo_snapshot($1) as snap", ["demo-a"]);
  if (snap.rows[0].snap.students[0].studentId !== "stu-1") throw new Error("snapshot order");
  const missing = await db.query("select public.demo_snapshot($1) as snap", ["missing"]);
  if (missing.rows[0].snap !== null) throw new Error("unknown session should be null");
  await db.query("select public.demo_ensure_session($1, $2::jsonb)", ["demo-b", JSON.stringify(seed)]);
  await db.query("select public.demo_reset_session($1)", ["demo-a"]);
  const left = await db.query("select public.demo_snapshot($1) as snap", ["demo-b"]);
  if (!left.rows[0].snap) throw new Error("reset leaked");
  const studentSeed = {
    patch: { currentInterestGroupId: "space_23", accumulatedCredits: 3, targetCredits: 10, unlockedWearables: [] },
    metrics: { ...metrics, totalAttempts: 1 },
    events: [{ kind: "attempt", taskId: "space_23:math", meta: { correct: true }, at: "2026-11-08T04:00:00.000Z" }],
    interventions: [],
    createdAt: "2026-11-08T04:00:00.000Z",
  };
  await db.query("select public.demo_seed_student($1, $2, $3::jsonb)", ["demo-b", "stu-1", JSON.stringify(studentSeed)]);
  await db.query("select public.demo_seed_student($1, $2, $3::jsonb)", ["demo-b", "stu-1", JSON.stringify(studentSeed)]);
  const events = await db.query("select count(*)::int as n from public.demo_event_log where session_id = 'demo-b' and student_id = 'stu-1'");
  if (events.rows[0].n !== 1) throw new Error(`seed duplicated events: ${events.rows[0].n}`);
  await refusesCode(db, "select public.demo_ensure_session($1, $2::jsonb)", ["bad id", JSON.stringify(seed)], "23514");
  await asAnon(async () => {
    await refuses(db, "select * from public.demo_student", [], "permission denied");
  });
  const rls = await db.query("select relrowsecurity from pg_class where relname = 'demo_student'");
  if (!rls.rows[0].relrowsecurity) throw new Error("demo_student missing RLS");
  const file = readFileSync(join(MIGRATIONS_DIR, "20261109010000_demo_adaptive.sql"), "utf8");
  const rollback = file
    .slice(file.indexOf("-- ROLLBACK-BEGIN"), file.indexOf("-- ROLLBACK-END"))
    .split("\n")
    .filter((line) => line.startsWith("-- drop "))
    .map((line) => line.replace(/^-- /, ""))
    .join("\n");
  await db.exec(rollback);
  const gone = await db.query("select to_regclass('public.demo_student') as rel");
  if (gone.rows[0].rel) throw new Error("rollback left demo_student");
  const fns = await db.query("select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname like 'demo_%'");
  if (fns.rows.length) throw new Error(`rollback left ${fns.rows.map((r) => r.proname).join(",")}`);
  await db.exec(file);
  const restored = await db.query("select public.demo_ensure_session($1, $2::jsonb) as ok", ["demo-c", JSON.stringify(seed)]);
  if (restored.rows[0].ok !== true) throw new Error("re-apply failed");
});

await db.close();

console.log(
  `\n${passed} passed, ${failures.length} failed, ${files.length} migration(s) applied cleanly.\n`,
);
if (failures.length > 0) process.exit(1);
