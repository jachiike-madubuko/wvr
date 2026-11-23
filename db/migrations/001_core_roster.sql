-- Weaver data layer (Neon / Lakebase Postgres): Stage 01 Core Roster & PII Gate.
--
-- Invariants:
--   1. Every tenant-scoped row carries teacher_id (or class -> teacher) and org_id.
--   2. public.students carries ONLY first_name (no last_name, email, password, photo, login).
--   3. Every function in public pins search_path = ''.
--   4. App requests set transaction-local `app.teacher_id` via set_config(..., true).

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.teacher_id', true), '')::uuid
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.reject_append_only_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'append-only table % cannot be modified via %', tg_table_name, tg_op
    using errcode = 'check_violation';
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  dpa_signed_at timestamptz,
  purge_deadline_days integer not null default 60
    check (purge_deadline_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orgs_set_updated_at
  before update on public.orgs
  for each row execute function public.set_updated_at();

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs (id) on delete set null,
  display_name text
    check (display_name is null or length(btrim(display_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teachers_org_id_idx on public.teachers (org_id);

create trigger teachers_set_updated_at
  before update on public.teachers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Classes & Students (First Name Only)
-- ---------------------------------------------------------------------------

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 120),
  grade integer not null check (grade between 0 and 6),
  nav_layout text not null default 'top' check (nav_layout in ('top', 'side')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index classes_teacher_id_idx on public.classes (teacher_id);

create trigger classes_set_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  first_name text not null check (length(btrim(first_name)) between 1 and 60 and first_name !~ '@'),
  sort_key integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_class_id_idx on public.students (class_id, sort_key);

create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Curated content
-- ---------------------------------------------------------------------------

create table public.context_packs (
  id text primary key check (id ~ '^pack_[a-z0-9_]{2,40}$'),
  version integer not null default 1 check (version >= 1),
  label text not null check (length(btrim(label)) between 1 and 80),
  body jsonb not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint context_packs_body_has_generation_content check (
    jsonb_typeof(body -> 'quantities') is not distinct from 'array'
    and jsonb_array_length(body -> 'quantities') >= 3
    and jsonb_typeof(body -> 'rate_pairs') is not distinct from 'array'
    and jsonb_array_length(body -> 'rate_pairs') >= 2
  )
);

create trigger context_packs_set_updated_at
  before update on public.context_packs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- PII gate ledger
-- ---------------------------------------------------------------------------

create table public.pii_scans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  verdict text not null check (verdict in ('pass', 'block')),
  rule_id text check (rule_id is null or rule_id ~ '^[a-z0-9_.]{3,60}$'),
  scanned_text_sha256 text not null check (scanned_text_sha256 ~ '^[a-f0-9]{64}$'),
  scanner_version text not null check (scanner_version ~ '^[a-z0-9_.]{3,30}$'),
  created_at timestamptz not null default now(),
  constraint pii_scans_rule_matches_verdict check (
    (verdict = 'block' and rule_id is not null)
    or (verdict = 'pass' and rule_id is null)
  )
);

create index pii_scans_teacher_id_created_at_idx
  on public.pii_scans (teacher_id, created_at desc);
create index pii_scans_verdict_created_at_idx
  on public.pii_scans (verdict, created_at desc);

create trigger pii_scans_no_update
  before update on public.pii_scans
  for each row execute function public.reject_append_only_mutation();

-- ---------------------------------------------------------------------------
-- Lesson data
-- ---------------------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  schema_version text not null default 'recipe.v1',
  pii_scan_id uuid not null references public.pii_scans (id),
  source_text_sha256 text
    check (source_text_sha256 is null or source_text_sha256 ~ '^[a-f0-9]{64}$'),
  locked jsonb not null,
  context_layer jsonb,
  surface jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index recipes_teacher_id_created_at_idx
  on public.recipes (teacher_id, created_at desc);
create index recipes_org_id_idx on public.recipes (org_id);
create index recipes_pii_scan_id_idx on public.recipes (pii_scan_id);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create or replace function public.enforce_pii_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verdict text;
  v_teacher uuid;
begin
  select verdict, teacher_id
    into v_verdict, v_teacher
  from public.pii_scans
  where id = new.pii_scan_id;

  if v_verdict is distinct from 'pass' then
    raise exception 'pii gate: scan % has verdict %, refusing to store recipe',
      new.pii_scan_id, coalesce(v_verdict, 'missing')
      using errcode = 'check_violation';
  end if;

  if v_teacher is distinct from new.teacher_id then
    raise exception 'pii gate: scan % belongs to a different teacher',
      new.pii_scan_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_pii_gate() from public;

create trigger recipes_enforce_pii_gate
  before insert or update of pii_scan_id, teacher_id on public.recipes
  for each row execute function public.enforce_pii_gate();

create table public.variation_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  base_recipe_id uuid not null references public.recipes (id) on delete cascade,
  pack_ids text[] not null check (array_length(pack_ids, 1) between 1 and 3),
  payload jsonb not null,
  qa_status text not null default 'pending'
    check (qa_status in ('pending', 'pass', 'failed')),
  inference_cost_usd numeric(10, 6) not null default 0
    check (inference_cost_usd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index variation_sets_teacher_id_created_at_idx
  on public.variation_sets (teacher_id, created_at desc);
create index variation_sets_org_id_idx on public.variation_sets (org_id);
create index variation_sets_base_recipe_id_idx
  on public.variation_sets (base_recipe_id);

create trigger variation_sets_set_updated_at
  before update on public.variation_sets
  for each row execute function public.set_updated_at();

create or replace function public.enforce_known_pack_ids()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unknown text;
begin
  select string_agg(candidate, ', ' order by candidate)
    into v_unknown
  from unnest(new.pack_ids) as candidate
  where not exists (
    select 1 from public.context_packs p
    where p.id = candidate and p.is_published
  );

  if v_unknown is not null then
    raise exception 'unknown or unpublished context pack: %', v_unknown
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_known_pack_ids() from public;

create trigger variation_sets_enforce_known_pack_ids
  before insert or update of pack_ids on public.variation_sets
  for each row execute function public.enforce_known_pack_ids();

-- ---------------------------------------------------------------------------
-- Append-only ledgers
-- ---------------------------------------------------------------------------

create table public.events (
  id bigint generated always as identity primary key,
  teacher_id uuid,
  org_id uuid,
  name text not null check (name ~ '^[a-z_]+\.[a-z_]+$'),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index events_teacher_id_occurred_at_idx
  on public.events (teacher_id, occurred_at desc);
create index events_name_occurred_at_idx on public.events (name, occurred_at desc);
create index events_org_id_occurred_at_idx on public.events (org_id, occurred_at desc);

create trigger events_append_only_row
  before update or delete on public.events
  for each row execute function public.reject_append_only_mutation();

create trigger events_append_only_truncate
  before truncate on public.events
  for each statement execute function public.reject_append_only_mutation();

create table public.deletion_certificates (
  id uuid primary key default gen_random_uuid(),
  subject_kind text not null check (subject_kind in ('teacher', 'org')),
  subject_id uuid not null,
  requested_by uuid,
  requested_at timestamptz not null,
  completed_at timestamptz not null default now(),
  rows_deleted jsonb not null
);

create index deletion_certificates_subject_idx
  on public.deletion_certificates (subject_kind, subject_id, completed_at desc);

create trigger deletion_certificates_append_only_row
  before update or delete on public.deletion_certificates
  for each row execute function public.reject_append_only_mutation();

create trigger deletion_certificates_append_only_truncate
  before truncate on public.deletion_certificates
  for each statement execute function public.reject_append_only_mutation();

comment on table public.orgs is
  'District or school tenant. Empty until a district contract exists.';
comment on table public.students is
  'First name only. No last_name, email, password, photo, or login.';
comment on table public.pii_scans is
  'Immutable ledger of PII gate decisions. Hash and rule id only, never the matched text.';
comment on table public.events is
  'Append-only analytics ledger. No foreign keys inbound so a purge cannot be blocked by it.';
comment on table public.deletion_certificates is
  'Append-only record of completed data deletions.';
comment on column public.recipes.pii_scan_id is
  'Proof the PII gate ran and passed. Enforced by recipes_enforce_pii_gate.';
