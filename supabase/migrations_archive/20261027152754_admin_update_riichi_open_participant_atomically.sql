-- Update a participant and its linked public registration name in one transaction.
-- The event lock keeps the registration-stage check stable while the row changes.
create or replace function public.admin_update_riichi_open_participant(
  p_event_id uuid,
  p_participant_id uuid,
  p_patch jsonb,
  p_expected jsonb,
  p_actor uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage text;
  v_participant public.riichi_open_participants%rowtype;
  v_name text;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'Choose at least one participant detail to update';
  end if;
  if p_expected is null or jsonb_typeof(p_expected) <> 'object' then
    raise exception 'Reload the roster before saving participant changes';
  end if;

  if exists (
    select 1 from jsonb_object_keys(p_patch) as supplied(key)
    where supplied.key not in ('display_name','checked_in','active','is_substitute','eligible_for_final')
  ) then
    raise exception 'Participant update contains an unsupported field';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_patch) as changed(key)
    where not (p_expected ? changed.key)
  ) then
    raise exception 'Reload the roster before saving participant changes';
  end if;

  if p_patch ? 'display_name' then
    if jsonb_typeof(p_patch->'display_name') <> 'string' then
      raise exception 'Enter a name of up to 80 characters';
    end if;
    v_name := btrim(p_patch->>'display_name');
    if v_name = '' or char_length(v_name) > 80 then
      raise exception 'Enter a name of up to 80 characters';
    end if;
    p_patch := jsonb_set(p_patch, '{display_name}', to_jsonb(v_name));
  end if;

  if (p_patch ? 'checked_in' and jsonb_typeof(p_patch->'checked_in') <> 'boolean')
     or (p_patch ? 'active' and jsonb_typeof(p_patch->'active') <> 'boolean')
     or (p_patch ? 'is_substitute' and jsonb_typeof(p_patch->'is_substitute') <> 'boolean')
     or (p_patch ? 'eligible_for_final' and jsonb_typeof(p_patch->'eligible_for_final') <> 'boolean') then
    raise exception 'Participant flags must be true or false';
  end if;

  select e.stage into v_stage
  from public.riichi_open_events e
  where e.id = p_event_id
  for update;
  if not found then raise exception 'Event not found'; end if;
  if v_stage <> 'registration' then
    raise exception 'The playing roster is locked. Participant changes are no longer available';
  end if;

  select p.* into v_participant
  from public.riichi_open_participants p
  where p.id = p_participant_id and p.event_id = p_event_id
  for update;
  if not found then raise exception 'Participant not found'; end if;

  if (p_patch ? 'display_name' and (jsonb_typeof(p_expected->'display_name') <> 'string' or v_participant.display_name is distinct from p_expected->>'display_name'))
     or (p_patch ? 'checked_in' and (jsonb_typeof(p_expected->'checked_in') <> 'boolean' or v_participant.checked_in is distinct from (p_expected->>'checked_in')::boolean))
     or (p_patch ? 'active' and (jsonb_typeof(p_expected->'active') <> 'boolean' or v_participant.active is distinct from (p_expected->>'active')::boolean))
     or (p_patch ? 'is_substitute' and (jsonb_typeof(p_expected->'is_substitute') <> 'boolean' or v_participant.is_substitute is distinct from (p_expected->>'is_substitute')::boolean))
     or (p_patch ? 'eligible_for_final' and (jsonb_typeof(p_expected->'eligible_for_final') <> 'boolean' or v_participant.eligible_for_final is distinct from (p_expected->>'eligible_for_final')::boolean)) then
    raise exception 'Participant changed in another session; reload the roster before saving';
  end if;

  if p_patch ? 'display_name' and v_participant.registration_id is not null then
    update public.riichi_open_registrations r
    set display_name = v_name, updated_at = now()
    where r.id = v_participant.registration_id and r.event_id = p_event_id;
    if not found then raise exception 'Linked registration not found'; end if;
  end if;

  update public.riichi_open_participants p
  set display_name = case when p_patch ? 'display_name' then v_name else p.display_name end,
      checked_in = case when p_patch ? 'checked_in' then (p_patch->>'checked_in')::boolean else p.checked_in end,
      active = case when p_patch ? 'active' then (p_patch->>'active')::boolean else p.active end,
      is_substitute = case when p_patch ? 'is_substitute' then (p_patch->>'is_substitute')::boolean else p.is_substitute end,
      eligible_for_final = case
        when p_patch ? 'is_substitute' and (p_patch->>'is_substitute')::boolean then false
        when p_patch ? 'eligible_for_final' then (p_patch->>'eligible_for_final')::boolean
        else p.eligible_for_final
      end
  where p.id = p_participant_id and p.event_id = p_event_id;

  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason,details)
  values(p_event_id,p_actor,'update_participant','participant',p_participant_id::text,nullif(btrim(p_reason),''),p_patch);
end;
$$;

revoke all on function public.admin_update_riichi_open_participant(uuid,uuid,jsonb,jsonb,uuid,text) from public, anon, authenticated;
grant execute on function public.admin_update_riichi_open_participant(uuid,uuid,jsonb,jsonb,uuid,text) to service_role;
