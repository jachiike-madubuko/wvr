-- Student SEL profile: Weaver Wheel answers, AM/PM SEL check-ins, and
-- teacher-facing offline intervention / SEL action threads.

create table public.student_wheel_answers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  item_id text not null check (item_id in ('hard', 'partner', 'mistake', 'noise', 'newact')),
  option_id text not null check (length(btrim(option_id)) between 1 and 40),
  other_text text not null default '' check (char_length(other_text) <= 280),
  revised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, item_id)
);

create index student_wheel_answers_student_id_idx
  on public.student_wheel_answers (student_id);

create trigger student_wheel_answers_set_updated_at
  before update on public.student_wheel_answers
  for each row execute function public.set_updated_at();

create table public.student_sel_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  checkin_date date not null default current_date,
  period text not null check (period in ('am', 'pm')),
  mood text not null check (mood in ('calm', 'happy', 'focused', 'tired', 'frustrated', 'anxious', 'overwhelmed')),
  level smallint not null check (level between 1 and 5),
  teacher_note text not null default '' check (char_length(teacher_note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, checkin_date, period)
);

create index student_sel_checkins_student_date_idx
  on public.student_sel_checkins (student_id, checkin_date desc);

create trigger student_sel_checkins_set_updated_at
  before update on public.student_sel_checkins
  for each row execute function public.set_updated_at();

create table public.student_action_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  kind text not null check (kind in ('sel', 'iv')),
  messages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(messages) = 'array'),
  include_interests boolean not null default false,
  approved_plan jsonb,
  teacher_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, kind)
);

create index student_action_threads_student_id_idx
  on public.student_action_threads (student_id);

create trigger student_action_threads_set_updated_at
  before update on public.student_action_threads
  for each row execute function public.set_updated_at();

alter table public.student_wheel_answers enable row level security;
alter table public.student_sel_checkins enable row level security;
alter table public.student_action_threads enable row level security;

create policy student_wheel_answers_all_own on public.student_wheel_answers
  for all to public
  using (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_id and c.teacher_id = (select public.current_teacher_id())
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_id and c.teacher_id = (select public.current_teacher_id())
    )
  );

create policy student_sel_checkins_all_own on public.student_sel_checkins
  for all to public
  using (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_id and c.teacher_id = (select public.current_teacher_id())
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_id and c.teacher_id = (select public.current_teacher_id())
    )
  );

create policy student_action_threads_all_own on public.student_action_threads
  for all to public
  using (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_id and c.teacher_id = (select public.current_teacher_id())
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_id and c.teacher_id = (select public.current_teacher_id())
    )
  );

comment on table public.student_wheel_answers is
  'Teacher questionnaire options per student. No scores. Same RLS as students.';
comment on table public.student_sel_checkins is
  'Morning/afternoon SEL check-ins per student. Teacher-only RLS.';
comment on table public.student_action_threads is
  'SEL and offline 3-step intervention drafts. Teacher must approve. Never injected into student blocks.';
