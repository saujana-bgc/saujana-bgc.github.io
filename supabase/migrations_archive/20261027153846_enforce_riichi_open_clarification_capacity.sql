-- Clarification-needed registrations are active roster entries and consume capacity too.
-- Keep this legacy signature safe because the compare-and-set overload delegates to it.
create or replace function public.admin_set_riichi_open_registration_status(p_registration_id uuid,p_status text,p_note text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  v_event public.riichi_open_events%rowtype;
  v_registration public.riichi_open_registrations%rowtype;
  v_participant uuid;
begin
  if p_status not in ('verified','needs_clarification','rejected','cancelled') then
    raise exception 'Choose a valid payment status';
  end if;

  select e.* into v_event
  from public.riichi_open_events e
  join public.riichi_open_registrations r on r.event_id=e.id
  where r.id=p_registration_id
  for update of e;
  if not found then raise exception 'Registration not found'; end if;
  if v_event.stage<>'registration' then raise exception 'Payment status is locked after the playing roster starts'; end if;

  select * into v_registration from public.riichi_open_registrations where id=p_registration_id for update;

  if p_status in ('verified','needs_clarification')
     and v_registration.status not in ('pending','verified','needs_clarification') then
    if (select count(*) from public.riichi_open_registration_holds h where h.event_id=v_event.id and h.status='active' and h.expires_at>now()) +
       (select count(*) from public.riichi_open_registrations r where r.event_id=v_event.id and r.id<>p_registration_id and r.status in ('pending','verified','needs_clarification')) >=v_event.capacity then
      raise exception 'No place is available to confirm this late payment';
    end if;
  end if;

  update public.riichi_open_registrations
  set status=p_status,
      private_note=nullif(btrim(p_note),''),
      verified_at=case when p_status='verified' then now() else verified_at end,
      verified_by=case when p_status='verified' then p_actor else verified_by end,
      updated_at=now()
  where id=p_registration_id;

  select id into v_participant from public.riichi_open_participants where registration_id=p_registration_id;
  if p_status in ('verified','needs_clarification') then
    if v_participant is null then
      insert into public.riichi_open_participants(event_id,registration_id,display_name,source)
      values(v_event.id,v_registration.id,v_registration.display_name,case when v_registration.hold_id is null then 'manual' else 'registration' end)
      returning id into v_participant;
    else
      update public.riichi_open_participants set active=true where id=v_participant;
    end if;
  elsif v_participant is not null then
    update public.riichi_open_participants set active=false where id=v_participant;
  end if;

  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason,details)
  values(v_event.id,p_actor,'registration_'||p_status,'registration',p_registration_id::text,nullif(btrim(p_note),''),jsonb_build_object('previous_status',v_registration.status));
end $$;

revoke all on function public.admin_set_riichi_open_registration_status(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_set_riichi_open_registration_status(uuid,text,text,uuid) to service_role;
