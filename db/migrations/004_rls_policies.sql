-- Row Level Security, deny by default when app.teacher_id is unset,
-- and schema PII invariant guard.

alter table public.orgs                  enable row level security;
alter table public.teachers              enable row level security;
alter table public.classes               enable row level security;
alter table public.students              enable row level security;
alter table public.context_packs         enable row level security;
alter table public.pii_scans             enable row level security;
alter table public.recipes               enable row level security;
alter table public.variation_sets        enable row level security;
alter table public.events                enable row level security;
alter table public.deletion_certificates enable row level security;
alter table public.calendar_blocks       enable row level security;
alter table public.student_path_tokens   enable row level security;
alter table public.student_path_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- orgs: readable by members. Created and modified out of band.
-- ---------------------------------------------------------------------------

create policy orgs_select_own on public.orgs
  for select to public
  using (
    exists (
      select 1 from public.teachers t
      where t.id = (select public.current_teacher_id())
        and t.org_id = public.orgs.id
    )
  );

-- ---------------------------------------------------------------------------
-- teachers: a teacher sees and edits their own row.
-- ---------------------------------------------------------------------------

create policy teachers_select_own on public.teachers
  for select to public
  using (id = (select public.current_teacher_id()));

create policy teachers_insert_own on public.teachers
  for insert to public
  with check (id = (select public.current_teacher_id()));

create policy teachers_update_own on public.teachers
  for update to public
  using (id = (select public.current_teacher_id()))
  with check (id = (select public.current_teacher_id()));

create policy teachers_delete_own on public.teachers
  for delete to public
  using (id = (select public.current_teacher_id()));

create or replace function public.reject_org_self_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if nullif(current_setting('app.teacher_id', true), '') is not null and (
    (tg_op = 'INSERT' and new.org_id is not null)
    or (tg_op = 'UPDATE' and new.org_id is distinct from old.org_id)
  ) then
    raise exception 'org membership is assigned out of band, not by the teacher'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger teachers_reject_org_self_assignment
  before insert or update of org_id on public.teachers
  for each row execute function public.reject_org_self_assignment();

-- ---------------------------------------------------------------------------
-- classes & students: scoped to owning teacher.
-- ---------------------------------------------------------------------------

create policy classes_all_own on public.classes
  for all to public
  using (teacher_id = (select public.current_teacher_id()))
  with check (teacher_id = (select public.current_teacher_id()));

create policy students_all_own on public.students
  for all to public
  using (
    exists (
      select 1 from public.classes c
      where c.id = students.class_id
        and c.teacher_id = (select public.current_teacher_id())
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = students.class_id
        and c.teacher_id = (select public.current_teacher_id())
    )
  );

-- ---------------------------------------------------------------------------
-- context_packs: read published packs when teacher session is active.
-- ---------------------------------------------------------------------------

create policy context_packs_select_published on public.context_packs
  for select to public
  using (is_published and (select public.current_teacher_id()) is not null);

-- ---------------------------------------------------------------------------
-- pii_scans: insert and read your own. Immutable verdicts.
-- ---------------------------------------------------------------------------

create policy pii_scans_insert_own on public.pii_scans
  for insert to public
  with check (teacher_id = (select public.current_teacher_id()));

create policy pii_scans_select_own on public.pii_scans
  for select to public
  using (teacher_id = (select public.current_teacher_id()));

-- ---------------------------------------------------------------------------
-- recipes and variation_sets: full CRUD, scoped to owning teacher.
-- ---------------------------------------------------------------------------

create policy recipes_select_own on public.recipes
  for select to public
  using (teacher_id = (select public.current_teacher_id()));

create policy recipes_insert_own on public.recipes
  for insert to public
  with check (teacher_id = (select public.current_teacher_id()));

create policy recipes_update_own on public.recipes
  for update to public
  using (teacher_id = (select public.current_teacher_id()))
  with check (teacher_id = (select public.current_teacher_id()));

