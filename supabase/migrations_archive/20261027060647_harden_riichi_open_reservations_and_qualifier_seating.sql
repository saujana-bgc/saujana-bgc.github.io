create table public.riichi_open_reservation_rate_limits (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.riichi_open_events(id) on delete cascade,
  client_fingerprint text not null check (client_fingerprint ~ '^[0-9a-f]{64}$'),
  hold_id uuid not null unique references public.riichi_open_registration_holds(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index riichi_open_reservation_rate_window_idx
  on public.riichi_open_reservation_rate_limits(event_id,client_fingerprint,created_at desc);
alter table public.riichi_open_reservation_rate_limits enable row level security;
revoke all on public.riichi_open_reservation_rate_limits from public,anon,authenticated;
grant all on public.riichi_open_reservation_rate_limits to service_role;

create or replace function public.reserve_riichi_open_place(p_token_hash text,p_idempotency_key text,p_client_fingerprint text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_event public.riichi_open_events%rowtype;
  v_hold public.riichi_open_registration_holds%rowtype;
  v_registration public.riichi_open_registrations%rowtype;
  v_used integer;
  v_recent integer;
begin
  if p_client_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'Network identity is invalid' using errcode='22023'; end if;
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found then raise exception 'Event not found'; end if;

  -- Restore retries before applying the limit; each new hold is counted once.
  select * into v_hold from public.riichi_open_registration_holds
  where event_id=v_event.id and idempotency_key=p_idempotency_key for update;
  if found then
    if v_hold.token_hash is distinct from p_token_hash then raise exception 'This reservation belongs to another browser session'; end if;
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
  delete from public.riichi_open_reservation_rate_limits where event_id=v_event.id and created_at<=now()-interval '30 minutes';
  select count(*) into v_recent from public.riichi_open_reservation_rate_limits
    where event_id=v_event.id and client_fingerprint=p_client_fingerprint and created_at>now()-interval '30 minutes';
  if v_recent>=4 then raise exception 'Reservation rate limit reached; wait 30 minutes' using errcode='P0001'; end if;

  update public.riichi_open_registration_holds set status='expired'
  where event_id=v_event.id and status='active' and expires_at<=now();
  select (select count(*) from public.riichi_open_registration_holds h where h.event_id=v_event.id and h.status='active' and h.expires_at>now()) +
         (select count(*) from public.riichi_open_registrations r where r.event_id=v_event.id and r.status in ('pending','verified','needs_clarification')) into v_used;
  if v_used>=v_event.capacity then raise exception 'All places are reserved' using errcode='P0001'; end if;
  insert into public.riichi_open_registration_holds(event_id,token_hash,idempotency_key,expires_at)
  values(v_event.id,p_token_hash,p_idempotency_key,now()+make_interval(mins=>v_event.registration_hold_minutes)) returning * into v_hold;
  update public.riichi_open_registration_holds set receipt_path=v_event.id::text||'/'||v_hold.id::text||'/'||gen_random_uuid()::text
    where id=v_hold.id returning * into v_hold;
  insert into public.riichi_open_reservation_rate_limits(event_id,client_fingerprint,hold_id)
    values(v_event.id,p_client_fingerprint,v_hold.id);
  return jsonb_build_object('id',v_hold.id,'expires_at',v_hold.expires_at,'receipt_path',v_hold.receipt_path,'completed',false,'expired',false);
end $$;
revoke all on function public.reserve_riichi_open_place(text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_riichi_open_place(text,text,text) to service_role;

create or replace function public.admin_prepare_riichi_open_round(p_round_key text,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_event public.riichi_open_events%rowtype; v_prev public.riichi_open_rounds%rowtype; v_round uuid; v_count integer; v_tables integer;
begin
  if p_round_key not in ('qualifier_2','final') then raise exception 'Choose a supported tournament stage'; end if;
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found or v_event.stage<>p_round_key then raise exception 'That tournament stage is not ready'; end if;
  select * into v_prev from public.riichi_open_rounds where event_id=v_event.id and round_key=case p_round_key when 'qualifier_2' then 'qualifier_1' else 'qualifier_2' end and status='certified';
  if not found then raise exception 'Certify the previous round first'; end if;
  if p_round_key='qualifier_2' then
    select count(distinct s.participant_id) into v_count from public.riichi_open_seats s where s.round_id=v_prev.id;
    if v_count<4 or v_count>16 or v_count%4<>0 then raise exception 'The first qualifier roster cannot form full tables of four'; end if;
    if exists(
      with q as (
        select r.participant_id,sum(r.score)-coalesce((select sum(x.points) from public.riichi_open_penalties x where x.participant_id=r.participant_id and x.round_id=v_prev.id),0) score,count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
        from public.riichi_open_results r where r.round_id=v_prev.id group by r.participant_id
      ), ties as (select score,firsts,fourths,best,array_agg(participant_id) players from q group by score,firsts,fourths,best having count(*)>1)
      select 1 from ties x where not exists(select 1 from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> x.players and cardinality(d.participant_ids)=cardinality(x.players))
    ) then raise exception 'A qualifying tie remains after the score tie-breakers. Record the public draw order, then prepare the next round.'; end if;
  else
    select count(*) into v_count from public.riichi_open_participants p where p.event_id=v_event.id and p.active and p.eligible_for_final and not p.is_substitute
      and exists(select 1 from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id where r.participant_id=p.id and rr.event_id=v_event.id and rr.round_key='qualifier_2');
    if v_count<4 then raise exception 'Four eligible qualifiers with two completed rounds are needed to prepare the final'; end if;
    if exists(
      with q as (
        select p.id participant_id,
          coalesce(sum(r.score) filter(where rr.round_key in ('qualifier_1','qualifier_2')),0)-coalesce((select sum(x.points) from public.riichi_open_penalties x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=p.id and xr.round_key in ('qualifier_1','qualifier_2')),0) score,
          count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
        from public.riichi_open_participants p left join public.riichi_open_results r on r.participant_id=p.id
        left join public.riichi_open_rounds rr on rr.id=r.round_id
        where p.event_id=v_event.id and p.active and p.eligible_for_final and not p.is_substitute group by p.id
      ), eligible as (select * from q where exists(select 1 from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id where r.participant_id=q.participant_id and rr.event_id=v_event.id and rr.round_key='qualifier_2')),
      tie_groups as (
        select score,firsts,fourths,best,array_agg(participant_id) players,
          (select count(*) from eligible better where (better.score,better.firsts,better.fourths,better.best) is distinct from (eligible.score,eligible.firsts,eligible.fourths,eligible.best)
            and (better.score>eligible.score or (better.score=eligible.score and better.firsts>eligible.firsts) or (better.score=eligible.score and better.firsts=eligible.firsts and better.fourths<eligible.fourths) or (better.score=eligible.score and better.firsts=eligible.firsts and better.fourths=eligible.fourths and better.best>eligible.best))) ahead
        from eligible group by score,firsts,fourths,best having count(*)>1
      )
      select 1 from tie_groups x where x.ahead<4 and not exists(select 1 from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> x.players and cardinality(d.participant_ids)=cardinality(x.players))
    ) then raise exception 'A Top 4 tie remains after the score tie-breakers. Record the public draw order, then prepare the final.'; end if;
  end if;
  if exists(select 1 from public.riichi_open_rounds where event_id=v_event.id and round_key=p_round_key) then raise exception 'This round has already been prepared'; end if;
  v_tables:=case when p_round_key='final' then 1 else v_count/4 end;
  insert into public.riichi_open_rounds(event_id,round_key,status,expected_tables) values(v_event.id,p_round_key,'active',v_tables) returning id into v_round;
  insert into public.riichi_open_tables(event_id,round_id,table_number) select v_event.id,v_round,n.table_number from generate_series(1,v_tables) as n(table_number);
  if p_round_key='qualifier_2' then
    with q as (
      select r.participant_id,sum(r.score)-coalesce((select sum(x.points) from public.riichi_open_penalties x where x.participant_id=r.participant_id and x.round_id=v_prev.id),0) score,count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
      from public.riichi_open_results r where r.round_id=v_prev.id group by r.participant_id
    ), ranked as (
      select q.*,row_number() over(order by q.score desc,q.firsts desc,q.fourths asc,q.best desc,coalesce((select array_position(d.order_ids,q.participant_id) from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> array[q.participant_id]::uuid[] limit 1),999)) rn
      from q
    ), assigned as (
      select participant_id,case when ceil(rn::numeric/v_tables)::integer%2=1 then ((rn-1)%v_tables)+1 else v_tables-((rn-1)%v_tables) end table_number
      from ranked
    ), seated as (
      select a.participant_id,t.id table_id,case row_number() over(partition by t.id order by random()) when 1 then 'East' when 2 then 'South' when 3 then 'West' else 'North' end seat_wind
      from assigned a join public.riichi_open_tables t on t.round_id=v_round and t.table_number=a.table_number
    ) insert into public.riichi_open_seats(event_id,round_id,table_id,participant_id,seat_wind) select v_event.id,v_round,table_id,participant_id,seat_wind from seated;
  else
    with totals as (
      select r.participant_id,sum(r.score)-coalesce((select sum(x.points) from public.riichi_open_penalties x where x.participant_id=r.participant_id and x.round_id=v_prev.id),0) score,count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
      from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id and rr.round_key in ('qualifier_1','qualifier_2') where rr.event_id=v_event.id group by r.participant_id
    ), penalties as (
      select x.participant_id,sum(x.points) points from public.riichi_open_penalties x join public.riichi_open_rounds rr on rr.id=x.round_id and rr.round_key in ('qualifier_1','qualifier_2') where rr.event_id=v_event.id group by x.participant_id
    ), ranked as (
      select p.id participant_id,row_number() over(order by (coalesce(t.score,0)-coalesce(x.points,0)) desc,coalesce(t.firsts,0) desc,coalesce(t.fourths,0) asc,t.best desc,coalesce((select array_position(d.order_ids,p.id) from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> array[p.id]::uuid[] limit 1),999)) rn
      from public.riichi_open_participants p left join totals t on t.participant_id=p.id left join penalties x on x.participant_id=p.id
      where p.event_id=v_event.id and p.active and p.eligible_for_final and not p.is_substitute and exists(select 1 from public.riichi_open_results x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=p.id and xr.event_id=v_event.id and xr.round_key='qualifier_2')
    ) update public.riichi_open_participants p set qualification_seed=r.rn::smallint from ranked r where r.participant_id=p.id and r.rn<=4;
    with q as (
      select p.id participant_id,
        coalesce(sum(r.score) filter(where rr.round_key in ('qualifier_1','qualifier_2')),0)-coalesce((select sum(x.points) from public.riichi_open_penalties x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=p.id and xr.round_key in ('qualifier_1','qualifier_2')),0) score,
        count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
      from public.riichi_open_participants p left join public.riichi_open_results r on r.participant_id=p.id
      left join public.riichi_open_rounds rr on rr.id=r.round_id
      where p.event_id=v_event.id and p.active and p.eligible_for_final and not p.is_substitute and exists(select 1 from public.riichi_open_results x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=p.id and xr.event_id=v_event.id and xr.round_key='qualifier_2') group by p.id
    ), ranked as (
      select q.*,row_number() over(order by q.score desc,q.firsts desc,q.fourths asc,q.best desc,coalesce((select array_position(d.order_ids,q.participant_id) from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> array[q.participant_id]::uuid[] limit 1),999)) rn from q
    ), seated as (
      select r.participant_id,t.id table_id,case row_number() over(order by random()) when 1 then 'East' when 2 then 'South' when 3 then 'West' else 'North' end seat_wind
      from ranked r join public.riichi_open_tables t on t.round_id=v_round where r.rn<=4
    ) insert into public.riichi_open_seats(event_id,round_id,table_id,participant_id,seat_wind) select v_event.id,v_round,table_id,participant_id,seat_wind from seated;
  end if;
  update public.riichi_open_tables set published=true where round_id=v_round;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details) values(v_event.id,p_actor,'prepare_round','round',v_round::text,jsonb_build_object('round',p_round_key,'tables',v_tables));
  return jsonb_build_object('round_id',v_round,'tables',v_tables);
end $$;
revoke all on function public.admin_prepare_riichi_open_round(text,uuid) from public,anon,authenticated;
grant execute on function public.admin_prepare_riichi_open_round(text,uuid) to service_role;
