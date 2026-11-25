-- Demo Data Mode: class profile selector + row-level is_demo tagging for safe purge
-- and analytics hygiene. Zero PII columns; preserves all RLS and append-only triggers.

alter table public.classes
  add column if not exists demo_profile text not null default 'sales_walkthrough'
    check (demo_profile in ('sales_walkthrough', 'interactive_onboarding'));

alter table public.students               add column if not exists is_demo boolean not null default false;
alter table public.recipes                add column if not exists is_demo boolean not null default false;
alter table public.variation_sets         add column if not exists is_demo boolean not null default false;
alter table public.calendar_blocks        add column if not exists is_demo boolean not null default false;
alter table public.student_path_tokens    add column if not exists is_demo boolean not null default false;
alter table public.student_path_sessions  add column if not exists is_demo boolean not null default false;
alter table public.block_events           add column if not exists is_demo boolean not null default false;
alter table public.student_wheel_answers  add column if not exists is_demo boolean not null default false;
alter table public.student_sel_checkins   add column if not exists is_demo boolean not null default false;
alter table public.student_action_threads add column if not exists is_demo boolean not null default false;
alter table public.student_collectibles   add column if not exists is_demo boolean not null default false;
alter table public.events                 add column if not exists is_demo boolean not null default false;

create index if not exists students_class_is_demo_idx
  on public.students (class_id) where is_demo;
create index if not exists calendar_blocks_class_is_demo_idx
  on public.calendar_blocks (class_id) where is_demo;

comment on column public.classes.demo_profile is
  'Active demo fixture profile (sales_walkthrough | interactive_onboarding).';
comment on column public.students.is_demo is
  'True for seeded demo/onboarding rows; safe purge deletes strictly WHERE is_demo = true.';

-- Backfill legacy db/seed.sql rows as is_demo = true so profile switching cleanly
-- replaces v1 demo rows without touching real teacher-created (is_demo = false) rows.
update public.students set is_demo = true
 where id in (
   'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
   'dddddddd-dddd-4ddd-8ddd-dddddddddd02',
   'dddddddd-dddd-4ddd-8ddd-dddddddddd03',
   'dddddddd-dddd-4ddd-8ddd-dddddddddd04',
   'dddddddd-dddd-4ddd-8ddd-dddddddddd05',
   'dddddddd-dddd-4ddd-8ddd-dddddddddd06'
 );
update public.calendar_blocks set is_demo = true
 where id in (
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01',
   'ffffffff-ffff-4fff-8fff-ffffffffff01'
 );
update public.student_path_tokens set is_demo = true
 where id = '77777777-7777-4777-8777-777777777701';
update public.block_events set is_demo = true
 where student_id in (select id from public.students where is_demo);
update public.student_wheel_answers set is_demo = true
 where student_id in (select id from public.students where is_demo);
update public.student_sel_checkins set is_demo = true
 where student_id in (select id from public.students where is_demo);
update public.student_action_threads set is_demo = true
 where student_id in (select id from public.students where is_demo);
update public.student_collectibles set is_demo = true
 where student_id in (select id from public.students where is_demo);
update public.student_path_sessions set is_demo = true
 where student_id in (select id from public.students where is_demo);

