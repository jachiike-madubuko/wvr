-- Teacher-driven interest-group membership. A group is a context pack id.
-- The membership row is the current state; the event table is the append-only
-- history. Moves go through one versioned RPC so concurrent drags serialize and
-- a stale client gets VERSION_CONFLICT instead of silently overwriting.

create table public.group_memberships (
  student_id uuid primary key references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  pack_id text not null references public.context_packs (id),
  version integer not null default 1 check (version >= 1),
  updated_at timestamptz not null default now()
);

create index group_memberships_class_id_idx on public.group_memberships (class_id);

create table public.group_membership_events (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  student_id uuid not null references public.students (id) on delete cascade,
  from_pack_id text,
  to_pack_id text not null,
  actor text not null check (actor in ('teacher')),
  actor_id uuid not null,
  created_at timestamptz not null default now()
);

create index group_membership_events_class_id_idx
  on public.group_membership_events (class_id, created_at desc);

alter table public.group_memberships enable row level security;
alter table public.group_membership_events enable row level security;

create policy group_memberships_all_own on public.group_memberships
  for all to authenticated
  using (
    exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = group_memberships.student_id
        and s.class_id = group_memberships.class_id
        and c.teacher_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = group_memberships.student_id
        and s.class_id = group_memberships.class_id
        and c.teacher_id = (select auth.uid())
    )
  );

create policy group_membership_events_select_own on public.group_membership_events
  for select to authenticated
  using (
    exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = group_membership_events.student_id
        and s.class_id = group_membership_events.class_id
        and c.teacher_id = (select auth.uid())
    )
  );

create policy group_membership_events_insert_own on public.group_membership_events
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = group_membership_events.student_id
        and s.class_id = group_membership_events.class_id
        and c.teacher_id = (select auth.uid())
    )
  );

revoke all on public.group_memberships from anon;
revoke all on public.group_membership_events from anon;
revoke update, delete, truncate on public.group_membership_events from authenticated;

create or replace function public.move_student_group(
  p_student_id uuid,
  p_to_pack_id text,
  p_expected_version integer
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_class_id uuid;
  v_stored_pack text;
  v_stored_version integer;
begin
  if p_student_id is null or p_to_pack_id is null or p_expected_version is null then
    raise exception 'student, pack and expected version are required'
      using errcode = 'check_violation';
  end if;

  -- RLS on students hides other teachers' rows, so this doubles as ownership.
  select s.class_id into v_class_id
    from public.students s
   where s.id = p_student_id;

  if v_class_id is null then
    raise exception 'student not found'
      using errcode = 'insufficient_privilege';
  end if;

  -- Lock the membership row so concurrent moves of one student serialize.
  select m.pack_id, m.version
    into v_stored_pack, v_stored_version
    from public.group_memberships m
   where m.student_id = p_student_id
     for update;

  v_stored_version := coalesce(v_stored_version, 0);

  if v_stored_version <> p_expected_version then
    raise exception 'VERSION_CONFLICT: expected % but stored version is %',
      p_expected_version, v_stored_version
      using errcode = '40001';
  end if;

  if v_stored_pack is not distinct from p_to_pack_id then
    return v_stored_version;
  end if;

  insert into public.group_memberships as m
    (student_id, class_id, pack_id, version, updated_at)
  values
    (p_student_id, v_class_id, p_to_pack_id, v_stored_version + 1, now())
  on conflict (student_id) do update
    set pack_id = excluded.pack_id,
        version = excluded.version,
        updated_at = excluded.updated_at
    where m.version = p_expected_version;

  -- A concurrent first move can slip past the row lock (nothing to lock yet);
  -- the guarded upsert then touches no row and we report a conflict.
  if not found then
    raise exception 'VERSION_CONFLICT: expected % but stored version changed',
      p_expected_version
      using errcode = '40001';
  end if;

  insert into public.group_membership_events
    (class_id, student_id, from_pack_id, to_pack_id, actor, actor_id)
  values
    (v_class_id, p_student_id, v_stored_pack, p_to_pack_id, 'teacher', (select auth.uid()));

  return v_stored_version + 1;
end;
$$;

revoke all on function public.move_student_group(uuid, text, integer)
  from public, anon;
grant execute on function public.move_student_group(uuid, text, integer)
  to authenticated;

comment on function public.move_student_group(uuid, text, integer) is
  'Move a teacher-owned student to a context pack group. Versioned: raises VERSION_CONFLICT when p_expected_version differs from the stored version (0 when no row). Same-pack moves are no-ops.';

comment on table public.group_memberships is
  'Current interest-group membership per student (pack id), with an optimistic-lock version.';
comment on table public.group_membership_events is
  'Append-only history of teacher group moves.';
