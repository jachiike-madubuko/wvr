#!/usr/bin/env node
/**
 * Applies every migration in db/migrations/ to Postgres in WASM (PGlite) under
 * Neon's exact least-privilege role model (`weavr_app` + `app.teacher_id`),
 * then asserts tenant isolation, first-name-only constraints, anonymous
 * capability path security, and optimistic concurrency.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "db", "migrations");
const SEED_PATH = join(ROOT, "db", "seed.sql");

const TEACHER_A = "11111111-1111-4111-8111-111111111111";
const TEACHER_B = "22222222-2222-4222-8222-222222222222";
const ORG_A = "33333333-3333-4333-8333-333333333333";
const CLASS_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CLASS_B = "99999999-9999-4999-8999-999999999999";
const STUDENT_A = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const STUDENT_B = "88888888-8888-4888-8888-888888888888";
const UNIT_A = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const LESSON_A = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const SHA_PASS = "a".repeat(64);
const SHA_BLOCK = "b".repeat(64);

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
  await db.exec(`set role weavr_app; select set_config('app.teacher_id', '${uid}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('app.teacher_id', '', false);");
  }
}

async function asAnonApp(db, fn) {
  await db.exec("set role weavr_app; select set_config('app.teacher_id', '', false);");
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('app.teacher_id', '', false);");
  }
}

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create schema if not exists extensions;
  create extension if not exists pgcrypto with schema extensions;
  grant usage on schema extensions to public;

  create role weavr_app nologin noinherit;
  grant usage on schema public to weavr_app;
  alter default privileges in schema public
    grant select, insert, update, delete on tables to weavr_app;
  alter default privileges in schema public
    grant usage, select on sequences to weavr_app;
`);
await db.exec("set search_path to public, extensions");

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
console.log(`\nApplying ${files.length} Neon migration(s) to Postgres (WASM)\n`);
for (const file of files) {
  try {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    console.log(`  ok   ${file}`);
  } catch (error) {
    console.error(`  FAIL ${file}\n\n${error.message}\n`);
    process.exit(1);
  }
}

await db.exec(`
  insert into public.orgs (id, name) values ('${ORG_A}', 'District A');
  insert into public.teachers (id, display_name) values
    ('${TEACHER_A}', 'Teacher A'),
    ('${TEACHER_B}', 'Teacher B');
`);

// ---------------------------------------------------------------------------
console.log("\n1. Schema & First-Name-Only Invariants\n");
// ---------------------------------------------------------------------------

await check("all 6 PRD context packs are seeded with generation content", async () => {
  const rows = await db.query(`
    select id,
           jsonb_array_length(body -> 'quantities') as quantities,
           jsonb_array_length(body -> 'rate_pairs') as rate_pairs
    from public.context_packs
    where is_published
    order by id
  `);
  if (rows.rows.length !== 6) {
    throw new Error(`expected 6 published packs, found ${rows.rows.length}`);
  }
  for (const p of rows.rows) {
    if (p.quantities < 3 || p.rate_pairs < 2) {
      throw new Error(`pack ${p.id} underspecified: ${JSON.stringify(p)}`);
    }
  }
});

await check("empty context pack body is refused", () =>
  refuses(
    db,
    "insert into public.context_packs (id, label, body) values ('pack_empty_probe', 'Empty', '{}'::jsonb)",
    [],
    "context_packs_body_has_generation_content",
  ),
);

await check("assert_no_student_pii_columns passes on real schema", async () => {
  await db.query("select public.assert_no_student_pii_columns()");
});

await check("assert_no_student_pii_columns catches disallowed PII column", async () => {
  await db.exec("create table public.tmp_bad (id int, student_email text, last_name text);");
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

await check("first_name is refused on non-student tables", async () => {
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

// ---------------------------------------------------------------------------
console.log("\n2. PII Gate & Append-Only Ledgers\n");
// ---------------------------------------------------------------------------

let passScanId;
let blockScanId;
let recipeAId;

await check("recipe with passing scan succeeds; blocked, foreign, or null scan refused", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    passScanId = (
      await db.query(
        `insert into public.pii_scans (teacher_id, verdict, rule_id, scanned_text_sha256, scanner_version)
         values ($1, 'pass', null, $2, 'pii.v1') returning id`,
        [TEACHER_A, SHA_PASS],
      )
    ).rows[0].id;
    blockScanId = (
      await db.query(
        `insert into public.pii_scans (teacher_id, verdict, rule_id, scanned_text_sha256, scanner_version)
         values ($1, 'block', 'rule.email', $2, 'pii.v1') returning id`,
        [TEACHER_A, SHA_BLOCK],
      )
    ).rows[0].id;

    recipeAId = (
      await db.query(
        `insert into public.recipes (teacher_id, pii_scan_id, locked)
         values ($1, $2, '{"title":"Fractions"}'::jsonb) returning id`,
        [TEACHER_A, passScanId],
      )
    ).rows[0].id;

    await refuses(
      db,
      `insert into public.recipes (teacher_id, pii_scan_id, locked)
       values ($1, $2, '{"title":"Bad"}'::jsonb)`,
      [TEACHER_A, blockScanId],
      "verdict block",
    );

    await refuses(
      db,
      `insert into public.recipes (teacher_id, pii_scan_id, locked)
       values ($1, null, '{"title":"NoScan"}'::jsonb)`,
      [TEACHER_A],
      'verdict missing|null value in column "pii_scan_id"',
    );
  });

  await asTeacher(db, TEACHER_B, () =>
    refuses(
      db,
      `insert into public.recipes (teacher_id, pii_scan_id, locked)
       values ($1, $2, '{"title":"Stolen"}'::jsonb)`,
      [TEACHER_B, passScanId],
      "belongs to a different teacher",
    ),
  );
});

await check("pii_scans update refused as superuser; delete refused while referenced", async () => {
  await refuses(
    db,
    "update public.pii_scans set verdict = 'pass', rule_id = null where id = $1",
    [blockScanId],
    "append-only",
  );
  await refuses(
    db,
    "delete from public.pii_scans where id = $1",
    [passScanId],
    "violates foreign key constraint",
  );
});

await check("events and deletion_certificates are append-only even as superuser", async () => {
  await db.query(
    "insert into public.events (teacher_id, name, payload) values ($1, 'recipe.created', '{}'::jsonb)",
    [TEACHER_A],
  );
  await refuses(db, "update public.events set name = 'x.y'", [], "append-only");
  await refuses(db, "delete from public.events", [], "append-only");
  await refuses(db, "truncate public.events", [], "append-only");

  await db.query(
    `insert into public.deletion_certificates (subject_kind, subject_id, requested_at, rows_deleted)
     values ('teacher', $1, now(), '{"recipes":1}'::jsonb)`,
    [TEACHER_A],
  );
  await refuses(db, "update public.deletion_certificates set subject_kind = 'org'", [], "append-only");
  await refuses(db, "delete from public.deletion_certificates", [], "append-only");
  await refuses(db, "truncate public.deletion_certificates", [], "append-only");
});

await check("unknown context pack in variation_sets refused; known pack accepted", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    await refuses(
      db,
      `insert into public.variation_sets (teacher_id, base_recipe_id, pack_ids, payload)
       values ($1, $2, array['pack_nonexistent'], '{}'::jsonb)`,
      [TEACHER_A, recipeAId],
      "unknown or unpublished context pack",
    );
    await db.query(
      `insert into public.variation_sets (teacher_id, base_recipe_id, pack_ids, payload)
       values ($1, $2, array['pack_space', 'pack_cooking'], '{"ok":true}'::jsonb)`,
      [TEACHER_A, recipeAId],
    );
  });
});

// ---------------------------------------------------------------------------
console.log("\n3. Multi-Tenant RLS & Privilege Isolation (weavr_app)\n");
// ---------------------------------------------------------------------------

await check("every base table in public has RLS enabled", async () => {
  const rows = await db.query(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
    order by c.relname
  `);
  if (rows.rows.length > 0) {
    throw new Error(`tables without RLS: ${rows.rows.map((r) => r.relname).join(", ")}`);
  }
});

await check("teacher A creates class, first-name-only student, calendar, and SEL profile; email first_name refused", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    await db.query(
      "insert into public.classes (id, teacher_id, name, grade, nav_layout) values ($1, $2, 'Room 204', 2, 'top')",
      [CLASS_A, TEACHER_A],
    );
    await refuses(
      db,
      "insert into public.students (class_id, first_name) values ($1, 'kid@school.edu')",
      [CLASS_A],
      "violates check constraint",
    );
    await db.query(
      "insert into public.students (id, class_id, first_name, sort_key) values ($1, $2, 'Maya', 0)",
      [STUDENT_A, CLASS_A],
    );
    await db.query(
      `insert into public.calendar_blocks (id, class_id, teacher_id, start_date, end_date, subjects, kind, title)
       values ($1, $2, $3, '2026-09-01', '2026-09-05', array['math'], 'unit', 'Fractions')`,
      [UNIT_A, CLASS_A, TEACHER_A],
    );
    await db.query(
      `insert into public.calendar_blocks (id, class_id, teacher_id, start_date, end_date, subjects, kind, title, unit_id)
       values ($1, $2, $3, '2026-09-01', '2026-09-01', array['math'], 'lesson', 'Halves', $4)`,
      [LESSON_A, CLASS_A, TEACHER_A, UNIT_A],
    );
    await db.query(
      "insert into public.student_wheel_answers (student_id, item_id, option_id) values ($1, 'hard', 'keeps')",
      [STUDENT_A],
    );
    await db.query(
      "insert into public.student_sel_checkins (student_id, period, mood, level) values ($1, 'am', 'calm', 4)",
      [STUDENT_A],
    );
    await db.query(
      "insert into public.student_action_threads (student_id, kind, messages) values ($1, 'iv', '[]'::jsonb)",
      [STUDENT_A],
    );
  });
});

await check("unset app.teacher_id sees 0 rows across every base table in public", async () => {
  const tables = (
    await db.query(`
      select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    `)
  ).rows.map((r) => r.relname);

  await asAnonApp(db, async () => {
    for (const tbl of tables) {
      const res = await db.query(`select count(*)::int as n from public.${tbl}`);
      if (res.rows[0].n !== 0) {
        throw new Error(`unset session saw ${res.rows[0].n} row(s) in public.${tbl}`);
      }
    }
  });
});

await check("teacher B sees 0 rows across all tenant tables and cannot mutate teacher A data", async () => {
  await db.exec(`
    insert into public.classes (id, teacher_id, name, grade) values ('${CLASS_B}', '${TEACHER_B}', 'Room B', 3);
    insert into public.students (id, class_id, first_name, sort_key) values ('${STUDENT_B}', '${CLASS_B}', 'Bo', 0);
  `);

  await asTeacher(db, TEACHER_B, async () => {
    const tenantQueries = [
      ["classes", `select id from public.classes where id = '${CLASS_A}'`],
      ["students", `select id from public.students where id = '${STUDENT_A}'`],
      ["recipes", "select id from public.recipes"],
      ["variation_sets", "select id from public.variation_sets"],
      ["calendar_blocks", "select id from public.calendar_blocks"],
      ["student_path_tokens", "select id from public.student_path_tokens"],
      ["student_path_sessions", "select id from public.student_path_sessions"],
      ["block_events", "select id from public.block_events"],
      ["student_wheel_answers", "select id from public.student_wheel_answers"],
      ["student_sel_checkins", "select id from public.student_sel_checkins"],
      ["student_action_threads", "select id from public.student_action_threads"],
    ];
    for (const [label, q] of tenantQueries) {
      const res = await db.query(q);
      if (res.rows.length !== 0) {
        throw new Error(`teacher B saw ${res.rows.length} row(s) in ${label}`);
      }
    }

    await refuses(
      db,
      "insert into public.students (class_id, first_name) values ($1, 'Intruder')",
      [CLASS_A],
      "row-level security",
    );
    await refuses(
      db,
      `insert into public.variation_sets (teacher_id, base_recipe_id, pack_ids, payload)
       values ($1, $2, array['pack_space'], '{}'::jsonb)`,
      [TEACHER_B, recipeAId],
      "row-level security",
    );
    await refuses(
      db,
      `insert into public.calendar_blocks (class_id, teacher_id, start_date, end_date, subjects, kind, title)
       values ($1, $2, '2026-09-01', '2026-09-01', array['math'], 'lesson', 'Hijack')`,
      [CLASS_A, TEACHER_B],
      "row-level security|must belong to teacher_id",
    );
    await refuses(
      db,
      "insert into public.student_wheel_answers (student_id, item_id, option_id) values ($1, 'partner', 'solo')",
      [STUDENT_A],
      "row-level security",
    );
    await refuses(
      db,
      "insert into public.student_sel_checkins (student_id, period, mood, level) values ($1, 'pm', 'tired', 2)",
      [STUDENT_A],
      "row-level security",
    );
    await refuses(
      db,
      "insert into public.student_action_threads (student_id, kind, messages) values ($1, 'sel', '[]'::jsonb)",
      [STUDENT_A],
      "row-level security",
    );
  });
});

await check("teacher cannot self-assign org_id on insert or update", () =>
  asTeacher(db, TEACHER_A, async () => {
    await refuses(
      db,
      "update public.teachers set org_id = $1 where id = $2",
      [ORG_A, TEACHER_A],
      "org membership is assigned out of band",
    );
    const NEW_T = "44444444-4444-4444-8444-444444444444";
    await refuses(
      db,
      "insert into public.teachers (id, org_id) values ($1, $2)",
      [NEW_T, ORG_A],
      "org membership is assigned out of band|row-level security",
    );
  }),
);

await check("calendar hierarchy prevents unit parent, self parent, and cross-class nesting", () =>
  asTeacher(db, TEACHER_A, async () => {
    await refuses(
      db,
      `insert into public.calendar_blocks (class_id, teacher_id, start_date, end_date, subjects, kind, unit_id)
       values ($1, $2, '2026-09-01', '2026-09-02', array['math'], 'unit', $3)`,
      [CLASS_A, TEACHER_A, UNIT_A],
      "calendar_blocks_unit_kind_no_parent",
    );
    await refuses(
      db,
      "update public.calendar_blocks set unit_id = id where id = $1",
      [LESSON_A],
      "calendar_blocks_no_self_parent|unit_id must reference a unit",
    );
  }),
);

// ---------------------------------------------------------------------------
console.log("\n4. Anonymous Capability Paths & Telemetry (/s/[token])\n");
// ---------------------------------------------------------------------------

await check("malformed token_hash is refused", () =>
  asTeacher(db, TEACHER_A, () =>
    refuses(
      db,
      `insert into public.student_path_tokens (token_hash, calendar_block_id, variation_id, payload, expires_at)
       values ('not-a-sha256', $1, 'v1', '{}'::jsonb, now() + interval '1 day')`,
      [LESSON_A],
      "violates check constraint",
    ),
  ),
);

await check("anon capability path opens unexpired token, strips unknown keys, and caps blockMs", async () => {
  const hash = (await db.query("select encode(digest('tok-live', 'sha256'), 'hex') as h")).rows[0].h;
  const expiredHash = (await db.query("select encode(digest('tok-expired', 'sha256'), 'hex') as h")).rows[0].h;

  await asTeacher(db, TEACHER_A, async () => {
    await db.query(
      `insert into public.student_path_tokens (token_hash, calendar_block_id, variation_id, payload, expires_at)
       values ($1, $2, 'var_space', '{"blocks":[{"id":"hook"}]}'::jsonb, now() + interval '2 days')`,
      [hash, LESSON_A],
    );
    await db.query(
      `insert into public.student_path_tokens (token_hash, calendar_block_id, variation_id, payload, expires_at)
       values ($1, $2, 'var_old', '{"blocks":[]}'::jsonb, now() - interval '1 minute')`,
      [expiredHash, LESSON_A],
    );
  });

  await asAnonApp(db, async () => {
    const opened = (await db.query("select public.open_student_path($1) as p", [hash])).rows[0].p;
    if (!opened || opened.variationId !== "var_space") {
      throw new Error(`expected var_space, got ${JSON.stringify(opened)}`);
    }
    const expired = (await db.query("select public.open_student_path($1) as p", [expiredHash])).rows[0].p;
    if (expired !== null) {
      throw new Error(`expired token must return null, got ${JSON.stringify(expired)}`);
    }

    const roster = (await db.query("select public.open_student_path_roster($1) as r", [hash])).rows[0].r;
    if (!Array.isArray(roster) || roster.length !== 1 || roster[0].firstName !== "Maya" || Object.keys(roster[0]).length !== 2) {
      throw new Error(`unexpected roster shape: ${JSON.stringify(roster)}`);
    }

    await db.query("select public.save_student_path_progress($1, $2::jsonb)", [
      hash,
      JSON.stringify({ completedBlockIds: ["hook"], blockMs: { hook: 99_999_999 }, evil: true }),
    ]);
    const saved = (
      await db.query("select public.save_student_path_progress($1, $2::jsonb) as p", [
        hash,
        JSON.stringify({ completedBlockIds: ["hook"], blockMs: { hook: 500 } }),
      ])
    ).rows[0].p;

    if (saved.evil !== undefined || saved.blockMs?.hook !== 14_400_500) {
      throw new Error(`unexpected progress merge: ${JSON.stringify(saved)}`);
    }

    await db.query("select public.save_student_path_session($1, $2, $3::jsonb)", [
      hash,
      STUDENT_A,
      JSON.stringify({
        completedBlockIds: ["hook"],
        blockMs: { hook: 1000 },
        blockEvents: [
          { blockId: "hook", subject: "hook", attempts: 1, durationSec: 120, errorLog: [] },
          { blockId: "math_1", subject: "math", attempts: 4, durationSec: 210, errorLog: ["wrong numerator"] },
        ],
      }),
    ]);

    await refuses(
      db,
      "select public.save_student_path_session($1, $2, $3::jsonb)",
      [hash, STUDENT_B, JSON.stringify({ completedBlockIds: [], blockMs: { hook: 1 } })],
      "student not on this class",
    );
  });

  const events = await asTeacher(db, TEACHER_A, () =>
    db.query("select block_id, status, attempts, duration_sec from public.block_events where student_id = $1 order by block_id", [STUDENT_A]),
  );
  const byId = Object.fromEntries(events.rows.map((r) => [r.block_id, r]));
  if (byId.hook?.status !== "completed" || byId.math_1?.status !== "struggling") {
    throw new Error(`unexpected block_events: ${JSON.stringify(events.rows)}`);
  }
});

// ---------------------------------------------------------------------------
console.log("\n5. Optimistic Concurrency (move_student_group)\n");
// ---------------------------------------------------------------------------

const gmMove = (pack, version) =>
  db.query("select public.move_student_group($1, $2, $3) as v", [STUDENT_A, pack, version]);
const gmEvents = async () =>
  (await db.query("select * from public.group_membership_events where student_id = $1 order by created_at, id", [STUDENT_A])).rows;

await check("first move inserts row at version 1", () =>
  asTeacher(db, TEACHER_A, async () => {
    const v = (await gmMove("pack_space", 0)).rows[0].v;
    if (v !== 1) throw new Error(`expected 1, got ${v}`);
    const ev = await gmEvents();
    if (ev.length !== 1 || ev[0].from_pack_id !== null || ev[0].to_pack_id !== "pack_space") {
      throw new Error(`bad first event: ${JSON.stringify(ev)}`);
    }
  }),
);

await check("second move bumps version to 2 and logs from/to", () =>
  asTeacher(db, TEACHER_A, async () => {
    const v = (await gmMove("pack_cooking", 1)).rows[0].v;
    if (v !== 2) throw new Error(`expected 2, got ${v}`);
    const ev = await gmEvents();
    const last = ev[ev.length - 1];
    if (ev.length !== 2 || last.from_pack_id !== "pack_space" || last.to_pack_id !== "pack_cooking") {
      throw new Error(`bad second event: ${JSON.stringify(last)}`);
    }
  }),
);

await check("stale version raises VERSION_CONFLICT (SQLSTATE 40001)", () =>
  asTeacher(db, TEACHER_A, async () => {
    await refusesCode(db, "select public.move_student_group($1, 'pack_space', 1)", [STUDENT_A], "40001");
    await refusesCode(db, "select public.move_student_group($1, 'pack_space', 0)", [STUDENT_A], "40001");
  }),
);

await check("same-pack move is a no-op", () =>
  asTeacher(db, TEACHER_A, async () => {
    const before = (await gmEvents()).length;
    const v = (await gmMove("pack_cooking", 2)).rows[0].v;
    if (v !== 2) throw new Error(`expected 2, got ${v}`);
    if ((await gmEvents()).length !== before) throw new Error("same-pack move wrote an event");
  }),
);

await check("teacher B cannot move or read teacher A memberships; unset session refused", async () => {
  await asTeacher(db, TEACHER_B, async () => {
    await refuses(db, "select public.move_student_group($1, 'pack_space', 2)", [STUDENT_A], "not found|privilege");
    const m = (await db.query("select count(*)::int as n from public.group_memberships")).rows[0].n;
    const e = (await db.query("select count(*)::int as n from public.group_membership_events")).rows[0].n;
    if (m !== 0 || e !== 0) throw new Error(`teacher B saw memberships=${m}, events=${e}`);
  });
  await asAnonApp(db, () =>
    refuses(db, "select public.move_student_group($1, 'pack_space', 2)", [STUDENT_A], "teacher session required"),
  );
});

await check("group_membership_events cannot be updated or deleted by weavr_app", () =>
  asTeacher(db, TEACHER_A, async () => {
    const before = (await gmEvents()).length;
    const updRes = await db.query("update public.group_membership_events set to_pack_id = 'pack_space'");
    if ((updRes.affectedRows ?? 0) !== 0) {
      throw new Error(`weavr_app updated ${updRes.affectedRows} group_membership_events row(s)`);
    }
    const delRes = await db.query("delete from public.group_membership_events");
    if ((delRes.affectedRows ?? 0) !== 0) {
      throw new Error(`weavr_app deleted ${delRes.affectedRows} group_membership_events row(s)`);
    }
    if ((await gmEvents()).length !== before) {
      throw new Error("group_membership_events count changed");
    }
  }),
);

// ---------------------------------------------------------------------------
console.log("\n5b. Student Collectibles RLS & Capability RPCs\n");
// ---------------------------------------------------------------------------

await check("student_collectibles enforces Teacher A/B RLS isolation and denies anon table access", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    await db.query(
      `insert into public.student_collectibles (student_id, item_id, slot, equipped, milestone_id, recall_note)
       values ($1, 'space_helmet', 'hat', true, 'm1_first_block', 'First launch!')`,
      [STUDENT_A],
    );
    const rows = (await db.query("select item_id, equipped from public.student_collectibles where student_id = $1", [STUDENT_A])).rows;
    if (rows.length !== 1 || rows[0].item_id !== "space_helmet" || rows[0].equipped !== true) {
      throw new Error(`teacher A could not read own student collectible: ${JSON.stringify(rows)}`);
    }
  });

  await asTeacher(db, TEACHER_B, async () => {
    const rows = (await db.query("select count(*)::int as n from public.student_collectibles where student_id = $1", [STUDENT_A])).rows[0].n;
    if (rows !== 0) {
      throw new Error(`teacher B saw ${rows} student_collectibles rows belonging to teacher A`);
    }
    await refuses(
      db,
      `insert into public.student_collectibles (student_id, item_id, slot, equipped, milestone_id)
       values ($1, 'space_visor', 'eyewear', false, 'm2_practice_block')`,
      [STUDENT_A],
      "row-level security",
    );
  });

  await asAnonApp(db, async () => {
    const rows = (await db.query("select count(*)::int as n from public.student_collectibles")).rows[0].n;
    if (rows !== 0) {
      throw new Error(`anon saw ${rows} student_collectibles rows`);
    }
    await refuses(
      db,
      `insert into public.student_collectibles (student_id, item_id, slot, equipped, milestone_id)
       values ($1, 'space_visor', 'eyewear', false, 'm2_practice_block')`,
      [STUDENT_A],
      "row-level security",
    );
  });
});

await check("anon collectible RPCs support get/unlock/equip/swap/unequip and reject invalid/cross-class/locked", async () => {
  const hash = (await db.query("select encode(digest('tok-live', 'sha256'), 'hex') as h")).rows[0].h;
  const expiredHash = (await db.query("select encode(digest('tok-expired', 'sha256'), 'hex') as h")).rows[0].h;

  await asAnonApp(db, async () => {
    const invalidGet = (await db.query("select public.get_student_collectibles('bad-hash', null) as r")).rows[0].r;
    const expiredGet = (await db.query("select public.get_student_collectibles($1, null) as r", [expiredHash])).rows[0].r;
    if (invalidGet !== null || expiredGet !== null) {
      throw new Error(`invalid/expired get_student_collectibles must return null, got ${JSON.stringify({ invalidGet, expiredGet })}`);
    }

    const expiredSave = (
      await db.query("select public.save_student_collectible($1, $2, 'unlock', 'space_cape_hat', 'hat', 'm4_pace_150', 'Note') as r", [
        expiredHash,
        STUDENT_A,
      ])
    ).rows[0].r;
    if (expiredSave !== null) {
      throw new Error(`expired save_student_collectible must return null, got ${JSON.stringify(expiredSave)}`);
    }

    const allBefore = (await db.query("select public.get_student_collectibles($1, null) as r", [hash])).rows[0].r;
    if (!allBefore?.[STUDENT_A] || allBefore[STUDENT_A].items?.length !== 1) {
      throw new Error(`unexpected class collectibles map: ${JSON.stringify(allBefore)}`);
    }

    const oneBefore = (await db.query("select public.get_student_collectibles($1, $2) as r", [hash, STUDENT_A])).rows[0].r;
    if (oneBefore?.items?.[0]?.itemId !== "space_helmet" || oneBefore?.items?.[0]?.equipped !== true) {
      throw new Error(`unexpected single-student collectibles: ${JSON.stringify(oneBefore)}`);
    }

    // Unlock a second hat (equipped=false)
    const afterUnlock = (
      await db.query(
        "select public.save_student_collectible($1, $2, 'unlock', 'space_crown', 'hat', 'm4_pace_150', 'Reached 150 credits') as r",
        [hash, STUDENT_A],
      )
    ).rows[0].r;
    const crown = afterUnlock.find((i) => i.itemId === "space_crown");
    if (!crown || crown.equipped !== false) {
      throw new Error(`expected unlocked space_crown with equipped=false, got ${JSON.stringify(afterUnlock)}`);
    }

    // Equip space_crown -> swaps off space_helmet in same slot
    const afterEquip = (
      await db.query("select public.save_student_collectible($1, $2, 'equip', 'space_crown', 'hat') as r", [
        hash,
        STUDENT_A,
      ])
    ).rows[0].r;
    const helmetAfterSwap = afterEquip.find((i) => i.itemId === "space_helmet");
    const crownAfterSwap = afterEquip.find((i) => i.itemId === "space_crown");
    if (helmetAfterSwap?.equipped !== false || crownAfterSwap?.equipped !== true) {
      throw new Error(`expected slot swap on equip, got ${JSON.stringify(afterEquip)}`);
    }

    // Unequip space_crown
    const afterUnequip = (
      await db.query("select public.save_student_collectible($1, $2, 'unequip', 'space_crown', 'hat') as r", [
        hash,
        STUDENT_A,
      ])
    ).rows[0].r;
    if (afterUnequip.some((i) => i.equipped)) {
      throw new Error(`expected no equipped hats after unequip, got ${JSON.stringify(afterUnequip)}`);
    }

    // Equipping a locked item is refused
    await refuses(
      db,
      "select public.save_student_collectible($1, $2, 'equip', 'never_unlocked_pet', 'pet')",
      [hash, STUDENT_A],
      "collectible not unlocked",
    );

    // Cross-class student is refused
    await refuses(
      db,
      "select public.save_student_collectible($1, $2, 'unlock', 'space_helmet', 'hat', 'm1_first_block', '')",
      [hash, STUDENT_B],
      "student not on this class",
    );
  });
});

// ---------------------------------------------------------------------------
console.log("\n6. Postgres / Neon Security Advisor Equivalents & Demo Seed\n");
// ---------------------------------------------------------------------------

const RPC_ALLOWLIST = new Set([
  "open_student_path",
  "open_student_path_roster",
  "save_student_path_progress",
  "save_student_path_session",
  "get_student_collectibles",
  "save_student_collectible",
]);

await check("no unlisted security definer function is executable by weavr_app", async () => {
  const rows = await db.query(`
    select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('weavr_app', p.oid, 'execute')
    order by p.proname
  `);
  const offenders = rows.rows.filter((r) => !RPC_ALLOWLIST.has(r.proname));
  if (offenders.length > 0) {
    throw new Error(`unlisted security definer RPCs: ${offenders.map((o) => o.proname).join(", ")}`);
  }
});

await check("every function in public pins its search_path", async () => {
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
    throw new Error(`mutable search_path: ${rows.rows.map((r) => r.proname).join(", ")}`);
  }
});

await check("every RLS-enabled table with an UPDATE policy also has a SELECT policy", async () => {
  const rows = await db.query(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polcmd in ('w', '*'))
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polcmd in ('r', '*'))
    order by c.relname
  `);
  if (rows.rows.length > 0) {
    throw new Error(`UPDATE without SELECT policy: ${rows.rows.map((r) => r.relname).join(", ")}`);
  }
});

await check("no view in public bypasses RLS", async () => {
  const rows = await db.query(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and coalesce(
        (select option_value from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'),
        'false'
      ) <> 'true'
    order by c.relname
  `);
  if (rows.rows.length > 0) {
    throw new Error(`views without security_invoker: ${rows.rows.map((r) => r.relname).join(", ")}`);
  }
});

await check("demo_profile constraint and is_demo safe purge preserve non-demo students", async () => {
  await asTeacher(db, TEACHER_A, async () => {
    await refuses(
      db,
      "update public.classes set demo_profile = 'invalid_mode' where id = $1",
      [CLASS_A],
      "violates check constraint",
    );
    await db.query(
      "update public.classes set demo_profile = 'interactive_onboarding' where id = $1",
      [CLASS_A],
    );
    const demoStu = (
      await db.query(
        "insert into public.students (class_id, first_name, sort_key, is_demo) values ($1, 'Nebula', 99, true) returning id, is_demo",
        [CLASS_A],
      )
    ).rows[0];
    if (!demoStu.is_demo) throw new Error("expected is_demo=true on demo student");
    await db.query("delete from public.students where class_id = $1 and is_demo = true", [CLASS_A]);
    const remaining = (
      await db.query("select id, is_demo from public.students where class_id = $1", [CLASS_A])
    ).rows;
    if (remaining.length !== 1 || remaining[0].id !== STUDENT_A || remaining[0].is_demo !== false) {
      throw new Error(`safe purge corrupted real student: ${JSON.stringify(remaining)}`);
    }
  });
});

await check("db/seed.sql applies cleanly and passes assert_no_student_pii_columns()", async () => {
  await db.exec(readFileSync(SEED_PATH, "utf8"));
  await db.query("select public.assert_no_student_pii_columns()");
});

console.log(`\nSummary: ${passed} passed, ${failures.length} failed\n`);
if (failures.length > 0) {
  process.exit(1);
}