create policy recipes_delete_own on public.recipes
  for delete to public
  using (teacher_id = (select public.current_teacher_id()));

create policy variation_sets_select_own on public.variation_sets
  for select to public
  using (teacher_id = (select public.current_teacher_id()));

create policy variation_sets_insert_own on public.variation_sets
  for insert to public
  with check (
    teacher_id = (select public.current_teacher_id())
    and exists (
      select 1 from public.recipes r
      where r.id = variation_sets.base_recipe_id
        and r.teacher_id = (select public.current_teacher_id())
    )
  );

create policy variation_sets_update_own on public.variation_sets
  for update to public
  using (teacher_id = (select public.current_teacher_id()))
  with check (
    teacher_id = (select public.current_teacher_id())
    and exists (
      select 1 from public.recipes r
      where r.id = variation_sets.base_recipe_id
        and r.teacher_id = (select public.current_teacher_id())
    )
  );

create policy variation_sets_delete_own on public.variation_sets
  for delete to public
  using (teacher_id = (select public.current_teacher_id()));

-- ---------------------------------------------------------------------------
-- calendar_blocks, student_path_tokens, student_path_sessions
-- ---------------------------------------------------------------------------

create policy calendar_blocks_all_own on public.calendar_blocks
  for all to public
  using (
    teacher_id = (select public.current_teacher_id())
    and exists (
      select 1 from public.classes c
      where c.id = calendar_blocks.class_id
        and c.teacher_id = (select public.current_teacher_id())
    )
  )
  with check (
    teacher_id = (select public.current_teacher_id())
    and exists (
      select 1 from public.classes c
      where c.id = calendar_blocks.class_id
        and c.teacher_id = (select public.current_teacher_id())
    )
  );

create policy student_path_tokens_all_own on public.student_path_tokens
  for all to public
  using (
    exists (
      select 1 from public.calendar_blocks b
      where b.id = student_path_tokens.calendar_block_id
        and b.teacher_id = (select public.current_teacher_id())
    )
  )
  with check (
    exists (
      select 1 from public.calendar_blocks b
      where b.id = student_path_tokens.calendar_block_id
        and b.teacher_id = (select public.current_teacher_id())
    )
  );

create policy student_path_sessions_select_own on public.student_path_sessions
  for select to public
  using (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_path_sessions.student_id
        and c.teacher_id = (select public.current_teacher_id())
    )
  );

-- ---------------------------------------------------------------------------
-- events & deletion_certificates
-- ---------------------------------------------------------------------------

create policy events_insert_own on public.events
  for insert to public
  with check (teacher_id = (select public.current_teacher_id()));

create policy events_select_own on public.events
  for select to public
  using (teacher_id = (select public.current_teacher_id()));

create policy deletion_certificates_select_own on public.deletion_certificates
  for select to public
  using (subject_kind = 'teacher' and subject_id = (select public.current_teacher_id()));

-- ---------------------------------------------------------------------------
-- Schema-level student PII invariant check
-- ---------------------------------------------------------------------------

create or replace function public.assert_no_student_pii_columns()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_disallowed text;
  v_given text;
begin
  select string_agg(table_name || '.' || column_name, ', ' order by table_name, column_name)
    into v_disallowed
    from information_schema.columns
   where table_schema = 'public'
     and column_name ~* '(^|_)(last_name|surname|family_name|middle_name|full_name|email|phone|dob|date_of_birth|birthday|address|photo|avatar_url|password|login|username|ssn|iep)(_|$)';

  if v_disallowed is not null then
    raise exception 'disallowed student PII columns: %', v_disallowed
      using errcode = 'check_violation';
  end if;

  select string_agg(table_name || '.' || column_name, ', ' order by table_name, column_name)
    into v_given
    from information_schema.columns
   where table_schema = 'public'
     and column_name in ('first_name', 'given_name')
     and table_name <> 'students';

  if v_given is not null then
    raise exception 'given-name columns are only allowed on public.students: %', v_given
      using errcode = 'check_violation';
  end if;
end;
$$;
