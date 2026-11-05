create or replace function public.reserve_riichi_open_place(p_token_hash text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_event public.riichi_open_events%rowtype;
  v_hold public.riichi_open_registration_holds%rowtype;
  v_registration public.riichi_open_registrations%rowtype;
  v_used integer;
begin
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found then raise exception 'Event not found'; end if;

  -- A matching browser may restore its own reservation after expiry or closure.
  -- This does not extend the hold or reserve capacity again.
  select * into v_hold from public.riichi_open_registration_holds
  where event_id=v_event.id and idempotency_key=p_idempotency_key for update;
  if found then
    if v_hold.token_hash is distinct from p_token_hash then
      raise exception 'This reservation belongs to another browser session';
    end if;
    select * into v_registration from public.riichi_open_registrations where hold_id=v_hold.id;
    if found then
      return jsonb_build_object('id',v_hold.id,'expires_at',v_hold.expires_at,'receipt_path',v_hold.receipt_path,'completed',true,
        'registration_id',v_registration.id,'registration_status',v_registration.status);
    end if;
    if v_hold.status in ('active','expired') then
      if v_hold.expires_at<=now() and v_hold.status='active' then
        update public.riichi_open_registration_holds set status='expired' where id=v_hold.id;
        v_hold.status:='expired';
      end if;
      return jsonb_build_object('id',v_hold.id,'expires_at',v_hold.expires_at,'receipt_path',v_hold.receipt_path,'completed',false,'expired',v_hold.status='expired');
    end if;
    raise exception 'This reservation has already been released';
  end if;

  if not v_event.registration_open then raise exception 'Registration is closed' using errcode='P0001'; end if;
  if v_event.stage<>'registration' then raise exception 'The playing roster is already locked'; end if;
  update public.riichi_open_registration_holds set status='expired'
  where event_id=v_event.id and status='active' and expires_at<=now();
  select (select count(*) from public.riichi_open_registration_holds h where h.event_id=v_event.id and h.status='active' and h.expires_at>now()) +
         (select count(*) from public.riichi_open_registrations r where r.event_id=v_event.id and r.status in ('pending','verified','needs_clarification')) into v_used;
  if v_used>=v_event.capacity then raise exception 'All places are reserved' using errcode='P0001'; end if;
  insert into public.riichi_open_registration_holds(event_id,token_hash,idempotency_key,expires_at)
  values(v_event.id,p_token_hash,p_idempotency_key,now()+make_interval(mins=>v_event.registration_hold_minutes)) returning * into v_hold;
  update public.riichi_open_registration_holds set receipt_path=v_event.id::text||'/'||v_hold.id::text||'/'||gen_random_uuid()::text
  where id=v_hold.id returning * into v_hold;
  return jsonb_build_object('id',v_hold.id,'expires_at',v_hold.expires_at,'receipt_path',v_hold.receipt_path,'completed',false,'expired',false);
end $$;
revoke all on function public.reserve_riichi_open_place(text,text) from public,anon,authenticated;
grant execute on function public.reserve_riichi_open_place(text,text) to service_role;

create or replace function public.finalize_riichi_open_registration(p_hold_id uuid,p_token_hash text,p_display_name text,p_receipt_path text,p_receipt_mime text,p_receipt_size integer,p_receipt_sha256 text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_event_id uuid;
  v_event public.riichi_open_events%rowtype;
  v_hold public.riichi_open_registration_holds%rowtype;
  v_registration public.riichi_open_registrations%rowtype;
  v_status text;
begin
  -- Match reserve_riichi_open_place's event-then-hold lock order.
  select event_id into v_event_id
  from public.riichi_open_registration_holds
  where id=p_hold_id and token_hash=p_token_hash;
  if not found then raise exception 'This registration session could not be confirmed' using errcode='P0001'; end if;

  select * into v_event from public.riichi_open_events where id=v_event_id for update;
  if not found then raise exception 'Event not found'; end if;

  select * into v_hold from public.riichi_open_registration_holds
  where id=p_hold_id and event_id=v_event.id and token_hash=p_token_hash for update;
  if not found then raise exception 'This registration session could not be confirmed' using errcode='P0001'; end if;

  -- A lost response can safely retry after the insert committed.
  select * into v_registration from public.riichi_open_registrations where hold_id=v_hold.id;
  if found then
    return jsonb_build_object('id',v_registration.id,'status',v_registration.status,'submitted_at',v_registration.submitted_at);
  end if;
  if v_hold.status not in ('active','expired') then raise exception 'This place reservation is no longer active' using errcode='P0001'; end if;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 80 then raise exception 'Enter a name of up to 80 characters' using errcode='22023'; end if;
  if v_hold.receipt_path is distinct from p_receipt_path then raise exception 'Receipt upload path does not match this reservation' using errcode='22023'; end if;
  if p_receipt_mime not in ('image/jpeg','image/png','application/pdf') or p_receipt_size not between 1 and 5242880 then raise exception 'Receipt file is not accepted' using errcode='22023'; end if;

  v_status := case when v_hold.status='active' and v_hold.expires_at>now() and v_event.registration_open and v_event.stage='registration' then 'pending' else 'payment_exception' end;
  insert into public.riichi_open_registrations(event_id,hold_id,display_name,status,receipt_path,receipt_mime,receipt_size,receipt_sha256)
  values(v_event.id,v_hold.id,btrim(p_display_name),v_status,p_receipt_path,p_receipt_mime,p_receipt_size,p_receipt_sha256) returning * into v_registration;
  update public.riichi_open_registration_holds set status='submitted' where id=v_hold.id;
  if v_status='pending' then
    insert into public.riichi_open_participants(event_id,registration_id,display_name) values(v_event.id,v_registration.id,btrim(p_display_name));
  end if;
  return jsonb_build_object('id',v_registration.id,'status',v_registration.status,'submitted_at',v_registration.submitted_at);
end $$;
revoke all on function public.finalize_riichi_open_registration(uuid,text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.finalize_riichi_open_registration(uuid,text,text,text,text,integer,text) to service_role;
