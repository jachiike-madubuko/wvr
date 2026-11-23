-- Calendar blocks, anonymous capability tokens (/s/[token]),
-- per-student path sessions, and block_events telemetry.

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  org_id uuid references public.orgs (id) on delete set null,
  start_date date not null,
  end_date date not null,
  check (end_date >= start_date),
  subjects text[] not null check (
    array_length(subjects, 1) >= 1
    and subjects <@ array['math', 'ela', 'science', 'social_studies', 'art']
  ),
  kind text not null check (kind in ('unit', 'lesson')),
  title text not null default '' check (char_length(title) <= 160),
  unit_id uuid references public.calendar_blocks (id) on delete set null,
  variation_set_id uuid references public.variation_sets (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'awaiting_review', 'approved', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_blocks_unit_kind_no_parent check (kind <> 'unit' or unit_id is null),
  constraint calendar_blocks_no_self_parent check (unit_id is null or unit_id <> id)
);

create index calendar_blocks_class_dates_idx
  on public.calendar_blocks (class_id, start_date, end_date);

create trigger calendar_blocks_set_updated_at
  before update on public.calendar_blocks
  for each row execute function public.set_updated_at();

create or replace function public.enforce_calendar_block_hierarchy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_parent_kind text;
  v_parent_class uuid;
begin
  if not exists (
    select 1 from public.classes c
    where c.id = new.class_id and c.teacher_id = new.teacher_id
  ) then
    raise exception 'calendar block class_id must belong to teacher_id'
      using errcode = 'check_violation';
  end if;

  if new.unit_id is not null then
    select b.kind, b.class_id
      into v_parent_kind, v_parent_class
      from public.calendar_blocks b
     where b.id = new.unit_id;

    if v_parent_kind is distinct from 'unit' or v_parent_class is distinct from new.class_id then
      raise exception 'unit_id must reference a unit in the same class'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger calendar_blocks_enforce_hierarchy
  before insert or update on public.calendar_blocks
  for each row execute function public.enforce_calendar_block_hierarchy();

create table public.student_path_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  calendar_block_id uuid not null references public.calendar_blocks (id) on delete cascade,
  variation_id text not null check (length(btrim(variation_id)) between 1 and 80),
  payload jsonb not null,
  progress jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_path_tokens_block_idx
  on public.student_path_tokens (calendar_block_id);

create trigger student_path_tokens_set_updated_at
  before update on public.student_path_tokens
  for each row execute function public.set_updated_at();

create table public.student_path_sessions (
  id uuid primary key default gen_random_uuid(),
  path_token_id uuid not null references public.student_path_tokens (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (path_token_id, student_id)
);

create index student_path_sessions_student_idx
  on public.student_path_sessions (student_id);

create trigger student_path_sessions_set_updated_at
  before update on public.student_path_sessions
  for each row execute function public.set_updated_at();

create table public.block_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs (id) on delete set null,
  student_id uuid not null references public.students (id) on delete cascade,
  block_id text not null check (length(btrim(block_id)) between 1 and 80),
  subject text not null check (subject in ('hook', 'math', 'ela', 'science', 'social_studies', 'art')),
  attempts integer not null check (attempts >= 0 and attempts <= 99),
  duration_sec integer not null check (duration_sec >= 0 and duration_sec <= 14400),
  status text not null check (status in ('completed', 'struggling', 'abandoned')),
  error_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index block_events_student_idx
  on public.block_events (student_id, created_at desc);

alter table public.block_events enable row level security;

create policy block_events_select_own on public.block_events
  for select to public
  using (
    exists (
      select 1
      from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_id
        and c.teacher_id = (select public.current_teacher_id())
    )
  );

comment on table public.block_events is
  'Per-block attempts and seconds. No names. Not a grade.';

-- ---------------------------------------------------------------------------
-- Capability-link RPCs (/s/[token])
-- ---------------------------------------------------------------------------

create or replace function public.open_student_path(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.student_path_tokens;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  select * into v_token
    from public.student_path_tokens
   where token_hash = p_token_hash
     and expires_at > now();

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'variationId', v_token.variation_id,
    'payload', v_token.payload,
    'progress', v_token.progress
  );
end;
$$;

create or replace function public.open_student_path_roster(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
  v_roster jsonb;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  select b.class_id into v_class_id
    from public.student_path_tokens t
    join public.calendar_blocks b on b.id = t.calendar_block_id
   where t.token_hash = p_token_hash
     and t.expires_at > now();

  if v_class_id is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', s.id, 'firstName', s.first_name)
      order by s.sort_key, s.first_name
    ),
    '[]'::jsonb
  )
    into v_roster
    from public.students s
   where s.class_id = v_class_id;

  return v_roster;
