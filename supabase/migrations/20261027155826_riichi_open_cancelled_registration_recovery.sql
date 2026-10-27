-- Let the owner of a cancelled registration start a fresh, linked attempt.
alter table public.riichi_open_registration_holds
  add column restarts_registration_id uuid references public.riichi_open_registrations(id);

alter table public.riichi_open_registrations
  add column restarted_from_registration_id uuid references public.riichi_open_registrations(id);

create unique index riichi_open_one_active_restart_per_registration_idx
  on public.riichi_open_registration_holds(event_id,restarts_registration_id)
  where restarts_registration_id is not null and status='active';

create unique index riichi_open_one_submitted_restart_per_registration_idx
  on public.riichi_open_registrations(restarted_from_registration_id)
  where restarted_from_registration_id is not null;

create or replace function public.copy_riichi_open_restart_link()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.hold_id is not null then
    select h.restarts_registration_id into new.restarted_from_registration_id
    from public.riichi_open_registration_holds h where h.id=new.hold_id;
  end if;
  return new;
end $$;

create trigger riichi_open_registration_restart_link
before insert on public.riichi_open_registrations
for each row execute function public.copy_riichi_open_restart_link();

revoke all on function public.copy_riichi_open_restart_link() from public,anon,authenticated;

create or replace function public.restart_cancelled_riichi_open_registration(
  p_registration_id uuid,
  p_previous_token_hash text,
  p_new_token_hash text,
  p_idempotency_key text,
  p_client_fingerprint text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_event public.riichi_open_events%rowtype;
  v_registration public.riichi_open_registrations%rowtype;
  v_previous_hold public.riichi_open_registration_holds%rowtype;
  v_hold public.riichi_open_registration_holds%rowtype;
  v_completed public.riichi_open_registrations%rowtype;
  v_used integer;
  v_recent integer;
begin
  if p_previous_token_hash !~ '^[0-9a-f]{64}$'
     or p_new_token_hash !~ '^[0-9a-f]{64}$'
     or p_client_fingerprint !~ '^[0-9a-f]{64}$'
     or char_length(p_idempotency_key) not between 20 and 100 then
    raise exception 'Refresh this page and try again' using errcode='22023';
  end if;

  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found then raise exception 'Event not found'; end if;

  select * into v_registration from public.riichi_open_registrations
  where id=p_registration_id and event_id=v_event.id for update;
  if not found then raise exception 'This registration could not be confirmed'; end if;
  if v_registration.status<>'cancelled' then
    raise exception 'Only a cancelled registration can be restarted';
  end if;
  if v_registration.hold_id is null then raise exception 'Contact the organiser to restart this registration'; end if;

  select * into v_previous_hold from public.riichi_open_registration_holds
  where id=v_registration.hold_id and event_id=v_event.id and token_hash=p_previous_token_hash for update;
  if not found then raise exception 'This registration could not be confirmed'; end if;

  update public.riichi_open_registration_holds
  set status='expired'
  where event_id=v_event.id and status='active' and expires_at<=now();

  select * into v_hold from public.riichi_open_registration_holds
  where event_id=v_event.id and restarts_registration_id=v_registration.id
    and idempotency_key=p_idempotency_key for update;
  if found then
    if v_hold.token_hash<>p_new_token_hash then raise exception 'This restart belongs to another browser session'; end if;
    select * into v_completed from public.riichi_open_registrations where hold_id=v_hold.id;
    if found then
      return jsonb_build_object('completed',true,'id',v_hold.id,'registration_id',v_completed.id,
        'status',v_completed.status,'reference',upper(substr(v_completed.id::text,1,8)));
    end if;
    if v_hold.status='active' or v_hold.status='expired' then
      return jsonb_build_object('id',v_hold.id,'expires_at',v_hold.expires_at,'path',v_hold.receipt_path,
        'completed',false,'expired',v_hold.status='expired','restarted_from_registration_id',v_registration.id);
    end if;
    raise exception 'This restart was already released';
  end if;

  if exists(select 1 from public.riichi_open_registrations r
            where r.restarted_from_registration_id=v_registration.id) then
    raise exception 'A new registration has already been submitted for this cancellation';
  end if;
  if exists(select 1 from public.riichi_open_registration_holds h
            where h.restarts_registration_id=v_registration.id and h.status='active') then
    raise exception 'A replacement place is already held in this browser; restore it to continue';
  end if;
  if not v_event.registration_open or v_event.stage<>'registration' then
    raise exception 'Registration is closed';
  end if;

  delete from public.riichi_open_reservation_rate_limits
  where event_id=v_event.id and created_at<=now()-interval '30 minutes';
  select count(*) into v_recent from public.riichi_open_reservation_rate_limits
  where event_id=v_event.id and client_fingerprint=p_client_fingerprint and created_at>now()-interval '30 minutes';
  if v_recent>=4 then raise exception 'Reservation rate limit reached; wait 30 minutes' using errcode='P0001'; end if;

  select (select count(*) from public.riichi_open_registration_holds h
          where h.event_id=v_event.id and h.status='active' and h.expires_at>now()) +
         (select count(*) from public.riichi_open_registrations r
          where r.event_id=v_event.id and r.status in ('pending','verified','needs_clarification'))
  into v_used;
  if v_used>=v_event.capacity then raise exception 'All places are currently reserved'; end if;

  insert into public.riichi_open_registration_holds(
    event_id,token_hash,idempotency_key,expires_at,restarts_registration_id
  ) values (
    v_event.id,p_new_token_hash,p_idempotency_key,now()+make_interval(mins=>v_event.registration_hold_minutes),v_registration.id
  ) returning * into v_hold;

  update public.riichi_open_registration_holds
  set receipt_path=v_event.id::text||'/'||v_hold.id::text||'/'||gen_random_uuid()::text
  where id=v_hold.id returning * into v_hold;

  insert into public.riichi_open_reservation_rate_limits(event_id,client_fingerprint,hold_id)
  values(v_event.id,p_client_fingerprint,v_hold.id);

  return jsonb_build_object('id',v_hold.id,'expires_at',v_hold.expires_at,'path',v_hold.receipt_path,
    'completed',false,'expired',false,'restarted_from_registration_id',v_registration.id);
end $$;

revoke all on function public.restart_cancelled_riichi_open_registration(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.restart_cancelled_riichi_open_registration(uuid,text,text,text,text) to service_role;

-- Block reinstating an old payment while its replacement already holds or uses a place.
create or replace function public.admin_set_riichi_open_registration_status(p_registration_id uuid,p_status text,p_note text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  v_event public.riichi_open_events%rowtype;
  v_registration public.riichi_open_registrations%rowtype;
  v_participant uuid;
begin
  if p_status not in ('verified','needs_clarification','rejected','cancelled') then raise exception 'Choose a valid payment status'; end if;
  select e.* into v_event from public.riichi_open_events e join public.riichi_open_registrations r on r.event_id=e.id where r.id=p_registration_id for update of e;
  if not found then raise exception 'Registration not found'; end if;
  if v_event.stage<>'registration' then raise exception 'Payment status is locked after the playing roster starts'; end if;
  select * into v_registration from public.riichi_open_registrations where id=p_registration_id for update;

  if p_status in ('verified','needs_clarification') and v_registration.status in ('cancelled','rejected') then
    update public.riichi_open_registration_holds set status='expired'
    where event_id=v_event.id and status='active' and expires_at<=now();
    if exists(select 1 from public.riichi_open_registration_holds h where h.restarts_registration_id=v_registration.id and h.status='active' and h.expires_at>now())
       or exists(select 1 from public.riichi_open_registrations r where r.restarted_from_registration_id=v_registration.id and r.status in ('pending','verified','needs_clarification')) then
      raise exception 'A replacement registration already holds this place; cancel or review it first';
    end if;
  end if;

  if p_status in ('verified','needs_clarification') and v_registration.status not in ('pending','verified','needs_clarification') then
    if (select count(*) from public.riichi_open_registration_holds h where h.event_id=v_event.id and h.status='active' and h.expires_at>now()) +
       (select count(*) from public.riichi_open_registrations r where r.event_id=v_event.id and r.id<>p_registration_id and r.status in ('pending','verified','needs_clarification')) >=v_event.capacity then
      raise exception 'No place is available to confirm this late payment';
    end if;
  end if;

  update public.riichi_open_registrations set status=p_status,private_note=nullif(btrim(p_note),''),
    verified_at=case when p_status='verified' then now() else verified_at end,
    verified_by=case when p_status='verified' then p_actor else verified_by end,updated_at=now()
  where id=p_registration_id;

  select id into v_participant from public.riichi_open_participants where registration_id=p_registration_id;
  if p_status in ('verified','needs_clarification') then
    if v_participant is null then
      insert into public.riichi_open_participants(event_id,registration_id,display_name,source)
      values(v_event.id,v_registration.id,v_registration.display_name,case when v_registration.hold_id is null then 'manual' else 'registration' end)
      returning id into v_participant;
    else update public.riichi_open_participants set active=true where id=v_participant;
    end if;
  elsif v_participant is not null then update public.riichi_open_participants set active=false where id=v_participant;
  end if;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason,details)
  values(v_event.id,p_actor,'registration_'||p_status,'registration',p_registration_id::text,nullif(btrim(p_note),''),jsonb_build_object('previous_status',v_registration.status));
end $$;

revoke all on function public.admin_set_riichi_open_registration_status(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_set_riichi_open_registration_status(uuid,text,text,uuid) to service_role;

create or replace function public.admin_set_riichi_open_registration_status(p_registration_id uuid,p_status text,p_note text,p_expected_note text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_event_id uuid; v_registration public.riichi_open_registrations%rowtype;
begin
  select e.id into v_event_id from public.riichi_open_events e join public.riichi_open_registrations r on r.event_id=e.id where r.id=p_registration_id for update of e;
  if not found then raise exception 'Registration not found'; end if;
  select * into v_registration from public.riichi_open_registrations where id=p_registration_id for update;
  if coalesce(btrim(v_registration.private_note),'')<>coalesce(btrim(p_expected_note),'') then
    raise exception 'Private note changed in another session; choose which version to keep' using errcode='P0001';
  end if;
  perform public.admin_set_riichi_open_registration_status(p_registration_id,p_status,p_note,p_actor);
  update public.riichi_open_registrations set private_note=nullif(btrim(p_note),''),updated_at=now() where id=p_registration_id;
end $$;

revoke all on function public.admin_set_riichi_open_registration_status(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_set_riichi_open_registration_status(uuid,text,text,text,uuid) to service_role;
