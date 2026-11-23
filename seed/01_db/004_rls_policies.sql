-- Row Level Security, deny by default.
--
-- Postgres denies every operation on an RLS-enabled table that has no matching
-- policy, so the absence of a policy is the control. Read the gaps below as
-- deliberate: no UPDATE policy on pii_scans means verdicts are immutable, and no
-- write policy on context_packs means curated content changes only by migration.
--
-- auth.uid() is wrapped in a scalar subquery throughout. Postgres then evaluates
-- it once per statement instead of once per row, which matters as soon as a
-- teacher has a few hundred recipes.
--
-- Every policy is scoped `to authenticated`. Anonymous requests never match a
-- policy, so they are denied without evaluating the predicate.
--
-- One hole RLS cannot close: the service_role key carries BYPASSRLS. Nothing
-- here constrains it. That is why it must never appear in application code, and
-- why the append-only ledgers are additionally guarded by triggers, which do
-- run for service_role.

alter table public.orgs                  enable row level security;
alter table public.teachers              enable row level security;
alter table public.context_packs         enable row level security;
alter table public.pii_scans             enable row level security;
alter table public.recipes               enable row level security;
alter table public.variation_sets        enable row level security;
alter table public.events                enable row level security;
alter table public.deletion_certificates enable row level security;

-- ---------------------------------------------------------------------------
-- orgs: readable by members. Created and modified out of band.
-- ---------------------------------------------------------------------------

create policy orgs_select_own on public.orgs
  for select to authenticated
  using (
    exists (
      select 1 from public.teachers t
      where t.id = (select auth.uid()) and t.org_id = public.orgs.id
    )
  );

-- ---------------------------------------------------------------------------
-- teachers: a teacher sees and edits exactly one row, their own.
-- ---------------------------------------------------------------------------

create policy teachers_select_own on public.teachers
  for select to authenticated
  using (id = (select auth.uid()));

create policy teachers_insert_own on public.teachers
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy teachers_update_own on public.teachers
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- org_id is not self-assignable: claiming a district would grant that district's
-- read scope. This is a trigger rather than a WITH CHECK predicate because a
-- policy on public.teachers that subqueries public.teachers raises 42P17,
-- infinite recursion in policy.
create or replace function public.reject_org_self_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- PostgREST runs requests as the authenticated role. Migrations and trusted
  -- server jobs run as postgres or service_role and are left alone.
  if new.org_id is distinct from old.org_id and current_user = 'authenticated' then
    raise exception 'org membership is assigned out of band, not by the teacher'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger teachers_reject_org_self_assignment
  before update of org_id on public.teachers
  for each row execute function public.reject_org_self_assignment();

create policy teachers_delete_own on public.teachers
  for delete to authenticated
  using (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- context_packs: read published packs. No write policy, by design.
-- ---------------------------------------------------------------------------

create policy context_packs_select_published on public.context_packs
  for select to authenticated
  using (is_published);

-- ---------------------------------------------------------------------------
-- pii_scans: insert and read your own. No update or delete policy, so verdicts
-- are immutable from the application's side.
-- ---------------------------------------------------------------------------

create policy pii_scans_insert_own on public.pii_scans
  for insert to authenticated
  with check (teacher_id = (select auth.uid()));

create policy pii_scans_select_own on public.pii_scans
  for select to authenticated
  using (teacher_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- recipes and variation_sets: full CRUD, scoped to the owning teacher.
-- Delete is permitted so erasure requests need no privileged path.
-- ---------------------------------------------------------------------------

create policy recipes_select_own on public.recipes
  for select to authenticated
  using (teacher_id = (select auth.uid()));

create policy recipes_insert_own on public.recipes
  for insert to authenticated
  with check (teacher_id = (select auth.uid()));

create policy recipes_update_own on public.recipes
  for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy recipes_delete_own on public.recipes
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

create policy variation_sets_select_own on public.variation_sets
  for select to authenticated
  using (teacher_id = (select auth.uid()));

create policy variation_sets_insert_own on public.variation_sets
  for insert to authenticated
  with check (teacher_id = (select auth.uid()));

create policy variation_sets_update_own on public.variation_sets
  for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy variation_sets_delete_own on public.variation_sets
  for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- events: append and read your own. No update or delete policy.
-- ---------------------------------------------------------------------------

create policy events_insert_own on public.events
  for insert to authenticated
  with check (teacher_id = (select auth.uid()));

create policy events_select_own on public.events
  for select to authenticated
  using (teacher_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- deletion_certificates: read your own. Rows are written only by
-- purge_teacher_data(), which is security definer, so no insert policy exists.
-- ---------------------------------------------------------------------------

create policy deletion_certificates_select_own on public.deletion_certificates
  for select to authenticated
  using (subject_kind = 'teacher' and subject_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Table-level grants. Supabase grants broadly to anon and authenticated by
-- default; these revokes make the append-only intent explicit at the privilege
-- layer as well as the policy layer.
-- ---------------------------------------------------------------------------

revoke all on public.orgs                  from anon;
revoke all on public.teachers              from anon;
revoke all on public.context_packs         from anon;
revoke all on public.pii_scans             from anon;
revoke all on public.recipes               from anon;
revoke all on public.variation_sets        from anon;
revoke all on public.events                from anon;
revoke all on public.deletion_certificates from anon;

revoke insert, update, delete on public.orgs          from authenticated;
revoke insert, update, delete on public.context_packs  from authenticated;
revoke update, delete         on public.pii_scans      from authenticated;
revoke update, delete         on public.events         from authenticated;
revoke insert, update, delete on public.deletion_certificates from authenticated;