end;
$$;

create or replace function public.save_student_path_progress(
  p_token_hash text,
  p_progress jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.student_path_tokens;
  v_existing jsonb := '{}'::jsonb;
  v_ids jsonb := '[]'::jsonb;
  v_stored_ms jsonb := '{}'::jsonb;
  v_incoming jsonb;
  v_merged jsonb := '{}'::jsonb;
  v_key text;
  v_old bigint;
  v_delta bigint;
  v_write_cap constant bigint := 14400000;
  v_total_cap constant bigint := 43200000;
  v_next jsonb;
  rec record;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;
  if jsonb_typeof(p_progress) is distinct from 'object' then
    raise exception 'progress must be an object' using errcode = 'check_violation';
  end if;

  select * into v_token
    from public.student_path_tokens
   where token_hash = p_token_hash
     and expires_at > now()
     for update;

  if not found then
    return null;
  end if;

  v_existing := coalesce(v_token.progress, '{}'::jsonb);

  if jsonb_typeof(p_progress -> 'completedBlockIds') = 'array' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      into v_ids
      from (
        select left(btrim(value #>> '{}'), 80) as x
        from jsonb_array_elements(p_progress -> 'completedBlockIds')
        where jsonb_typeof(value) in ('string', 'number')
          and length(btrim(value #>> '{}')) between 1 and 80
        limit 200
      ) s
      where x is not null and x <> '';
  else
    v_ids := coalesce(v_existing -> 'completedBlockIds', '[]'::jsonb);
  end if;

  if jsonb_typeof(v_existing -> 'blockMs') = 'object' then
    v_stored_ms := v_existing -> 'blockMs';
  end if;
  v_incoming := coalesce(p_progress -> 'blockMs', '{}'::jsonb);
  if jsonb_typeof(v_incoming) is distinct from 'object' then
    v_incoming := '{}'::jsonb;
  end if;

  v_merged := v_stored_ms;
  for rec in
    select key, value
    from jsonb_each(v_incoming)
  loop
    v_key := left(btrim(rec.key), 80);
    if v_key is null or v_key = '' then
      continue;
    end if;
    if jsonb_typeof(rec.value) not in ('number') then
      continue;
    end if;
    v_delta := least(greatest(floor((rec.value::text)::numeric)::bigint, 0), v_write_cap);
    v_old := coalesce((v_merged ->> v_key)::bigint, 0);
    if v_old < 0 then
      v_old := 0;
    end if;
    v_merged := v_merged || jsonb_build_object(
      v_key,
      least(v_old + v_delta, v_total_cap)
    );
  end loop;

  v_next := jsonb_build_object(
    'completedBlockIds', coalesce(v_ids, '[]'::jsonb),
    'blockMs', coalesce(v_merged, '{}'::jsonb)
  );

  update public.student_path_tokens
     set progress = v_next
   where id = v_token.id;

  return v_next;
end;
$$;

create or replace function public.save_student_path_session(
  p_token_hash text,
  p_student_id uuid,
  p_progress jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.student_path_tokens;
  v_existing jsonb := '{}'::jsonb;
  v_ids jsonb := '[]'::jsonb;
  v_stored_ms jsonb := '{}'::jsonb;
  v_incoming jsonb;
  v_merged jsonb := '{}'::jsonb;
  v_key text;
  v_old bigint;
  v_delta bigint;
  v_write_cap constant bigint := 14400000;
  v_total_cap constant bigint := 43200000;
  v_baseline constant integer := 200;
  v_org uuid;
  v_block text;
  v_subject text;
  v_attempts integer;
  v_duration integer;
  v_status text;
  v_errors jsonb;
  rec record;
  ev jsonb;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;
  if p_student_id is null then
    raise exception 'student required' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(p_progress) is distinct from 'object' then
    raise exception 'progress must be an object' using errcode = 'check_violation';
  end if;

  select * into v_token
    from public.student_path_tokens
   where token_hash = p_token_hash
     and expires_at > now();
  if not found then
    return null;
  end if;

  if not exists (
    select 1
    from public.students s
    join public.calendar_blocks b on b.class_id = s.class_id
    where s.id = p_student_id
      and b.id = v_token.calendar_block_id
  ) then
    raise exception 'student not on this class' using errcode = 'check_violation';
  end if;

  select c.org_id into v_org
    from public.students s
    join public.classes c on c.id = s.class_id
   where s.id = p_student_id;

  select progress into v_existing
    from public.student_path_sessions
   where path_token_id = v_token.id
     and student_id = p_student_id;
  if not found then
    v_existing := '{}'::jsonb;
  end if;

  if jsonb_typeof(p_progress -> 'completedBlockIds') = 'array' then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      into v_ids
      from (
        select left(btrim(value #>> '{}'), 80) as x
        from jsonb_array_elements(p_progress -> 'completedBlockIds')
        where jsonb_typeof(value) in ('string', 'number')
          and length(btrim(value #>> '{}')) between 1 and 80
        limit 200
      ) s
      where x is not null and x <> '';
  else
    v_ids := coalesce(v_existing -> 'completedBlockIds', '[]'::jsonb);
  end if;

  if jsonb_typeof(v_existing -> 'blockMs') = 'object' then
    v_stored_ms := v_existing -> 'blockMs';
  end if;
  v_incoming := coalesce(p_progress -> 'blockMs', '{}'::jsonb);
  if jsonb_typeof(v_incoming) is distinct from 'object' then
    v_incoming := '{}'::jsonb;
  end if;

  v_merged := v_stored_ms;
  for rec in
    select key, value
    from jsonb_each(v_incoming)
  loop
    v_key := left(btrim(rec.key), 80);
    if v_key is null or v_key = '' then
      continue;
    end if;
    if jsonb_typeof(rec.value) not in ('number') then
      continue;
    end if;
    v_delta := least(greatest(floor((rec.value::text)::numeric)::bigint, 0), v_write_cap);
    v_old := coalesce((v_merged ->> v_key)::bigint, 0);
    if v_old < 0 then
      v_old := 0;
    end if;
    v_merged := v_merged || jsonb_build_object(
      v_key,
      least(v_old + v_delta, v_total_cap)
    );
  end loop;

  insert into public.student_path_sessions (path_token_id, student_id, progress)
  values (
    v_token.id,
    p_student_id,
    jsonb_build_object(
      'completedBlockIds', coalesce(v_ids, '[]'::jsonb),
      'blockMs', coalesce(v_merged, '{}'::jsonb)
    )
  )
  on conflict (path_token_id, student_id) do update
    set progress = excluded.progress;

  if jsonb_typeof(p_progress -> 'blockEvents') = 'array' then
    for ev in
      select value
      from jsonb_array_elements(p_progress -> 'blockEvents')
      limit 20
    loop
      v_block := left(btrim(ev->>'blockId'), 80);
      v_subject := ev->>'subject';
      if v_block is null or v_block = '' then
        continue;
      end if;
      if v_subject not in ('hook', 'math', 'ela', 'science', 'social_studies', 'art') then
        continue;
      end if;
      if coalesce(ev->>'attempts', '0') !~ '^[0-9]+$' or coalesce(ev->>'durationSec', '0') !~ '^[0-9]+$' then
        continue;
      end if;
      v_attempts := least((ev->>'attempts')::integer, 99);
      v_duration := least((ev->>'durationSec')::integer, 14400);
      if coalesce(ev->>'abandoned', '') = 'true' then
        v_status := 'abandoned';
      elsif v_attempts >= 3 or v_duration > v_baseline then
        v_status := 'struggling';
      else
        v_status := 'completed';
      end if;
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
        into v_errors
        from (
          select left(btrim(value #>> '{}'), 200) as x
          from jsonb_array_elements(coalesce(ev->'errorLog', '[]'::jsonb))
          where jsonb_typeof(value) = 'string'
            and length(btrim(value #>> '{}')) between 1 and 200
          limit 8
        ) s
        where x is not null and x <> '';
      insert into public.block_events (
        org_id, student_id, block_id, subject, attempts, duration_sec, status, error_log
      ) values (
        v_org, p_student_id, v_block, v_subject, v_attempts, v_duration, v_status, coalesce(v_errors, '[]'::jsonb)
      );
    end loop;
  end if;

  return (
    select progress from public.student_path_sessions
    where path_token_id = v_token.id and student_id = p_student_id
  );
end;
$$;

grant execute on function public.open_student_path(text) to public;
grant execute on function public.open_student_path_roster(text) to public;
grant execute on function public.save_student_path_progress(text, jsonb) to public;
grant execute on function public.save_student_path_session(text, uuid, jsonb) to public;

comment on function public.save_student_path_session(text, uuid, jsonb) is
  'Merge per-student dwell and record block events. Student must belong to the token class.';
