-- Idempotent demo seed for Weavr (Neon Lakebase Postgres).
-- Demo teacher id: 11111111-1111-4111-8111-111111111111
-- Demo student path token: 'demo-space-lesson' -> sha256 a8c358ef1c79e171137cd5f0ca358426bfc270b6e860a13957c2824cce4f33e2

insert into public.teachers (id, display_name)
values ('11111111-1111-4111-8111-111111111111', 'Ms. Rivera')
on conflict (id) do nothing;

insert into public.classes (id, teacher_id, name, grade, nav_layout)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', 'Room 204', 3, 'top')
on conflict (id) do nothing;

insert into public.students (id, class_id, first_name, sort_key) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Maya', 0),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd02', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Leo',  1),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd03', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Zoe',  2),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd04', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Noah', 3),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd05', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Ava',  4),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd06', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Kai',  5)
on conflict (id) do nothing;

insert into public.group_memberships (student_id, class_id, pack_id, version) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'pack_space',       1),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd02', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'pack_cooking',     1),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd03', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'pack_video_games', 1),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd04', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'pack_music',       1),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd05', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'pack_fashion',     1),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd06', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'pack_animals',     1)
on conflict (student_id) do nothing;

insert into public.calendar_blocks (id, class_id, teacher_id, start_date, end_date, subjects, kind, title, status)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '11111111-1111-4111-8111-111111111111',
  current_date,
  current_date + 4,
  array['math'],
  'unit',
  'Fractions in Action',
  'approved'
)
on conflict (id) do nothing;

insert into public.calendar_blocks (id, class_id, teacher_id, start_date, end_date, subjects, kind, title, unit_id, status)
values (
  'ffffffff-ffff-4fff-8fff-ffffffffff01',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '11111111-1111-4111-8111-111111111111',
  current_date,
  current_date,
  array['math'],
  'lesson',
  'Equal Parts & Halves',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01',
  'approved'
)
on conflict (id) do nothing;

insert into public.student_path_tokens (id, token_hash, calendar_block_id, variation_id, payload, expires_at)
values (
  '77777777-7777-4777-8777-777777777701',
  'a8c358ef1c79e171137cd5f0ca358426bfc270b6e860a13957c2824cce4f33e2',
  'ffffffff-ffff-4fff-8fff-ffffffffff01',
  'var_space',
  '{"title":"Equal Parts & Halves","packId":"pack_space","blocks":[{"id":"hook","title":"Launch Fuel Cells","role":"Start"},{"id":"try_1","title":"Split the Moon","role":"Try"},{"id":"check_1","title":"Half Orbit Check","role":"Check"}]}'::jsonb,
  now() + interval '365 days'
)
on conflict (token_hash) do nothing;

insert into public.block_events (id, student_id, block_id, subject, attempts, duration_sec, status, error_log) values
  ('66666666-6666-4666-8666-666666666601', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'hook',    'hook', 1, 95,  'completed',  '[]'::jsonb),
  ('66666666-6666-4666-8666-666666666602', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'check_1', 'math', 4, 240, 'struggling', '["unequal parts"]'::jsonb)
on conflict (id) do nothing;

insert into public.student_wheel_answers (id, student_id, item_id, option_id) values
  ('55555555-5555-4555-8555-555555555501', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'hard',    'keeps'),
  ('55555555-5555-4555-8555-555555555502', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'partner', 'pairs')
on conflict (student_id, item_id) do nothing;

insert into public.student_sel_checkins (id, student_id, checkin_date, period, mood, level, teacher_note) values
  ('44444444-4444-4444-8444-444444444401', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01', current_date, 'am', 'focused',    4, 'Ready for space fractions'),
  ('44444444-4444-4444-8444-444444444402', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01', current_date, 'pm', 'frustrated', 2, 'Needed extra fraction tiles')
on conflict do nothing;

insert into public.student_action_threads (id, student_id, kind, messages, approved_plan, teacher_approved_at)
values (
  '33333333-3333-4333-8333-333333333301',
  'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
  'iv',
  '[{"role":"assistant","text":"3-step offline manipulative plan for equal parts."}]'::jsonb,
  '{"steps":["1. Manipulative Check: fold paper strips into 2 equal halves.","2. Partner Scaffolding: compare equal vs unequal cuts with Leo.","3. Quick Check: 2 verbal exit prompts on equal parts."]}'::jsonb,
  now()
)
on conflict (student_id, kind) do nothing;

insert into public.student_collectibles (student_id, item_id, slot, equipped, milestone_id, recall_note) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd02', 'cooking_chef_toque', 'hat',     true, 'm1_first_block',    'Prepped the station by completing your first Launch & Hook block.'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd03', 'games_pixel_shades', 'eyewear', true, 'm2_practice_block', 'Cleared two guided practice stages without losing focus.'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddd04', 'music_note_sprite',  'pet',     true, 'm3_lesson_clear',   'Cleared the full lesson track to summon a floating Eighth-Note Sprite.')
on conflict (student_id, item_id) do nothing;
