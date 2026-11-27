-- WVR-235: Teacher-authored Weaver Wheel scores (raw 1-5 per dimension, NULL = Not set).
-- Shifted to 009 because 008_block_events_tracking.sql already exists on main.

create table public.student_wheel_scores (
  student_id        uuid primary key references public.students (id) on delete cascade,
  emotional_reg     smallint check (emotional_reg   between 1 and 5),
  focus             smallint check (focus           between 1 and 5),
  engagement        smallint check (engagement      between 1 and 5),
  task_completion   smallint check (task_completion between 1 and 5),
  social            smallint check (social          between 1 and 5),
  set_by_teacher_id uuid not null default public.current_teacher_id() references public.teachers (id),
  version           integer not null default 1 check (version >= 1),
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint student_wheel_scores_at_least_one check (
    num_nonnulls(emotional_reg, focus, engagement, task_completion, social) >= 1
  )
);

create trigger student_wheel_scores_set_updated_at
  before update on public.student_wheel_scores
  for each row execute function public.set_updated_at();

alter table public.student_wheel_scores enable row level security;

create policy student_wheel_scores_all_own on public.student_wheel_scores
  for all to public
  using (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_id
        and c.teacher_id = (select public.current_teacher_id())
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_id
        and c.teacher_id = (select public.current_teacher_id())
    )
    and set_by_teacher_id = (select public.current_teacher_id())
  );

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'weavr_app') then
    grant select, insert, update, delete on public.student_wheel_scores to weavr_app;
  end if;
end $$;

comment on table public.student_wheel_scores is
  'Teacher-authored Weaver Wheel (WVR-235): raw 1-5 per dimension, NULL = Not set. Teacher opinion, not diagnosis. No AI inference; never fed to generation prompts. Teacher-only RLS.';
