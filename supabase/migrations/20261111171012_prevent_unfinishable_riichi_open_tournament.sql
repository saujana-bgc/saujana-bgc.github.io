ALTER TABLE public.riichi_open_registrations
  ADD COLUMN IF NOT EXISTS payment_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reviewed_by uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.admin_generate_riichi_open_q1(p_actor uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
declare v_event public.riichi_open_events%rowtype; v_round uuid; v_count integer; v_final_count integer; v_tables integer;
begin
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found or v_event.stage<>'registration' then raise exception 'The first qualifier can only start during registration setup'; end if;
  select count(*) into v_count from public.riichi_open_participants p
  join public.riichi_open_registrations r on r.id=p.registration_id
  where p.event_id=v_event.id and p.active and p.checked_in and r.status='verified';
  if v_count<4 or v_count>16 or v_count%4<>0 then raise exception 'Check in 4, 8, 12 or 16 verified players before drawing tables'; end if;
  select count(*) into v_final_count from public.riichi_open_participants p
  join public.riichi_open_registrations r on r.id=p.registration_id
  where p.event_id=v_event.id and p.active and p.checked_in and r.status='verified' and p.eligible_for_final and not p.is_substitute;
  if v_final_count<4 then raise exception 'Check in at least four final-eligible players before drawing tables'; end if;
  v_tables:=v_count/4;
  insert into public.riichi_open_rounds(event_id,round_key,status,expected_tables) values(v_event.id,'qualifier_1','active',v_tables) returning id into v_round;
  insert into public.riichi_open_tables(event_id,round_id,table_number) select v_event.id,v_round,n.table_number from generate_series(1,v_tables) as n(table_number);
  with shuffled as (
    select p.id participant_id,row_number() over(order by random()) rn from public.riichi_open_participants p
    join public.riichi_open_registrations r on r.id=p.registration_id
    where p.event_id=v_event.id and p.active and p.checked_in and r.status='verified'
  ), seated as (
    select s.participant_id,t.id table_id,case row_number() over(partition by t.id order by random()) when 1 then 'East' when 2 then 'South' when 3 then 'West' else 'North' end seat_wind
    from shuffled s join public.riichi_open_tables t on t.round_id=v_round and t.table_number=((s.rn-1)/4)+1
  ) insert into public.riichi_open_seats(event_id,round_id,table_id,participant_id,seat_wind)
  select v_event.id,v_round,table_id,participant_id,seat_wind from seated;
  update public.riichi_open_tables set published=true where round_id=v_round;
  update public.riichi_open_events set stage='qualifier_1',updated_at=now() where id=v_event.id;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details)
  values(v_event.id,p_actor,'draw_tables','round',v_round::text,jsonb_build_object('players',v_count,'tables',v_tables));
  return jsonb_build_object('round_id',v_round,'tables',v_tables,'players',v_count);
end $$;

ALTER FUNCTION public.admin_generate_riichi_open_q1(uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.admin_review_riichi_open_payment_exception(
  p_registration_id uuid,
  p_expected_note text,
  p_note text,
  p_actor uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
declare v_event public.riichi_open_events%rowtype; v_registration public.riichi_open_registrations%rowtype;
begin
  select e.* into v_event from public.riichi_open_events e
  join public.riichi_open_registrations r on r.event_id=e.id
  where r.id=p_registration_id for update of e;
  if not found then raise exception 'Registration not found'; end if;
  if v_event.stage='registration' then raise exception 'Use the payment status controls while registration is open'; end if;
  select * into v_registration from public.riichi_open_registrations where id=p_registration_id for update;
  if v_registration.status<>'payment_exception' or v_registration.payment_reviewed_at is not null then
    raise exception 'This late payment was already reviewed or is no longer awaiting review';
  end if;
  if coalesce(v_registration.private_note,'') is distinct from coalesce(p_expected_note,'') then
    raise exception 'Private note changed in another session; reload before completing review';
  end if;
  update public.riichi_open_registrations
  set private_note=nullif(btrim(p_note),''),payment_reviewed_at=now(),payment_reviewed_by=p_actor,updated_at=now()
  where id=p_registration_id;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason,details)
  values(v_event.id,p_actor,'review_payment_exception','registration',p_registration_id::text,nullif(btrim(p_note),''),jsonb_build_object('place_confirmed',false));
end $$;

ALTER FUNCTION public.admin_review_riichi_open_payment_exception(uuid,text,text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_review_riichi_open_payment_exception(uuid,text,text,uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_review_riichi_open_payment_exception(uuid,text,text,uuid) TO service_role;
