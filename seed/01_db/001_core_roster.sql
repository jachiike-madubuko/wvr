-- Weaver data layer.
--
-- Three constraints drove this shape:
--   1. Every tenant-scoped row carries teacher_id and org_id from the first row,
--      so the district tenant key never needs a backfill against data that has
--      no source of truth.
--   2. No column may hold student personal data. Being out of FERPA/COPPA scope
--      is cheaper to defend than being compliant inside it.
--   3. Lesson source text is stored as a hash. The paste itself lives only in
--      the recipe fields a teacher can see and delete.

-- gen_random_uuid() is in core since Postgres 13, so pgcrypto is not required.

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

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------

-- Empty until a district buys. The table and the org_id columns below exist now
-- because adding a tenant key to populated tables later is a migration with no
-- correct answer.
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  dpa_signed_at timestamptz,
  -- Contract-termination purge clock. 60 days matches the bar districts already
  -- accept from incumbents, so procurement has a number to check against.
  purge_deadline_days integer not null default 60
    check (purge_deadline_days between 1 and 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orgs_set_updated_at
  before update on public.orgs
  for each row execute function public.set_updated_at();

create table public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  -- The teacher's own name. Email stays in auth.users and is deliberately not
  -- duplicated here, so the public schema holds one identifier instead of two.
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
-- Curated content
-- ---------------------------------------------------------------------------

-- Global, not tenant-scoped. Writable only through migrations.
create table public.context_packs (
  id text primary key check (id ~ '^pack_[a-z0-9_]{2,40}$'),
  version integer not null default 1 check (version >= 1),
  label text not null check (length(btrim(label)) between 1 and 80),
  body jsonb not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger context_packs_set_updated_at
  before update on public.context_packs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- PII gate ledger
-- ---------------------------------------------------------------------------

-- Every scan, pass or block. Stores the verdict and a hash, never the text that
-- triggered it. Blocks are the metric worth watching: a rising block rate means
-- teachers are trying to paste rosters and the product needs to answer that.
create table public.pii_scans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  verdict text not null check (verdict in ('pass', 'block')),
  -- Stable rule identifier, safe to log and aggregate. Never the matched span.
  rule_id text check (rule_id is null or rule_id ~ '^[a-z0-9_.]{3,60}$'),
  scanned_text_sha256 text not null check (scanned_text_sha256 ~ '^[a-f0-9]{64}$'),
  scanner_version text not null check (scanner_version ~ '^[a-z0-9_.]{3,30}$'),
  created_at timestamptz not null default now(),
  -- A block must say which rule fired; a pass has no rule.
  constraint pii_scans_rule_matches_verdict check (
    (verdict = 'block' and rule_id is not null)
    or (verdict = 'pass' and rule_id is null)
  )
);

create index pii_scans_teacher_id_created_at_idx
  on public.pii_scans (teacher_id, created_at desc);
create index pii_scans_verdict_created_at_idx
  on public.pii_scans (verdict, created_at desc);

-- ---------------------------------------------------------------------------
-- Lesson data
-- ---------------------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  schema_version text not null default 'recipe.v1',
  -- Gate proof. A recipe cannot exist without a scan row, and a trigger below
  -- rejects any scan whose verdict is not 'pass'. The invariant is a constraint,
  -- not a code path someone can forget to call.
  --
  -- No ON DELETE clause on purpose: the default NO ACTION defers the check to
  -- the end of the statement, so a teacher delete can cascade into recipes and
  -- pii_scans in the same statement. ON DELETE RESTRICT would abort that.
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

-- The second half of the two-layer invariant. Layer one is the server-side gate
-- in the route handler; this is the layer that holds even if the route is wrong.
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

  -- Stops a teacher from borrowing someone else's passing scan as cover.
  if v_teacher is distinct from new.teacher_id then
    raise exception 'pii gate: scan % belongs to a different teacher',
      new.pii_scan_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger recipes_enforce_pii_gate
  before insert or update of pii_scan_id, teacher_id on public.recipes
  for each row execute function public.enforce_pii_gate();

create table public.variation_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  base_recipe_id uuid not null references public.recipes (id) on delete cascade,
  -- Referential integrity for the array is enforced by a trigger below. Postgres
  -- does not allow a subquery inside a CHECK constraint, and there is no array
  -- foreign key.
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

create trigger variation_sets_enforce_known_pack_ids
  before insert or update of pack_ids on public.variation_sets
  for each row execute function public.enforce_known_pack_ids();

-- ---------------------------------------------------------------------------
-- Append-only ledgers
-- ---------------------------------------------------------------------------

-- teacher_id and org_id are bare uuids with no foreign key, for two reasons:
--   1. A cascade from teachers would try to delete event rows, the append-only
--      trigger would refuse, and the teacher delete would fail outright.
--   2. After a purge the teacher row is gone, so the uuid no longer resolves to
--      a person. Breaking the join is what makes retained events de-identified.
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

-- Written by purge_teacher_data(). This is the artifact a district asks for when
-- a contract ends: proof of what was deleted and when.
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

comment on table public.orgs is
  'District or school tenant. Empty until a district contract exists.';
comment on table public.pii_scans is
  'Immutable ledger of PII gate decisions. Hash and rule id only, never the matched text.';
comment on table public.events is
  'Append-only analytics ledger. No foreign keys inbound so a purge cannot be blocked by it.';
comment on table public.deletion_certificates is
  'Append-only record of completed data deletions.';
comment on column public.recipes.pii_scan_id is
  'Proof the PII gate ran and passed. Enforced by recipes_enforce_pii_gate.';
