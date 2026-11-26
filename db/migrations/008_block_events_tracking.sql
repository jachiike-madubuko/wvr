-- Propagate students.is_demo onto student_path_sessions & block_events and append
-- allowlisted student.block_submitted rows into public.events.
-- Thresholds (attempts >= 3, duration > 200s) stay synced with
-- src/domain/config/weaver-config.ts (alerts.highAttempts, alerts.overTimeSec).

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
  v_baseline constant integer := 200; -- weaver-config alerts.overTimeSec
  v_high_attempts constant integer := 3; -- weaver-config alerts.highAttempts
  v_org uuid;
  v_teacher uuid;
  v_is_demo boolean;
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

  select c.org_id, c.teacher_id, s.is_demo
    into v_org, v_teacher, v_is_demo
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

  insert into public.student_path_sessions (path_token_id, student_id, progress, is_demo)
  values (
    v_token.id,
    p_student_id,
    jsonb_build_object(
      'completedBlockIds', coalesce(v_ids, '[]'::jsonb),
      'blockMs', coalesce(v_merged, '{}'::jsonb)
    ),
    coalesce(v_is_demo, false)
  )
  on conflict (path_token_id, student_id) do update
    set progress = excluded.progress,
        is_demo = excluded.is_demo;

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
      elsif v_attempts >= v_high_attempts or v_duration > v_baseline then
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
        org_id, student_id, block_id, subject, attempts, duration_sec, status, error_log, is_demo
      ) values (
        v_org, p_student_id, v_block, v_subject, v_attempts, v_duration, v_status,
        coalesce(v_errors, '[]'::jsonb), coalesce(v_is_demo, false)
      );

      insert into public.events (teacher_id, org_id, name, payload, is_demo)
      values (
        v_teacher,
        v_org,
        'student.block_submitted',
        jsonb_build_object(
          'studentId', p_student_id,
          'blockId', v_block,
          'attempts', v_attempts,
          'durationSec', v_duration
        ),
        coalesce(v_is_demo, false)
      );
    end loop;
  end if;

  return (
    select progress from public.student_path_sessions
    where path_token_id = v_token.id and student_id = p_student_id
  );
end;
$$;

grant execute on function public.save_student_path_session(text, uuid, jsonb) to public;

comment on function public.save_student_path_session(text, uuid, jsonb) is
  'Merge per-student dwell, record block events with is_demo propagation, and append allowlisted student.block_submitted events.';
