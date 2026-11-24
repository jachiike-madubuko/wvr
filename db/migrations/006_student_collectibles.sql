-- Student avatar collectibles: milestone-unlocked items & equipped slots.
-- No PII columns; teacher-scoped via RLS; anon student-path access via
-- SECURITY DEFINER RPCs gated by SHA-256 capability token.

create table public.student_collectibles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  item_id text not null check (length(btrim(item_id)) between 1 and 60),
  slot text not null check (slot in ('hat', 'eyewear', 'pet')),
  equipped boolean not null default false,
  milestone_id text not null check (length(btrim(milestone_id)) between 1 and 60),
  recall_note text not null default '' check (char_length(recall_note) <= 280),
  unlocked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, item_id)
);

create index student_collectibles_student_idx
  on public.student_collectibles (student_id);

create unique index student_collectibles_one_equipped_per_slot_idx
  on public.student_collectibles (student_id, slot)
  where equipped;

create trigger student_collectibles_set_updated_at
  before update on public.student_collectibles
  for each row execute function public.set_updated_at();

alter table public.student_collectibles enable row level security;

create policy student_collectibles_all_own on public.student_collectibles
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
  );

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'weavr_app') then
    grant select, insert, update, delete on public.student_collectibles to weavr_app;
  end if;
end $$;

comment on table public.student_collectibles is
  'Milestone-unlocked avatar collectibles per student (hat, eyewear, pet). Teacher-scoped RLS; capability-token RPCs for /s/[token].';

-- ---------------------------------------------------------------------------
-- Capability-link RPCs (/s/[token])
-- ---------------------------------------------------------------------------

create or replace function public.get_student_collectibles(
  p_token_hash text,
  p_student_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
  v_pack_id text;
  v_items jsonb;
  v_all jsonb;
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

  if p_student_id is not null then
    select coalesce(m.pack_id, 'pack_space')
      into v_pack_id
      from public.students s
      left join public.group_memberships m on m.student_id = s.id
     where s.id = p_student_id
       and s.class_id = v_class_id;

    if not found then
      return null;
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'itemId', sc.item_id,
          'slot', sc.slot,
          'equipped', sc.equipped,
          'milestoneId', sc.milestone_id,
          'recallNote', sc.recall_note,
          'unlockedAt', sc.unlocked_at
        )
        order by sc.unlocked_at asc
      ),
      '[]'::jsonb
    )
      into v_items
      from public.student_collectibles sc
     where sc.student_id = p_student_id;

    return jsonb_build_object(
      'packId', v_pack_id,
      'items', coalesce(v_items, '[]'::jsonb)
    );
  end if;

  select coalesce(
    jsonb_object_agg(
      s.id::text,
      jsonb_build_object(
        'packId', coalesce(m.pack_id, 'pack_space'),
        'items', coalesce(items_sub.items_json, '[]'::jsonb)
      )
    ),
    '{}'::jsonb
  )
    into v_all
    from public.students s
    left join public.group_memberships m on m.student_id = s.id
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'itemId', sc.item_id,
          'slot', sc.slot,
          'equipped', sc.equipped,
          'milestoneId', sc.milestone_id,
          'recallNote', sc.recall_note,
          'unlockedAt', sc.unlocked_at
        )
        order by sc.unlocked_at asc
      ) as items_json
      from public.student_collectibles sc
      where sc.student_id = s.id
    ) items_sub on true
   where s.class_id = v_class_id;

  return coalesce(v_all, '{}'::jsonb);
end;
$$;

create or replace function public.save_student_collectible(
  p_token_hash text,
  p_student_id uuid,
  p_action text,
  p_item_id text,
  p_slot text,
  p_milestone_id text default null,
  p_recall_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
  v_item_id text;
  v_items jsonb;
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

  if p_student_id is null or not exists (
    select 1
      from public.students s
     where s.id = p_student_id
       and s.class_id = v_class_id
  ) then
    raise exception 'student not on this class' using errcode = 'check_violation';
  end if;

  if p_action is null or p_action not in ('unlock', 'equip', 'unequip') then
    raise exception 'invalid collectible action' using errcode = 'check_violation';
  end if;

  if p_slot is null or p_slot not in ('hat', 'eyewear', 'pet') then
    raise exception 'invalid collectible slot' using errcode = 'check_violation';
  end if;

  if p_item_id is null or length(btrim(p_item_id)) not between 1 and 60 then
    raise exception 'invalid collectible item_id' using errcode = 'check_violation';
  end if;

  v_item_id := btrim(p_item_id);

  if p_action = 'unlock' then
    insert into public.student_collectibles (
      student_id, item_id, slot, equipped, milestone_id, recall_note
    ) values (
      p_student_id,
      v_item_id,
      p_slot,
      false,
      coalesce(nullif(btrim(p_milestone_id), ''), 'milestone'),
      left(coalesce(p_recall_note, ''), 280)
    )
    on conflict (student_id, item_id) do nothing;
  elsif p_action = 'equip' then
    if not exists (
      select 1
        from public.student_collectibles
       where student_id = p_student_id
         and item_id = v_item_id
    ) then
      raise exception 'collectible not unlocked' using errcode = 'check_violation';
    end if;

    update public.student_collectibles
       set equipped = false
     where student_id = p_student_id
       and slot = p_slot
       and equipped = true
       and item_id <> v_item_id;

    update public.student_collectibles
       set equipped = true
     where student_id = p_student_id
       and item_id = v_item_id;
  elsif p_action = 'unequip' then
    update public.student_collectibles
       set equipped = false
     where student_id = p_student_id
       and item_id = v_item_id
       and equipped = true;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'itemId', sc.item_id,
        'slot', sc.slot,
        'equipped', sc.equipped,
        'milestoneId', sc.milestone_id,
        'recallNote', sc.recall_note,
        'unlockedAt', sc.unlocked_at
      )
      order by sc.unlocked_at asc
    ),
    '[]'::jsonb
  )
    into v_items
    from public.student_collectibles sc
   where sc.student_id = p_student_id;

  return coalesce(v_items, '[]'::jsonb);
end;
$$;

grant execute on function public.get_student_collectibles(text, uuid) to public;
grant execute on function public.save_student_collectible(text, uuid, text, text, text, text, text) to public;
