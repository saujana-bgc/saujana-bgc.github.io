-- Data-free snapshot of the production public schema as of 2026-11-05.
-- Reproduced schema objects only; user and event rows are deliberately excluded.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."admin_add_riichi_open_participant"("p_name" "text", "p_payment_verified" boolean, "p_reason" "text", "p_actor" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_event public.riichi_open_events%rowtype; v_status text; v_registration uuid; v_participant uuid;
begin
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found then raise exception 'Event not found'; end if;
  if v_event.stage<>'registration' then raise exception 'The playing roster is already locked'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Enter a name of up to 80 characters'; end if;
  if p_payment_verified and char_length(btrim(coalesce(p_reason,'')))<4 then raise exception 'Record why payment was manually verified'; end if;
  if (select count(*) from public.riichi_open_registration_holds h where h.event_id=v_event.id and h.status='active' and h.expires_at>now()) +
     (select count(*) from public.riichi_open_registrations r where r.event_id=v_event.id and r.status in ('pending','verified','needs_clarification')) >= v_event.capacity then raise exception 'All places are reserved'; end if;
  v_status:=case when p_payment_verified then 'verified' else 'pending' end;
  insert into public.riichi_open_registrations(event_id,display_name,status,private_note,verified_by,verified_at)
  values(v_event.id,btrim(p_name),v_status,nullif(btrim(p_reason),''),case when p_payment_verified then p_actor end,case when p_payment_verified then now() end)
  returning id into v_registration;
  insert into public.riichi_open_participants(event_id,registration_id,display_name,source)
  values(v_event.id,v_registration,btrim(p_name),'manual') returning id into v_participant;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason)
  values(v_event.id,p_actor,'add_participant','participant',v_participant::text,nullif(btrim(p_reason),''));
  return v_participant;
end $$;


ALTER FUNCTION "public"."admin_add_riichi_open_participant"("p_name" "text", "p_payment_verified" boolean, "p_reason" "text", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_certify_riichi_open_round"("p_round_id" "uuid", "p_revision" integer, "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_round public.riichi_open_rounds%rowtype; v_event public.riichi_open_events%rowtype; v_result_count integer; v_table_count integer; v_version integer; v_snapshot jsonb; v_publication uuid; v_next_stage text; v_assignments jsonb; v_round_results jsonb; v_standings jsonb; v_final jsonb; v_top_four jsonb;
begin
  select r.* into v_round from public.riichi_open_rounds r where r.id=p_round_id for update;
  if not found or v_round.status='certified' or v_round.draft_revision<>p_revision then raise exception 'Round changed or is already certified; reload before continuing'; end if;
  select e.* into v_event from public.riichi_open_events e where e.id=v_round.event_id for update;
  if v_event.stage<>v_round.round_key then raise exception 'This round is not the active event stage'; end if;
  select count(*) into v_table_count from public.riichi_open_tables where round_id=p_round_id;
  select count(*) into v_result_count from public.riichi_open_results where round_id=p_round_id;
  if v_table_count<>v_round.expected_tables or v_result_count<>v_table_count*4 then raise exception 'Every expected table needs four complete results'; end if;
  if exists(select 1 from public.riichi_open_tables t where t.round_id=p_round_id and (select count(*) from public.riichi_open_seats s where s.table_id=t.id)<>4) then raise exception 'Every table needs four distinct assigned seats'; end if;
  if exists(select 1 from public.riichi_open_tables t where t.round_id=p_round_id and (select count(*) from public.riichi_open_results r where r.table_id=t.id)<>4) then raise exception 'Every table needs four saved results'; end if;
  if exists(select 1 from public.riichi_open_tables t where t.round_id=p_round_id and (select sum(r.raw_points) from public.riichi_open_results r where r.table_id=t.id)+t.unclaimed_sticks*1000<>120000) then raise exception 'A table has invalid raw points or unclaimed sticks'; end if;
  select snapshot into v_snapshot from public.riichi_open_publications where id=v_event.current_publication_id;
  v_snapshot:=coalesce(v_snapshot,'{}'::jsonb);
  update public.riichi_open_rounds set status='certified',certified_at=now(),certified_by=p_actor where id=p_round_id;
  v_next_stage:=case v_round.round_key when 'qualifier_1' then 'qualifier_2' when 'qualifier_2' then 'final' else 'completed' end;
  update public.riichi_open_events set stage=v_next_stage,updated_at=now() where id=v_event.id;
  select jsonb_agg(jsonb_build_object('table_number',t.table_number,'seats',s.seats) order by t.table_number) into v_assignments
  from public.riichi_open_tables t cross join lateral (
    select jsonb_agg(jsonb_build_object('seat_wind',s.seat_wind,'display_name',p.display_name,'participant_id',p.id) order by case s.seat_wind when 'East' then 1 when 'South' then 2 when 'West' then 3 else 4 end) seats
    from public.riichi_open_seats s join public.riichi_open_participants p on p.id=s.participant_id where s.table_id=t.id
  ) s where t.round_id=p_round_id;
  select jsonb_agg(jsonb_build_object('table_number',t.table_number,'unclaimed_sticks',t.unclaimed_sticks,'results',s.rows) order by t.table_number) into v_round_results
  from public.riichi_open_tables t cross join lateral (
    select jsonb_agg(jsonb_build_object('participant_id',p.id,'display_name',p.display_name,'seat_wind',s.seat_wind,'raw_points',r.raw_points,'placement',r.placement,'uma',r.uma,'score',r.score) order by case s.seat_wind when 'East' then 1 when 'South' then 2 when 'West' then 3 else 4 end) rows
    from public.riichi_open_seats s join public.riichi_open_participants p on p.id=s.participant_id join public.riichi_open_results r on r.round_id=s.round_id and r.participant_id=s.participant_id where s.table_id=t.id
  ) s where t.round_id=p_round_id;
  v_snapshot:=jsonb_set(v_snapshot,'{assignments}',coalesce(v_snapshot->'assignments','{}'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,array['assignments',v_round.round_key],coalesce(v_assignments,'[]'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,'{round_results}',coalesce(v_snapshot->'round_results','{}'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,array['round_results',v_round.round_key],coalesce(v_round_results,'[]'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,'{assignment_round}',to_jsonb(v_round.round_key),true);
  v_snapshot:=jsonb_set(v_snapshot,'{stage}',to_jsonb(v_next_stage),true);
  v_snapshot:=jsonb_set(v_snapshot,'{last_certified}',to_jsonb(now()),true);
  v_snapshot:=jsonb_set(v_snapshot,'{message}',to_jsonb('Certified results are now published.'::text),true);
  if v_round.round_key in ('qualifier_1','qualifier_2') then
    with score_totals as (
      select r.participant_id,coalesce(sum(r.score) filter(where rr.round_key='qualifier_1'),0) q1,
        coalesce(sum(r.score) filter(where rr.round_key='qualifier_2'),0) q2,
        count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
      from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id and rr.round_key in ('qualifier_1','qualifier_2')
      where rr.event_id=v_event.id group by r.participant_id
    ), penalty_totals as (
      select x.participant_id,sum(x.points) penalties from public.riichi_open_penalties x join public.riichi_open_rounds rr on rr.id=x.round_id and rr.round_key in ('qualifier_1','qualifier_2') where rr.event_id=v_event.id group by x.participant_id
    ), q as (
      select p.id participant_id,p.display_name,p.is_substitute,coalesce(st.q1,0) q1,coalesce(st.q2,0) q2,coalesce(pt.penalties,0) penalties,
        coalesce(st.firsts,0) firsts,coalesce(st.fourths,0) fourths,st.best
      from public.riichi_open_participants p left join score_totals st on st.participant_id=p.id left join penalty_totals pt on pt.participant_id=p.id
      where p.event_id=v_event.id and p.active and exists(select 1 from public.riichi_open_seats s where s.participant_id=p.id and s.round_id in(select id from public.riichi_open_rounds where event_id=v_event.id and round_key in ('qualifier_1','qualifier_2')))
    ), ranked as (
      select q.*,rank() over(order by (q.q1+q.q2-q.penalties) desc,q.firsts desc,q.fourths asc,q.best desc) rank_no,
        row_number() over(order by (q.q1+q.q2-q.penalties) desc,q.firsts desc,q.fourths asc,q.best desc,coalesce((select array_position(d.order_ids,q.participant_id) from public.riichi_open_tie_draws d where d.round_id=(select id from public.riichi_open_rounds where event_id=v_event.id and round_key=v_round.round_key) and d.participant_ids @> array[q.participant_id]::uuid[] limit 1),999)) seed
      from q
    ) select jsonb_agg(jsonb_build_object('rank',rank_no,'participant_id',participant_id,'display_name',display_name,'qualifier_1',q1,'qualifier_2',case when v_round.round_key='qualifier_1' then null else q2 end,'penalties',penalties,'total',q1+q2-penalties,'seed',null,'is_substitute',is_substitute) order by seed) into v_standings from ranked;
    v_snapshot:=jsonb_set(v_snapshot,'{standings}',coalesce(v_standings,'[]'::jsonb),true);
    if v_round.round_key='qualifier_2' then
      v_snapshot:=jsonb_set(v_snapshot,'{top_four}','[]'::jsonb,true);
    end if;
  else
    with final_scores as (
      select p.id participant_id,p.display_name,r.score-coalesce(sum(x.points),0) score,coalesce(p.qualification_seed,99) seed
      from public.riichi_open_participants p join public.riichi_open_results r on r.participant_id=p.id and r.round_id=p_round_id
      left join public.riichi_open_penalties x on x.participant_id=p.id and x.round_id=p_round_id
      where p.event_id=v_event.id group by p.id,p.display_name,r.score
    ), ranked as(select *,row_number() over(order by score desc,seed asc) rank_no from final_scores)
    select jsonb_agg(jsonb_build_object('rank',rank_no,'participant_id',participant_id,'display_name',display_name,'score',score,'seed',seed) order by rank_no) into v_final from ranked;
    v_snapshot:=jsonb_set(v_snapshot,'{final}',coalesce(v_final,'[]'::jsonb),true);
    v_snapshot:=jsonb_set(v_snapshot,'{champion}',coalesce(v_final->0->'display_name','null'::jsonb),true);
  end if;
  select coalesce(max(version),0)+1 into v_version from public.riichi_open_publications where event_id=v_event.id;
  insert into public.riichi_open_publications(event_id,version,snapshot,created_by) values(v_event.id,v_version,v_snapshot,p_actor) returning id into v_publication;
  update public.riichi_open_events set current_publication_id=v_publication where id=v_event.id;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details) values(v_event.id,p_actor,'certify_round','round',p_round_id::text,jsonb_build_object('round',v_round.round_key,'version',v_version));
  return jsonb_build_object('version',v_version,'next_stage',v_next_stage);
end $$;


ALTER FUNCTION "public"."admin_certify_riichi_open_round"("p_round_id" "uuid", "p_revision" integer, "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_generate_riichi_open_q1"("p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_event public.riichi_open_events%rowtype; v_round uuid; v_count integer; v_tables integer;
begin
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found or v_event.stage<>'registration' then raise exception 'The first qualifier can only start during registration setup'; end if;
  select count(*) into v_count from public.riichi_open_participants p
  join public.riichi_open_registrations r on r.id=p.registration_id
  where p.event_id=v_event.id and p.active and p.checked_in and r.status='verified';
  if v_count<4 or v_count>16 or v_count%4<>0 then raise exception 'Check in 4, 8, 12 or 16 verified players before drawing tables'; end if;
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


ALTER FUNCTION "public"."admin_generate_riichi_open_q1"("p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_prepare_riichi_open_round"("p_round_key" "text", "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
      select r.participant_id,sum(r.score) score,count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
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


ALTER FUNCTION "public"."admin_prepare_riichi_open_round"("p_round_key" "text", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_record_riichi_open_penalty"("p_round_id" "uuid", "p_participant_id" "uuid", "p_points" numeric, "p_reason" "text", "p_revision" integer, "p_actor" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_round public.riichi_open_rounds%rowtype; v_revision integer;
begin
  select * into v_round from public.riichi_open_rounds where id=p_round_id for update;
  if not found or v_round.status='certified' or v_round.draft_revision<>p_revision then raise exception 'Round changed or is certified; reload before editing'; end if;
  if p_points<0 or p_points>9999 or p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'Enter a penalty and its reason'; end if;
  if not exists(select 1 from public.riichi_open_participants where id=p_participant_id and event_id=v_round.event_id) then raise exception 'Participant is not in this event'; end if;
  insert into public.riichi_open_penalties(event_id,round_id,participant_id,points,reason,recorded_by) values(v_round.event_id,v_round.id,p_participant_id,p_points,btrim(p_reason),p_actor);
  update public.riichi_open_rounds set draft_revision=draft_revision+1 where id=v_round.id returning draft_revision into v_revision;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason,details) values(v_round.event_id,p_actor,'record_penalty','participant',p_participant_id::text,btrim(p_reason),jsonb_build_object('points',p_points,'round',v_round.round_key));
  return v_revision;
end $$;


ALTER FUNCTION "public"."admin_record_riichi_open_penalty"("p_round_id" "uuid", "p_participant_id" "uuid", "p_points" numeric, "p_reason" "text", "p_revision" integer, "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_record_riichi_open_tie_draw"("p_round_id" "uuid", "p_participant_ids" "uuid"[], "p_order_ids" "uuid"[], "p_note" "text", "p_actor" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_round public.riichi_open_rounds%rowtype; v_event public.riichi_open_events%rowtype; v_count integer; v_snapshot jsonb; v_version integer; v_publication uuid; v_tie_draws jsonb;
begin
  select * into v_round from public.riichi_open_rounds where id=p_round_id and round_key in ('qualifier_1','qualifier_2') for update;
  if not found or v_round.status<>'certified' then raise exception 'Record a draw for a certified qualifying round'; end if;
  if cardinality(p_participant_ids)<2 or cardinality(p_participant_ids)<>cardinality(p_order_ids) or cardinality(p_participant_ids)>16 or char_length(btrim(coalesce(p_note,'')))<8 then raise exception 'Enter the tied players, draw order and a public note'; end if;
  if (select count(distinct selected.participant_id) from unnest(p_participant_ids) as selected(participant_id))<>cardinality(p_participant_ids) or (select count(distinct selected.participant_id) from unnest(p_order_ids) as selected(participant_id))<>cardinality(p_order_ids) then raise exception 'Each tied player must appear once'; end if;
  if exists(select 1 from unnest(p_participant_ids) as selected(participant_id) where not selected.participant_id=any(p_order_ids)) or exists(select 1 from unnest(p_order_ids) as selected(participant_id) where not selected.participant_id=any(p_participant_ids)) then raise exception 'The draw order must include exactly the tied players'; end if;
  if exists(select 1 from unnest(p_participant_ids) as selected(participant_id) where not exists(select 1 from public.riichi_open_results r where r.round_id=p_round_id and r.participant_id=selected.participant_id)) then raise exception 'A selected player is not in this round'; end if;
  if (select count(distinct (score,firsts,fourths,best)) from (
    select sum(r.score)-coalesce((select sum(x.points) from public.riichi_open_penalties x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=r.participant_id and xr.event_id=v_round.event_id and xr.round_key in ('qualifier_1','qualifier_2') and (v_round.round_key='qualifier_2' or xr.round_key='qualifier_1')),0) score,
      count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
    from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id
    where r.participant_id=any(p_participant_ids) and rr.event_id=v_round.event_id and rr.round_key in ('qualifier_1','qualifier_2') and (v_round.round_key='qualifier_2' or rr.round_key='qualifier_1')
    group by r.participant_id
  ) metrics)<>1 then raise exception 'Selected players do not share the same qualifying tie-break values'; end if;
  select count(*) into v_count from public.riichi_open_tie_draws where round_id=p_round_id and participant_ids @> p_participant_ids and cardinality(participant_ids)=cardinality(p_participant_ids);
  if v_count>0 then raise exception 'A draw order has already been recorded for this group'; end if;
  insert into public.riichi_open_tie_draws(event_id,round_id,participant_ids,order_ids,public_note,recorded_by) values(v_round.event_id,v_round.id,p_participant_ids,p_order_ids,btrim(p_note),p_actor);
  select * into v_event from public.riichi_open_events where id=v_round.event_id for update;
  select snapshot into v_snapshot from public.riichi_open_publications where id=v_event.current_publication_id;
  select jsonb_agg(jsonb_build_object('round',rr.round_key,'players',players.names,'public_note',d.public_note,'recorded_at',d.created_at) order by d.created_at)
    into v_tie_draws
    from public.riichi_open_tie_draws d join public.riichi_open_rounds rr on rr.id=d.round_id
    cross join lateral (select jsonb_agg(jsonb_build_object('participant_id',p.id,'display_name',p.display_name) order by item.position) names
      from unnest(d.order_ids) with ordinality as item(participant_id,position) join public.riichi_open_participants p on p.id=item.participant_id) players
    where d.event_id=v_event.id;
  v_snapshot:=jsonb_set(coalesce(v_snapshot,'{}'::jsonb),'{tie_draws}',coalesce(v_tie_draws,'[]'::jsonb),true);
  select coalesce(max(version),0)+1 into v_version from public.riichi_open_publications where event_id=v_event.id;
  insert into public.riichi_open_publications(event_id,version,snapshot,created_by) values(v_event.id,v_version,v_snapshot,p_actor) returning id into v_publication;
  update public.riichi_open_events set current_publication_id=v_publication,updated_at=now() where id=v_event.id;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason) values(v_round.event_id,p_actor,'record_tie_draw','round',p_round_id::text,btrim(p_note));
end $$;


ALTER FUNCTION "public"."admin_record_riichi_open_tie_draw"("p_round_id" "uuid", "p_participant_ids" "uuid"[], "p_order_ids" "uuid"[], "p_note" "text", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_riichi_open_registration_status"("p_registration_id" "uuid", "p_status" "text", "p_note" "text", "p_actor" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    if public.riichi_open_has_active_recovery_claim(v_registration.id) then
      raise exception 'A related registration already holds or uses this place; cancel or review it first';
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


ALTER FUNCTION "public"."admin_set_riichi_open_registration_status"("p_registration_id" "uuid", "p_status" "text", "p_note" "text", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_riichi_open_registration_status"("p_registration_id" "uuid", "p_status" "text", "p_note" "text", "p_expected_note" "text", "p_actor" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."admin_set_riichi_open_registration_status"("p_registration_id" "uuid", "p_status" "text", "p_note" "text", "p_expected_note" "text", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_riichi_open_participant"("p_event_id" "uuid", "p_participant_id" "uuid", "p_patch" "jsonb", "p_expected" "jsonb", "p_actor" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."admin_update_riichi_open_participant"("p_event_id" "uuid", "p_participant_id" "uuid", "p_patch" "jsonb", "p_expected" "jsonb", "p_actor" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_riichi_open_place"("p_hold_id" "uuid", "p_token_hash" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.riichi_open_registration_holds set status='cancelled'
  where id=p_hold_id and token_hash=p_token_hash and status in ('active','expired');
  if not found then raise exception 'This reservation is already submitted or has been released'; end if;
end $$;


ALTER FUNCTION "public"."cancel_riichi_open_place"("p_hold_id" "uuid", "p_token_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."copy_riichi_open_restart_link"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.hold_id is not null then
    select h.restarts_registration_id into new.restarted_from_registration_id
    from public.riichi_open_registration_holds h where h.id=new.hold_id;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."copy_riichi_open_restart_link"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_riichi_match"("p_match_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_event_date date;
begin
  select w.event_date
    into v_event_date
    from public.riichi_league_matches m
    join public.riichi_league_weeks w on w.id = m.week_id
    where m.id = p_match_id
    for update of m;

  if v_event_date is null then
    raise exception 'League table not found' using errcode = '22023';
  end if;

  if (current_timestamp at time zone 'Asia/Kuala_Lumpur')::date > v_event_date + 3 then
    raise exception 'Results can only be deleted within three days after the session' using errcode = '22023';
  end if;

  delete from public.riichi_league_matches where id = p_match_id;
  return true;
end;
$$;


ALTER FUNCTION "public"."delete_riichi_match"("p_match_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_riichi_match"("p_match_id" "text") IS 'Deletes one full table result within three calendar days after its session date.';



CREATE OR REPLACE FUNCTION "public"."enforce_riichi_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.status = 'CONFIRMED'
     and (tg_op = 'INSERT' or old.status is distinct from 'CONFIRMED')
     and (select count(*) from public.riichi_attendees where status = 'CONFIRMED') >= 12 then
    raise exception 'Riichimania is full: 12 seats are already confirmed';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_riichi_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_riichi_open_registration"("p_hold_id" "uuid", "p_token_hash" "text", "p_display_name" "text", "p_receipt_upload_path" "text", "p_receipt_path" "text", "p_receipt_mime" "text", "p_receipt_size" integer, "p_receipt_sha256" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_event_id uuid;
  v_event public.riichi_open_events%rowtype;
  v_hold public.riichi_open_registration_holds%rowtype;
  v_registration public.riichi_open_registrations%rowtype;
  v_status text;
begin
  select event_id into v_event_id
  from public.riichi_open_registration_holds
  where id=p_hold_id and token_hash=p_token_hash;
  if not found then raise exception 'This registration session could not be confirmed' using errcode='P0001'; end if;

  select * into v_event from public.riichi_open_events where id=v_event_id for update;
  if not found then raise exception 'Event not found'; end if;

  select * into v_hold from public.riichi_open_registration_holds
  where id=p_hold_id and event_id=v_event.id and token_hash=p_token_hash for update;
  if not found then raise exception 'This registration session could not be confirmed' using errcode='P0001'; end if;

  select * into v_registration from public.riichi_open_registrations where hold_id=v_hold.id;
  if found then
    return jsonb_build_object('id',v_registration.id,'status',v_registration.status,'submitted_at',v_registration.submitted_at);
  end if;
  if v_hold.status not in ('active','expired') then raise exception 'This place reservation is no longer active' using errcode='P0001'; end if;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 80 then raise exception 'Enter a name of up to 80 characters' using errcode='22023'; end if;
  if v_hold.receipt_path is distinct from p_receipt_upload_path then raise exception 'Receipt upload path does not match this reservation' using errcode='22023'; end if;
  if p_receipt_path is null or p_receipt_path not like (v_event.id::text||'/'||v_hold.id::text||'/%')
    or p_receipt_path=p_receipt_upload_path then raise exception 'Final receipt path is invalid' using errcode='22023'; end if;
  if p_receipt_mime not in ('image/jpeg','image/png','application/pdf') or p_receipt_size not between 1 and 5242880 then raise exception 'Receipt file is not accepted' using errcode='22023'; end if;

  v_status := case when v_hold.status='active' and v_hold.expires_at>now() and v_event.registration_open and v_event.stage='registration' then 'pending' else 'payment_exception' end;
  insert into public.riichi_open_registrations(event_id,hold_id,display_name,status,receipt_path,receipt_mime,receipt_size,receipt_sha256)
  values(v_event.id,v_hold.id,btrim(p_display_name),v_status,p_receipt_path,p_receipt_mime,p_receipt_size,p_receipt_sha256) returning * into v_registration;
  update public.riichi_open_registration_holds set status='submitted',receipt_path=p_receipt_path where id=v_hold.id;
  if v_status='pending' then
    insert into public.riichi_open_participants(event_id,registration_id,display_name) values(v_event.id,v_registration.id,btrim(p_display_name));
  end if;
  return jsonb_build_object('id',v_registration.id,'status',v_registration.status,'submitted_at',v_registration.submitted_at);
end $$;


ALTER FUNCTION "public"."finalize_riichi_open_registration"("p_hold_id" "uuid", "p_token_hash" "text", "p_display_name" "text", "p_receipt_upload_path" "text", "p_receipt_path" "text", "p_receipt_mime" "text", "p_receipt_size" integer, "p_receipt_sha256" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_visitor_count"("p_day" "date") RETURNS bigint
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select count(*)::bigint
  from public.visitors
  where (visited_at at time zone 'Asia/Kuala_Lumpur')::date = p_day;
$$;


ALTER FUNCTION "public"."get_daily_visitor_count"("p_day" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_riichi_confirmed_attendees"() RETURNS TABLE("id" bigint, "name" character varying)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select id, name
  from public.riichi_attendees
  where status = 'CONFIRMED'
  order by created_at asc, id asc;
$$;


ALTER FUNCTION "public"."get_riichi_confirmed_attendees"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_riichi_confirmed_count"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(*)::integer from public.riichi_attendees where status = 'CONFIRMED';
$$;


ALTER FUNCTION "public"."get_riichi_confirmed_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_riichi_pending_count"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(*)::integer from public.riichi_attendees where status = 'PENDING';
$$;


ALTER FUNCTION "public"."get_riichi_pending_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_unique_visitors"() RETURNS bigint
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select count(distinct visitor_id)::bigint from visitors;
$$;


ALTER FUNCTION "public"."get_total_unique_visitors"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_riichi_open_assignments"("p_round_id" "uuid", "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_round public.riichi_open_rounds%rowtype; v_event public.riichi_open_events%rowtype; v_version integer; v_snapshot jsonb; v_assignments jsonb; v_publication uuid; v_top_four jsonb;
begin
  select r.* into v_round from public.riichi_open_rounds r where r.id=p_round_id for update;
  if not found or v_round.status='certified' then raise exception 'Only active round seating can be published'; end if;
  select e.* into v_event from public.riichi_open_events e where e.id=v_round.event_id for update;
  if exists(select 1 from public.riichi_open_tables t where t.round_id=v_round.id and (select count(*) from public.riichi_open_seats s where s.table_id=t.id)<>4) then raise exception 'Each published table needs four assigned seats'; end if;
  select jsonb_agg(jsonb_build_object('table_number',t.table_number,'seats',s.seats) order by t.table_number) into v_assignments
  from public.riichi_open_tables t cross join lateral (
    select jsonb_agg(jsonb_build_object('seat_wind',s.seat_wind,'display_name',p.display_name,'participant_id',p.id) order by case s.seat_wind when 'East' then 1 when 'South' then 2 when 'West' then 3 else 4 end) seats
    from public.riichi_open_seats s join public.riichi_open_participants p on p.id=s.participant_id where s.table_id=t.id
  ) s where t.round_id=v_round.id;
  select coalesce(max(version),0)+1 into v_version from public.riichi_open_publications where event_id=v_event.id;
  select snapshot into v_snapshot from public.riichi_open_publications where id=v_event.current_publication_id;
  v_snapshot:=coalesce(v_snapshot,'{}'::jsonb);
  v_snapshot:=jsonb_set(v_snapshot,'{assignments}',coalesce(v_snapshot->'assignments','{}'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,array['assignments',v_round.round_key],coalesce(v_assignments,'[]'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,'{assignment_round}',to_jsonb(v_round.round_key),true);
  v_snapshot:=jsonb_set(v_snapshot,'{stage}',to_jsonb(v_event.stage),true);
  v_snapshot:=jsonb_set(v_snapshot,'{last_certified}',coalesce(v_snapshot->'last_certified','null'::jsonb),true);
  if v_round.round_key='final' then
    select jsonb_agg(jsonb_build_object('participant_id',p.id,'display_name',p.display_name,'seed',p.qualification_seed) order by p.qualification_seed) into v_top_four
    from public.riichi_open_participants p where p.event_id=v_event.id and p.qualification_seed is not null and p.qualification_seed<=4;
    v_snapshot:=jsonb_set(v_snapshot,'{top_four}',coalesce(v_top_four,'[]'::jsonb),true);
  end if;
  insert into public.riichi_open_publications(event_id,version,snapshot,created_by) values(v_event.id,v_version,v_snapshot,p_actor) returning id into v_publication;
  update public.riichi_open_events set current_publication_id=v_publication,updated_at=now() where id=v_event.id;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details) values(v_event.id,p_actor,'publish_seating','round',v_round.id::text,jsonb_build_object('version',v_version,'round',v_round.round_key));
  return jsonb_build_object('version',v_version);
end $$;


ALTER FUNCTION "public"."publish_riichi_open_assignments"("p_round_id" "uuid", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_riichi_open_place"("p_token_hash" "text", "p_idempotency_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."reserve_riichi_open_place"("p_token_hash" "text", "p_idempotency_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_riichi_open_place"("p_token_hash" "text", "p_idempotency_key" "text", "p_client_fingerprint" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
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
end $_$;


ALTER FUNCTION "public"."reserve_riichi_open_place"("p_token_hash" "text", "p_idempotency_key" "text", "p_client_fingerprint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restart_cancelled_riichi_open_registration"("p_registration_id" "uuid", "p_previous_token_hash" "text", "p_new_token_hash" "text", "p_idempotency_key" "text", "p_client_fingerprint" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
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

  if public.riichi_open_has_active_recovery_claim(v_registration.id) then
    raise exception 'A related registration already holds or uses this place; restore or review it first';
  end if;
  if exists(select 1 from public.riichi_open_registrations r
            where r.restarted_from_registration_id=v_registration.id) then
    raise exception 'A new registration has already been submitted for this cancellation';
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
end $_$;


ALTER FUNCTION "public"."restart_cancelled_riichi_open_registration"("p_registration_id" "uuid", "p_previous_token_hash" "text", "p_new_token_hash" "text", "p_idempotency_key" "text", "p_client_fingerprint" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."riichi_open_has_active_recovery_claim"("p_registration_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with recursive edges(source_id,target_id) as (
    select r.id,r.restarted_from_registration_id
    from public.riichi_open_registrations r
    where r.restarted_from_registration_id is not null
    union all
    select r.restarted_from_registration_id,r.id
    from public.riichi_open_registrations r
    where r.restarted_from_registration_id is not null
  ), family(id) as (
    select p_registration_id
    union
    select e.target_id from edges e join family f on f.id=e.source_id
  )
  select exists(
    select 1 from public.riichi_open_registrations r
    join family f on f.id=r.id
    where r.id<>p_registration_id
      and r.status in ('pending','verified','needs_clarification')
  ) or exists(
    select 1 from public.riichi_open_registration_holds h
    join family f on f.id=h.restarts_registration_id
    where h.event_id=(select r.event_id from public.riichi_open_registrations r where r.id=p_registration_id)
      and h.status='active' and h.expires_at>now()
  )
$$;


ALTER FUNCTION "public"."riichi_open_has_active_recovery_claim"("p_registration_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_riichi_open_table_results"("p_round_id" "uuid", "p_table_id" "uuid", "p_revision" integer, "p_sticks" integer, "p_results" "jsonb", "p_actor" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare v_round public.riichi_open_rounds%rowtype; v_event uuid; v_count integer; v_revision integer;
begin
  select r.* into v_round from public.riichi_open_rounds r where r.id=p_round_id for update;
  if not found or v_round.status='certified' or v_round.draft_revision<>p_revision then raise exception 'Round changed or is certified; reload before editing' using errcode='P0001'; end if;
  v_event:=v_round.event_id;
  if not exists(select 1 from public.riichi_open_events where id=v_event and stage=v_round.round_key) then raise exception 'This is not the active tournament round'; end if;
  if p_sticks<0 or p_sticks>100 or jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)<>4 then raise exception 'Enter four player scores and valid unclaimed sticks' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_results) a where coalesce(a->>'participant_id','')='' or coalesce(a->>'raw_points','') !~ '^-?[0-9]+$') then raise exception 'Each result needs a participant and integer raw points' using errcode='22023'; end if;
  if (select count(distinct a->>'participant_id') from jsonb_array_elements(p_results) a)<>4 then raise exception 'A participant can appear only once at a table' using errcode='22023'; end if;
  if (select sum((a->>'raw_points')::integer) from jsonb_array_elements(p_results) a)+p_sticks*1000<>120000 then raise exception 'Raw points and unclaimed riichi sticks must total 120,000' using errcode='22023'; end if;
  if not exists(select 1 from public.riichi_open_tables t where t.id=p_table_id and t.round_id=p_round_id) then raise exception 'Table not found in this round' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_results) a left join public.riichi_open_seats s on s.round_id=p_round_id and s.table_id=p_table_id and s.participant_id=(a->>'participant_id')::uuid where s.participant_id is null) then raise exception 'All four participants must be assigned to this table' using errcode='22023'; end if;
  delete from public.riichi_open_results where table_id=p_table_id;
  with input as (
    select (a->>'participant_id')::uuid participant_id,(a->>'raw_points')::integer raw_points
    from jsonb_array_elements(p_results) a
  ), ranked as (
    select i.*,rank() over(order by raw_points desc)::integer place,
      count(*) over(partition by raw_points)::integer tie_count,
      max(raw_points) over() max_points,min(raw_points) over() min_points
    from input i
  ), scored as (
    select r.*,
      (select avg(u.value::numeric) from generate_series(r.place,r.place+r.tie_count-1) as positions(position)
       join unnest(array[15,5,-5,-15]) with ordinality as u(value,position) on u.position=positions.position) shared_uma
    from ranked r
  )
  insert into public.riichi_open_results(event_id,round_id,table_id,participant_id,raw_points,placement,uma,score,first_place,fourth_place)
    select v_event,p_round_id,p_table_id,participant_id,raw_points,place,shared_uma,
      (raw_points-30000)::numeric/1000+shared_uma,raw_points=max_points,raw_points=min_points from scored;
  update public.riichi_open_tables set unclaimed_sticks=p_sticks where id=p_table_id;
  update public.riichi_open_rounds set status='active',draft_revision=draft_revision+1,started_at=coalesce(started_at,now()) where id=p_round_id returning draft_revision into v_revision;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details) values(v_event,p_actor,'save_results','table',p_table_id::text,jsonb_build_object('revision',v_revision));
  return v_revision;
end $_$;


ALTER FUNCTION "public"."save_riichi_open_table_results"("p_round_id" "uuid", "p_table_id" "uuid", "p_revision" integer, "p_sticks" integer, "p_results" "jsonb", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_riichi_match"("p_week_id" "text", "p_results" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_season_id text;
  v_event_date date;
  v_match_id text;
  v_expected_table_sizes smallint[];
  v_result_count integer;
  v_table_number integer;
  v_result jsonb;
  v_player_name text;
begin
  if jsonb_typeof(p_results) is distinct from 'array' then
    raise exception 'Results must be an array' using errcode = '22023';
  end if;

  v_result_count := jsonb_array_length(p_results);
  if v_result_count not in (3, 4) then
    raise exception 'Submit exactly three or four player results' using errcode = '22023';
  end if;

  select w.season_id, w.event_date, s.supported_table_sizes
    into v_season_id, v_event_date, v_expected_table_sizes
    from public.riichi_league_weeks w
    join public.riichi_league_seasons s on s.id = w.season_id
    where w.id = p_week_id
    for update of w;

  if v_season_id is null then
    raise exception 'League week not found' using errcode = '22023';
  end if;

  if (current_timestamp at time zone 'Asia/Kuala_Lumpur')::date < v_event_date then
    raise exception 'Results can only be submitted on or after the session date' using errcode = '22023';
  end if;

  if (current_timestamp at time zone 'Asia/Kuala_Lumpur')::date > v_event_date + 3 then
    raise exception 'Results can only be submitted within three days after the session' using errcode = '22023';
  end if;

  if not (v_expected_table_sizes @> array[v_result_count::smallint]) then
    raise exception 'Table size is not supported for this season' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_results) r
      where coalesce(btrim(r->>'player_name'), '') = ''
        or char_length(btrim(r->>'player_name')) > 80
        or coalesce(r->>'final_points', '') !~ '^-?[0-9]+$'
  ) then
    raise exception 'Each result needs a player name and integer final points' using errcode = '22023';
  end if;

  if (select count(distinct lower(btrim(r->>'player_name'))) from jsonb_array_elements(p_results) r) <> v_result_count then
    raise exception 'A player can appear only once at a table' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_results) r
    where (r->>'final_points')::integer < -50000
      or (r->>'final_points')::integer > 200000
  ) then
    raise exception 'Final points are outside the allowed range' using errcode = '22023';
  end if;

  for v_result in select value from jsonb_array_elements(p_results)
  loop
    v_player_name := btrim(v_result->>'player_name');
    insert into public.riichi_league_players (season_id, id, display_name)
      values (v_season_id, gen_random_uuid()::text, v_player_name)
      on conflict do nothing;
  end loop;

  select coalesce(max(table_number), 0) + 1
    into v_table_number
    from public.riichi_league_matches
    where week_id = p_week_id;

  v_match_id := gen_random_uuid()::text;
  insert into public.riichi_league_matches (id, season_id, week_id, table_number, table_size)
    values (v_match_id, v_season_id, p_week_id, v_table_number, v_result_count);

  insert into public.riichi_league_results (season_id, match_id, player_id, final_points, placement, seat_wind)
  select
    v_season_id,
    v_match_id,
    p.id,
    (r.value->>'final_points')::integer,
    row_number() over (order by (r.value->>'final_points')::integer desc, r.ordinality)::smallint,
    (array['east', 'south', 'west', 'north'])[r.ordinality::integer]
  from jsonb_array_elements(p_results) with ordinality as r(value, ordinality)
  join public.riichi_league_players p
    on p.season_id = v_season_id
    and lower(btrim(p.display_name)) = lower(btrim(r.value->>'player_name'));

  return v_table_number;
end;
$_$;


ALTER FUNCTION "public"."submit_riichi_match"("p_week_id" "text", "p_results" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."submit_riichi_match"("p_week_id" "text", "p_results" "jsonb") IS 'Accepts anonymous full-table scores within three calendar days after the session date, assigns seats in East/South/West/North order, creates unseen players, assigns a table number, and breaks equal-point ties by seat order.';



CREATE OR REPLACE FUNCTION "public"."update_riichi_match"("p_match_id" "text", "p_results" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_season_id text;
  v_week_id text;
  v_event_date date;
  v_expected_table_sizes smallint[];
  v_result_count integer;
  v_table_number integer;
  v_result jsonb;
  v_player_name text;
begin
  if jsonb_typeof(p_results) is distinct from 'array' then
    raise exception 'Results must be an array' using errcode = '22023';
  end if;

  v_result_count := jsonb_array_length(p_results);
  if v_result_count not in (3, 4) then
    raise exception 'Submit exactly three or four player results' using errcode = '22023';
  end if;

  select m.season_id, m.week_id, m.table_number, w.event_date, s.supported_table_sizes
    into v_season_id, v_week_id, v_table_number, v_event_date, v_expected_table_sizes
    from public.riichi_league_matches m
    join public.riichi_league_weeks w on w.id = m.week_id
    join public.riichi_league_seasons s on s.id = m.season_id
    where m.id = p_match_id
    for update of m;

  if v_season_id is null then
    raise exception 'League table not found' using errcode = '22023';
  end if;

  if (current_timestamp at time zone 'Asia/Kuala_Lumpur')::date < v_event_date then
    raise exception 'Results can only be edited on or after the session date' using errcode = '22023';
  end if;

  if (current_timestamp at time zone 'Asia/Kuala_Lumpur')::date > v_event_date + 3 then
    raise exception 'Results can only be edited within three days after the session' using errcode = '22023';
  end if;

  if not (v_expected_table_sizes @> array[v_result_count::smallint]) then
    raise exception 'Table size is not supported for this season' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_results) r
      where coalesce(btrim(r->>'player_name'), '') = ''
        or char_length(btrim(r->>'player_name')) > 80
        or coalesce(r->>'final_points', '') !~ '^-?[0-9]+$'
  ) then
    raise exception 'Each result needs a player name and integer final points' using errcode = '22023';
  end if;

  if (select count(distinct lower(btrim(r->>'player_name'))) from jsonb_array_elements(p_results) r) <> v_result_count then
    raise exception 'A player can appear only once at a table' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_results) r
    where (r->>'final_points')::integer < -50000
      or (r->>'final_points')::integer > 200000
  ) then
    raise exception 'Final points are outside the allowed range' using errcode = '22023';
  end if;

  for v_result in select value from jsonb_array_elements(p_results)
  loop
    v_player_name := btrim(v_result->>'player_name');
    insert into public.riichi_league_players (season_id, id, display_name)
      values (v_season_id, gen_random_uuid()::text, v_player_name)
      on conflict do nothing;
  end loop;

  delete from public.riichi_league_results where match_id = p_match_id;
  update public.riichi_league_matches set table_size = v_result_count where id = p_match_id;

  insert into public.riichi_league_results (season_id, match_id, player_id, final_points, placement, seat_wind)
  select
    v_season_id,
    p_match_id,
    p.id,
    (r.value->>'final_points')::integer,
    row_number() over (order by (r.value->>'final_points')::integer desc, r.ordinality)::smallint,
    (array['east', 'south', 'west', 'north'])[r.ordinality::integer]
  from jsonb_array_elements(p_results) with ordinality as r(value, ordinality)
  join public.riichi_league_players p
    on p.season_id = v_season_id
    and lower(btrim(p.display_name)) = lower(btrim(r.value->>'player_name'));

  return v_table_number;
end;
$_$;


ALTER FUNCTION "public"."update_riichi_match"("p_match_id" "text", "p_results" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_riichi_match"("p_match_id" "text", "p_results" "jsonb") IS 'Replaces one full table result within three calendar days after its session date, recalculating placements and seats from submitted order.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attendees" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_id" bigint NOT NULL,
    "name" character varying NOT NULL,
    "bringing_games" character varying,
    "amount_spent" numeric,
    "eta" time without time zone,
    "notes" character varying
);


ALTER TABLE "public"."attendees" OWNER TO "postgres";


ALTER TABLE "public"."attendees" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."attendees_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."birthday_greetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "birth_month" smallint NOT NULL,
    "birth_day" smallint NOT NULL,
    "allow_public_greeting" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "birthday_greetings_month_range" CHECK ((("birth_month" >= 1) AND ("birth_month" <= 12))),
    CONSTRAINT "birthday_greetings_name_length" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 80))),
    CONSTRAINT "birthday_greetings_valid_day" CHECK ((("birth_day" >= 1) AND ("birth_day" <=
CASE
    WHEN ("birth_month" = 2) THEN 29
    WHEN ("birth_month" = ANY (ARRAY[4, 6, 9, 11])) THEN 30
    ELSE 31
END)))
);


ALTER TABLE "public"."birthday_greetings" OWNER TO "postgres";


COMMENT ON TABLE "public"."birthday_greetings" IS 'Private birthday submissions collected through the Saujana BGC birthday page.';



COMMENT ON COLUMN "public"."birthday_greetings"."allow_public_greeting" IS 'Explicit permission to greet the person by their submitted name on Instagram and community channels.';



CREATE TABLE IF NOT EXISTS "public"."chatbot_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_query" "text" NOT NULL,
    "response" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chatbot_log_response_check" CHECK (("char_length"(TRIM(BOTH FROM "response")) > 0)),
    CONSTRAINT "chatbot_log_user_query_check" CHECK (("char_length"(TRIM(BOTH FROM "user_query")) > 0))
);


ALTER TABLE "public"."chatbot_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "venue" character varying NOT NULL,
    "time" character varying NOT NULL,
    "venue_url" character varying NOT NULL,
    "name" character varying NOT NULL,
    "date" "date" NOT NULL,
    "description" character varying
);


ALTER TABLE "public"."events" OWNER TO "postgres";


ALTER TABLE "public"."events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."playlog" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "game" character varying NOT NULL,
    "date" "date" NOT NULL,
    "players" "text"
);


ALTER TABLE "public"."playlog" OWNER TO "postgres";


ALTER TABLE "public"."playlog" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."playlog_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."riichi_attendees" (
    "id" bigint NOT NULL,
    "name" character varying(120) NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    "file" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "riichi_attendees_name_check" CHECK (("char_length"("btrim"(("name")::"text")) > 0)),
    CONSTRAINT "riichi_attendees_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying])::"text"[])))
);


ALTER TABLE "public"."riichi_attendees" OWNER TO "postgres";


ALTER TABLE "public"."riichi_attendees" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."riichi_attendees_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."riichi_league_matches" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "season_id" "text" NOT NULL,
    "week_id" "text" NOT NULL,
    "table_number" integer NOT NULL,
    "table_size" smallint NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "riichi_league_matches_table_number_check" CHECK (("table_number" > 0)),
    CONSTRAINT "riichi_league_matches_table_size_check" CHECK (("table_size" = ANY (ARRAY[3, 4])))
);


ALTER TABLE "public"."riichi_league_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_league_players" (
    "season_id" "text" NOT NULL,
    "id" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    CONSTRAINT "riichi_league_players_display_name_check" CHECK ((("char_length"("btrim"("display_name")) >= 1) AND ("char_length"("btrim"("display_name")) <= 80)))
);


ALTER TABLE "public"."riichi_league_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_league_results" (
    "season_id" "text" NOT NULL,
    "match_id" "text" NOT NULL,
    "player_id" "text" NOT NULL,
    "final_points" integer NOT NULL,
    "placement" smallint NOT NULL,
    "seat_wind" "text",
    CONSTRAINT "riichi_league_results_final_points_check" CHECK ((("final_points" >= '-50000'::integer) AND ("final_points" <= 200000))),
    CONSTRAINT "riichi_league_results_placement_check" CHECK ((("placement" >= 1) AND ("placement" <= 4))),
    CONSTRAINT "riichi_league_results_seat_wind_check" CHECK ((("seat_wind" IS NULL) OR ("seat_wind" = ANY (ARRAY['east'::"text", 'south'::"text", 'west'::"text", 'north'::"text"]))))
);


ALTER TABLE "public"."riichi_league_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_league_seasons" (
    "id" "text" NOT NULL,
    "season_number" integer NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" NOT NULL,
    "total_weeks" integer NOT NULL,
    "best_results_count" integer NOT NULL,
    "supported_table_sizes" smallint[] NOT NULL,
    "scoring" "jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "riichi_league_seasons_best_results_count_check" CHECK (("best_results_count" > 0)),
    CONSTRAINT "riichi_league_seasons_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "riichi_league_seasons_season_number_check" CHECK (("season_number" > 0)),
    CONSTRAINT "riichi_league_seasons_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'active'::"text", 'completed'::"text"]))),
    CONSTRAINT "riichi_league_seasons_total_weeks_check" CHECK (("total_weeks" > 0))
);


ALTER TABLE "public"."riichi_league_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_league_weeks" (
    "id" "text" NOT NULL,
    "season_id" "text" NOT NULL,
    "week_number" integer NOT NULL,
    "event_date" "date" NOT NULL,
    "status" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "riichi_league_weeks_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'scheduled'::"text", 'active'::"text", 'completed'::"text"]))),
    CONSTRAINT "riichi_league_weeks_week_number_check" CHECK (("week_number" > 0))
);


ALTER TABLE "public"."riichi_league_weeks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_audit_log" (
    "id" bigint NOT NULL,
    "event_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "reason" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."riichi_open_audit_log" OWNER TO "postgres";


ALTER TABLE "public"."riichi_open_audit_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."riichi_open_audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."riichi_open_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "timezone" "text" DEFAULT 'Asia/Kuala_Lumpur'::"text" NOT NULL,
    "venue" "text" NOT NULL,
    "payment_phone" "text" NOT NULL,
    "payment_recipient" "text" NOT NULL,
    "entry_fee_sen" integer NOT NULL,
    "capacity" integer NOT NULL,
    "registration_hold_minutes" smallint DEFAULT 30 NOT NULL,
    "registration_open" boolean DEFAULT false NOT NULL,
    "stage" "text" DEFAULT 'registration'::"text" NOT NULL,
    "current_publication_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "riichi_open_events_capacity_check" CHECK ((("capacity" >= 4) AND ("capacity" <= 16))),
    CONSTRAINT "riichi_open_events_entry_fee_sen_check" CHECK (("entry_fee_sen" > 0)),
    CONSTRAINT "riichi_open_events_registration_hold_minutes_check" CHECK ((("registration_hold_minutes" >= 5) AND ("registration_hold_minutes" <= 120))),
    CONSTRAINT "riichi_open_events_slug_check" CHECK (("slug" = 'riichi-open-i'::"text")),
    CONSTRAINT "riichi_open_events_stage_check" CHECK (("stage" = ANY (ARRAY['registration'::"text", 'qualifier_1'::"text", 'qualifier_2'::"text", 'final'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."riichi_open_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "registration_id" "uuid",
    "display_name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "checked_in" boolean DEFAULT false NOT NULL,
    "is_substitute" boolean DEFAULT false NOT NULL,
    "eligible_for_final" boolean DEFAULT true NOT NULL,
    "qualification_seed" smallint,
    "source" "text" DEFAULT 'registration'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "riichi_open_participants_check" CHECK (((NOT "is_substitute") OR (NOT "eligible_for_final"))),
    CONSTRAINT "riichi_open_participants_display_name_check" CHECK ((("char_length"("btrim"("display_name")) >= 1) AND ("char_length"("btrim"("display_name")) <= 80))),
    CONSTRAINT "riichi_open_participants_qualification_seed_check" CHECK ((("qualification_seed" IS NULL) OR (("qualification_seed" >= 1) AND ("qualification_seed" <= 16)))),
    CONSTRAINT "riichi_open_participants_source_check" CHECK (("source" = ANY (ARRAY['registration'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."riichi_open_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_penalties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "points" numeric(7,2) NOT NULL,
    "reason" "text" NOT NULL,
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "riichi_open_penalties_points_check" CHECK (("points" >= (0)::numeric)),
    CONSTRAINT "riichi_open_penalties_reason_check" CHECK ((("char_length"("btrim"("reason")) >= 1) AND ("char_length"("btrim"("reason")) <= 500)))
);


ALTER TABLE "public"."riichi_open_penalties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_publications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."riichi_open_publications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_registration_holds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "receipt_path" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "restarts_registration_id" "uuid",
    CONSTRAINT "riichi_open_registration_holds_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'submitted'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."riichi_open_registration_holds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "hold_id" "uuid",
    "display_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "receipt_path" "text",
    "receipt_mime" "text",
    "receipt_size" integer,
    "receipt_sha256" "text",
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "private_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "restarted_from_registration_id" "uuid",
    CONSTRAINT "riichi_open_registrations_display_name_check" CHECK ((("char_length"("btrim"("display_name")) >= 1) AND ("char_length"("btrim"("display_name")) <= 80))),
    CONSTRAINT "riichi_open_registrations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'needs_clarification'::"text", 'rejected'::"text", 'cancelled'::"text", 'payment_exception'::"text"])))
);


ALTER TABLE "public"."riichi_open_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_reservation_rate_limits" (
    "id" bigint NOT NULL,
    "event_id" "uuid" NOT NULL,
    "client_fingerprint" "text" NOT NULL,
    "hold_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "riichi_open_reservation_rate_limits_client_fingerprint_check" CHECK (("client_fingerprint" ~ '^[0-9a-f]{64}$'::"text"))
);


ALTER TABLE "public"."riichi_open_reservation_rate_limits" OWNER TO "postgres";


ALTER TABLE "public"."riichi_open_reservation_rate_limits" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."riichi_open_reservation_rate_limits_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."riichi_open_results" (
    "event_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL,
    "table_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "raw_points" integer NOT NULL,
    "placement" smallint NOT NULL,
    "uma" numeric(5,2) NOT NULL,
    "score" numeric(7,2) NOT NULL,
    "first_place" boolean NOT NULL,
    "fourth_place" boolean NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "riichi_open_results_placement_check" CHECK ((("placement" >= 1) AND ("placement" <= 4)))
);


ALTER TABLE "public"."riichi_open_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_rounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "round_key" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "draft_revision" integer DEFAULT 1 NOT NULL,
    "expected_tables" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone,
    "certified_at" timestamp with time zone,
    "certified_by" "uuid",
    CONSTRAINT "riichi_open_rounds_expected_tables_check" CHECK (("expected_tables" >= 0)),
    CONSTRAINT "riichi_open_rounds_round_key_check" CHECK (("round_key" = ANY (ARRAY['qualifier_1'::"text", 'qualifier_2'::"text", 'final'::"text"]))),
    CONSTRAINT "riichi_open_rounds_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'certified'::"text"])))
);


ALTER TABLE "public"."riichi_open_rounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_seats" (
    "event_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL,
    "table_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "seat_wind" "text" NOT NULL,
    CONSTRAINT "riichi_open_seats_seat_wind_check" CHECK (("seat_wind" = ANY (ARRAY['East'::"text", 'South'::"text", 'West'::"text", 'North'::"text"])))
);


ALTER TABLE "public"."riichi_open_seats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL,
    "table_number" integer NOT NULL,
    "unclaimed_sticks" integer DEFAULT 0 NOT NULL,
    "published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "riichi_open_tables_table_number_check" CHECK (("table_number" > 0)),
    CONSTRAINT "riichi_open_tables_unclaimed_sticks_check" CHECK ((("unclaimed_sticks" >= 0) AND ("unclaimed_sticks" <= 100)))
);


ALTER TABLE "public"."riichi_open_tables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."riichi_open_tie_draws" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "round_id" "uuid" NOT NULL,
    "participant_ids" "uuid"[] NOT NULL,
    "order_ids" "uuid"[] NOT NULL,
    "public_note" "text" NOT NULL,
    "recorded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."riichi_open_tie_draws" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visitors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visitor_id" "uuid" NOT NULL,
    "visited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."visitors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."attendees"
    ADD CONSTRAINT "attendees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."birthday_greetings"
    ADD CONSTRAINT "birthday_greetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_log"
    ADD CONSTRAINT "chatbot_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."playlog"
    ADD CONSTRAINT "playlog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_attendees"
    ADD CONSTRAINT "riichi_attendees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_league_matches"
    ADD CONSTRAINT "riichi_league_matches_id_season_id_key" UNIQUE ("id", "season_id");



ALTER TABLE ONLY "public"."riichi_league_matches"
    ADD CONSTRAINT "riichi_league_matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_league_matches"
    ADD CONSTRAINT "riichi_league_matches_week_id_table_number_key" UNIQUE ("week_id", "table_number");



ALTER TABLE ONLY "public"."riichi_league_players"
    ADD CONSTRAINT "riichi_league_players_pkey" PRIMARY KEY ("season_id", "id");



ALTER TABLE ONLY "public"."riichi_league_results"
    ADD CONSTRAINT "riichi_league_results_match_id_placement_key" UNIQUE ("match_id", "placement");



ALTER TABLE ONLY "public"."riichi_league_results"
    ADD CONSTRAINT "riichi_league_results_match_seat_key" UNIQUE ("match_id", "seat_wind");



ALTER TABLE ONLY "public"."riichi_league_results"
    ADD CONSTRAINT "riichi_league_results_pkey" PRIMARY KEY ("match_id", "player_id");



ALTER TABLE ONLY "public"."riichi_league_seasons"
    ADD CONSTRAINT "riichi_league_seasons_id_season_number_key" UNIQUE ("id", "season_number");



ALTER TABLE ONLY "public"."riichi_league_seasons"
    ADD CONSTRAINT "riichi_league_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_league_seasons"
    ADD CONSTRAINT "riichi_league_seasons_season_number_key" UNIQUE ("season_number");



ALTER TABLE ONLY "public"."riichi_league_weeks"
    ADD CONSTRAINT "riichi_league_weeks_id_season_id_key" UNIQUE ("id", "season_id");



ALTER TABLE ONLY "public"."riichi_league_weeks"
    ADD CONSTRAINT "riichi_league_weeks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_league_weeks"
    ADD CONSTRAINT "riichi_league_weeks_season_id_week_number_key" UNIQUE ("season_id", "week_number");



ALTER TABLE ONLY "public"."riichi_open_audit_log"
    ADD CONSTRAINT "riichi_open_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_events"
    ADD CONSTRAINT "riichi_open_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_events"
    ADD CONSTRAINT "riichi_open_events_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."riichi_open_participants"
    ADD CONSTRAINT "riichi_open_participants_id_event_id_key" UNIQUE ("id", "event_id");



ALTER TABLE ONLY "public"."riichi_open_participants"
    ADD CONSTRAINT "riichi_open_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_participants"
    ADD CONSTRAINT "riichi_open_participants_registration_id_key" UNIQUE ("registration_id");



ALTER TABLE ONLY "public"."riichi_open_penalties"
    ADD CONSTRAINT "riichi_open_penalties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_publications"
    ADD CONSTRAINT "riichi_open_publications_event_id_version_key" UNIQUE ("event_id", "version");



ALTER TABLE ONLY "public"."riichi_open_publications"
    ADD CONSTRAINT "riichi_open_publications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_registration_holds"
    ADD CONSTRAINT "riichi_open_registration_holds_event_id_idempotency_key_key" UNIQUE ("event_id", "idempotency_key");



ALTER TABLE ONLY "public"."riichi_open_registration_holds"
    ADD CONSTRAINT "riichi_open_registration_holds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_registration_holds"
    ADD CONSTRAINT "riichi_open_registration_holds_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."riichi_open_registrations"
    ADD CONSTRAINT "riichi_open_registrations_hold_id_key" UNIQUE ("hold_id");



ALTER TABLE ONLY "public"."riichi_open_registrations"
    ADD CONSTRAINT "riichi_open_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_reservation_rate_limits"
    ADD CONSTRAINT "riichi_open_reservation_rate_limits_hold_id_key" UNIQUE ("hold_id");



ALTER TABLE ONLY "public"."riichi_open_reservation_rate_limits"
    ADD CONSTRAINT "riichi_open_reservation_rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_results"
    ADD CONSTRAINT "riichi_open_results_pkey" PRIMARY KEY ("round_id", "participant_id");



ALTER TABLE ONLY "public"."riichi_open_rounds"
    ADD CONSTRAINT "riichi_open_rounds_event_id_round_key_key" UNIQUE ("event_id", "round_key");



ALTER TABLE ONLY "public"."riichi_open_rounds"
    ADD CONSTRAINT "riichi_open_rounds_id_event_id_key" UNIQUE ("id", "event_id");



ALTER TABLE ONLY "public"."riichi_open_rounds"
    ADD CONSTRAINT "riichi_open_rounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_seats"
    ADD CONSTRAINT "riichi_open_seats_pkey" PRIMARY KEY ("round_id", "participant_id");



ALTER TABLE ONLY "public"."riichi_open_seats"
    ADD CONSTRAINT "riichi_open_seats_table_id_seat_wind_key" UNIQUE ("table_id", "seat_wind");



ALTER TABLE ONLY "public"."riichi_open_tables"
    ADD CONSTRAINT "riichi_open_tables_id_round_id_key" UNIQUE ("id", "round_id");



ALTER TABLE ONLY "public"."riichi_open_tables"
    ADD CONSTRAINT "riichi_open_tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."riichi_open_tables"
    ADD CONSTRAINT "riichi_open_tables_round_id_table_number_key" UNIQUE ("round_id", "table_number");



ALTER TABLE ONLY "public"."riichi_open_tie_draws"
    ADD CONSTRAINT "riichi_open_tie_draws_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "visitors_pkey" PRIMARY KEY ("id");



CREATE INDEX "riichi_league_matches_week_idx" ON "public"."riichi_league_matches" USING "btree" ("week_id", "table_number");



CREATE UNIQUE INDEX "riichi_league_players_season_name_idx" ON "public"."riichi_league_players" USING "btree" ("season_id", "lower"("btrim"("display_name")));



CREATE INDEX "riichi_league_results_player_idx" ON "public"."riichi_league_results" USING "btree" ("season_id", "player_id", "match_id");



CREATE INDEX "riichi_league_weeks_season_date_idx" ON "public"."riichi_league_weeks" USING "btree" ("season_id", "event_date");



CREATE INDEX "riichi_open_audit_created_idx" ON "public"."riichi_open_audit_log" USING "btree" ("event_id", "created_at" DESC);



CREATE INDEX "riichi_open_holds_capacity_idx" ON "public"."riichi_open_registration_holds" USING "btree" ("event_id", "status", "expires_at");



CREATE UNIQUE INDEX "riichi_open_one_active_restart_per_registration_idx" ON "public"."riichi_open_registration_holds" USING "btree" ("event_id", "restarts_registration_id") WHERE (("restarts_registration_id" IS NOT NULL) AND ("status" = 'active'::"text"));



CREATE UNIQUE INDEX "riichi_open_one_submitted_restart_per_registration_idx" ON "public"."riichi_open_registrations" USING "btree" ("restarted_from_registration_id") WHERE ("restarted_from_registration_id" IS NOT NULL);



CREATE INDEX "riichi_open_participants_active_idx" ON "public"."riichi_open_participants" USING "btree" ("event_id", "active", "checked_in");



CREATE INDEX "riichi_open_reg_status_idx" ON "public"."riichi_open_registrations" USING "btree" ("event_id", "status", "submitted_at");



CREATE INDEX "riichi_open_reservation_rate_window_idx" ON "public"."riichi_open_reservation_rate_limits" USING "btree" ("event_id", "client_fingerprint", "created_at" DESC);



CREATE OR REPLACE TRIGGER "riichi_capacity_check" BEFORE INSERT OR UPDATE OF "status" ON "public"."riichi_attendees" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_riichi_capacity"();



CREATE OR REPLACE TRIGGER "riichi_open_registration_restart_link" BEFORE INSERT ON "public"."riichi_open_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."copy_riichi_open_restart_link"();



ALTER TABLE ONLY "public"."attendees"
    ADD CONSTRAINT "attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."riichi_league_matches"
    ADD CONSTRAINT "riichi_league_matches_week_id_season_id_fkey" FOREIGN KEY ("week_id", "season_id") REFERENCES "public"."riichi_league_weeks"("id", "season_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_league_players"
    ADD CONSTRAINT "riichi_league_players_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."riichi_league_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_league_results"
    ADD CONSTRAINT "riichi_league_results_match_id_season_id_fkey" FOREIGN KEY ("match_id", "season_id") REFERENCES "public"."riichi_league_matches"("id", "season_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_league_results"
    ADD CONSTRAINT "riichi_league_results_season_id_player_id_fkey" FOREIGN KEY ("season_id", "player_id") REFERENCES "public"."riichi_league_players"("season_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."riichi_league_weeks"
    ADD CONSTRAINT "riichi_league_weeks_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."riichi_league_seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_open_audit_log"
    ADD CONSTRAINT "riichi_open_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."riichi_open_audit_log"
    ADD CONSTRAINT "riichi_open_audit_log_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."riichi_open_events"("id");



ALTER TABLE ONLY "public"."riichi_open_events"
    ADD CONSTRAINT "riichi_open_current_publication_fk" FOREIGN KEY ("current_publication_id") REFERENCES "public"."riichi_open_publications"("id");



ALTER TABLE ONLY "public"."riichi_open_participants"
    ADD CONSTRAINT "riichi_open_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."riichi_open_events"("id");



ALTER TABLE ONLY "public"."riichi_open_participants"
    ADD CONSTRAINT "riichi_open_participants_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "public"."riichi_open_registrations"("id");



ALTER TABLE ONLY "public"."riichi_open_penalties"
    ADD CONSTRAINT "riichi_open_penalties_participant_id_event_id_fkey" FOREIGN KEY ("participant_id", "event_id") REFERENCES "public"."riichi_open_participants"("id", "event_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."riichi_open_penalties"
    ADD CONSTRAINT "riichi_open_penalties_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."riichi_open_penalties"
    ADD CONSTRAINT "riichi_open_penalties_round_id_event_id_fkey" FOREIGN KEY ("round_id", "event_id") REFERENCES "public"."riichi_open_rounds"("id", "event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_open_publications"
    ADD CONSTRAINT "riichi_open_publications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."riichi_open_publications"
    ADD CONSTRAINT "riichi_open_publications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."riichi_open_events"("id");



ALTER TABLE ONLY "public"."riichi_open_registration_holds"
    ADD CONSTRAINT "riichi_open_registration_holds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."riichi_open_events"("id");



ALTER TABLE ONLY "public"."riichi_open_registration_holds"
    ADD CONSTRAINT "riichi_open_registration_holds_restarts_registration_id_fkey" FOREIGN KEY ("restarts_registration_id") REFERENCES "public"."riichi_open_registrations"("id");



ALTER TABLE ONLY "public"."riichi_open_registrations"
    ADD CONSTRAINT "riichi_open_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."riichi_open_events"("id");



ALTER TABLE ONLY "public"."riichi_open_registrations"
    ADD CONSTRAINT "riichi_open_registrations_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "public"."riichi_open_registration_holds"("id");



ALTER TABLE ONLY "public"."riichi_open_registrations"
    ADD CONSTRAINT "riichi_open_registrations_restarted_from_registration_id_fkey" FOREIGN KEY ("restarted_from_registration_id") REFERENCES "public"."riichi_open_registrations"("id");



ALTER TABLE ONLY "public"."riichi_open_registrations"
    ADD CONSTRAINT "riichi_open_registrations_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."riichi_open_reservation_rate_limits"
    ADD CONSTRAINT "riichi_open_reservation_rate_limits_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."riichi_open_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_open_reservation_rate_limits"
    ADD CONSTRAINT "riichi_open_reservation_rate_limits_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "public"."riichi_open_registration_holds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_open_results"
    ADD CONSTRAINT "riichi_open_results_participant_id_event_id_fkey" FOREIGN KEY ("participant_id", "event_id") REFERENCES "public"."riichi_open_participants"("id", "event_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."riichi_open_results"
    ADD CONSTRAINT "riichi_open_results_table_id_round_id_fkey" FOREIGN KEY ("table_id", "round_id") REFERENCES "public"."riichi_open_tables"("id", "round_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_open_rounds"
    ADD CONSTRAINT "riichi_open_rounds_certified_by_fkey" FOREIGN KEY ("certified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."riichi_open_rounds"
    ADD CONSTRAINT "riichi_open_rounds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."riichi_open_events"("id");



ALTER TABLE ONLY "public"."riichi_open_seats"
    ADD CONSTRAINT "riichi_open_seats_participant_id_event_id_fkey" FOREIGN KEY ("participant_id", "event_id") REFERENCES "public"."riichi_open_participants"("id", "event_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."riichi_open_seats"
    ADD CONSTRAINT "riichi_open_seats_table_id_round_id_fkey" FOREIGN KEY ("table_id", "round_id") REFERENCES "public"."riichi_open_tables"("id", "round_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_open_tables"
    ADD CONSTRAINT "riichi_open_tables_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."riichi_open_events"("id");



ALTER TABLE ONLY "public"."riichi_open_tables"
    ADD CONSTRAINT "riichi_open_tables_round_id_event_id_fkey" FOREIGN KEY ("round_id", "event_id") REFERENCES "public"."riichi_open_rounds"("id", "event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."riichi_open_tie_draws"
    ADD CONSTRAINT "riichi_open_tie_draws_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."riichi_open_tie_draws"
    ADD CONSTRAINT "riichi_open_tie_draws_round_id_event_id_fkey" FOREIGN KEY ("round_id", "event_id") REFERENCES "public"."riichi_open_rounds"("id", "event_id") ON DELETE CASCADE;



CREATE POLICY "Allow public chatbot log inserts" ON "public"."chatbot_log" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Anyone can submit a birthday" ON "public"."birthday_greetings" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Birthday admins can view birthdays" ON "public"."birthday_greetings" FOR SELECT TO "authenticated" USING ((COALESCE((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text"), ''::"text") = 'birthday_admin'::"text"));



COMMENT ON POLICY "Birthday admins can view birthdays" ON "public"."birthday_greetings" IS 'Restricts the private birthday calendar to accounts assigned the birthday_admin app role.';



CREATE POLICY "Public can read league matches" ON "public"."riichi_league_matches" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can read league players" ON "public"."riichi_league_players" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can read league results" ON "public"."riichi_league_results" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can read league seasons" ON "public"."riichi_league_seasons" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can read league weeks" ON "public"."riichi_league_weeks" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read" ON "public"."events" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Public read" ON "public"."playlog" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."attendees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."birthday_greetings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbot_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."playlog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public can submit pending Riichimania RSVPs" ON "public"."riichi_attendees" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("status")::"text" = 'PENDING'::"text"));



CREATE POLICY "public delete" ON "public"."attendees" FOR DELETE TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "attendees"."event_id") AND ((("now"() AT TIME ZONE 'Asia/Kuala_Lumpur'::"text"))::"date" <= ("e"."date" + 2))))));



CREATE POLICY "public insert" ON "public"."visitors" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "public insert upcoming attendees" ON "public"."attendees" FOR INSERT TO "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "attendees"."event_id") AND ((("now"() AT TIME ZONE 'Asia/Kuala_Lumpur'::"text"))::"date" <= ("e"."date" + 2))))));



CREATE POLICY "public read" ON "public"."attendees" FOR SELECT TO "anon" USING (true);



CREATE POLICY "public update" ON "public"."attendees" FOR UPDATE TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "attendees"."event_id") AND ((("now"() AT TIME ZONE 'Asia/Kuala_Lumpur'::"text"))::"date" <= ("e"."date" + 2)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."id" = "attendees"."event_id") AND ((("now"() AT TIME ZONE 'Asia/Kuala_Lumpur'::"text"))::"date" <= ("e"."date" + 2))))));



ALTER TABLE "public"."riichi_attendees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_league_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_league_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_league_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_league_seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_league_weeks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_penalties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_publications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_registration_holds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_reservation_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_rounds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_seats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_tables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."riichi_open_tie_draws" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visitors" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

-- Supabase's local default ACLs grant anon/authenticated access to new
-- objects. Clear those defaults here, then restore the production ACLs below.
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "public" FROM PUBLIC, "anon", "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_add_riichi_open_participant"("p_name" "text", "p_payment_verified" boolean, "p_reason" "text", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_add_riichi_open_participant"("p_name" "text", "p_payment_verified" boolean, "p_reason" "text", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_certify_riichi_open_round"("p_round_id" "uuid", "p_revision" integer, "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_certify_riichi_open_round"("p_round_id" "uuid", "p_revision" integer, "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_generate_riichi_open_q1"("p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_generate_riichi_open_q1"("p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_prepare_riichi_open_round"("p_round_key" "text", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_prepare_riichi_open_round"("p_round_key" "text", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_record_riichi_open_penalty"("p_round_id" "uuid", "p_participant_id" "uuid", "p_points" numeric, "p_reason" "text", "p_revision" integer, "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_record_riichi_open_penalty"("p_round_id" "uuid", "p_participant_id" "uuid", "p_points" numeric, "p_reason" "text", "p_revision" integer, "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_record_riichi_open_tie_draw"("p_round_id" "uuid", "p_participant_ids" "uuid"[], "p_order_ids" "uuid"[], "p_note" "text", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_record_riichi_open_tie_draw"("p_round_id" "uuid", "p_participant_ids" "uuid"[], "p_order_ids" "uuid"[], "p_note" "text", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_set_riichi_open_registration_status"("p_registration_id" "uuid", "p_status" "text", "p_note" "text", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_riichi_open_registration_status"("p_registration_id" "uuid", "p_status" "text", "p_note" "text", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_set_riichi_open_registration_status"("p_registration_id" "uuid", "p_status" "text", "p_note" "text", "p_expected_note" "text", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_riichi_open_registration_status"("p_registration_id" "uuid", "p_status" "text", "p_note" "text", "p_expected_note" "text", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_update_riichi_open_participant"("p_event_id" "uuid", "p_participant_id" "uuid", "p_patch" "jsonb", "p_expected" "jsonb", "p_actor" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_update_riichi_open_participant"("p_event_id" "uuid", "p_participant_id" "uuid", "p_patch" "jsonb", "p_expected" "jsonb", "p_actor" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_riichi_open_place"("p_hold_id" "uuid", "p_token_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_riichi_open_place"("p_hold_id" "uuid", "p_token_hash" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."copy_riichi_open_restart_link"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."copy_riichi_open_restart_link"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_riichi_match"("p_match_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_riichi_match"("p_match_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_riichi_match"("p_match_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_riichi_match"("p_match_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_riichi_capacity"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_riichi_capacity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_riichi_capacity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_riichi_open_registration"("p_hold_id" "uuid", "p_token_hash" "text", "p_display_name" "text", "p_receipt_upload_path" "text", "p_receipt_path" "text", "p_receipt_mime" "text", "p_receipt_size" integer, "p_receipt_sha256" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_riichi_open_registration"("p_hold_id" "uuid", "p_token_hash" "text", "p_display_name" "text", "p_receipt_upload_path" "text", "p_receipt_path" "text", "p_receipt_mime" "text", "p_receipt_size" integer, "p_receipt_sha256" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_daily_visitor_count"("p_day" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_daily_visitor_count"("p_day" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_visitor_count"("p_day" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_visitor_count"("p_day" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_riichi_confirmed_attendees"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_riichi_confirmed_attendees"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_riichi_confirmed_attendees"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_riichi_confirmed_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_riichi_confirmed_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_riichi_confirmed_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_riichi_pending_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_riichi_pending_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_riichi_pending_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_unique_visitors"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_unique_visitors"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_unique_visitors"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."publish_riichi_open_assignments"("p_round_id" "uuid", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."publish_riichi_open_assignments"("p_round_id" "uuid", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_riichi_open_place"("p_token_hash" "text", "p_idempotency_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_riichi_open_place"("p_token_hash" "text", "p_idempotency_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_riichi_open_place"("p_token_hash" "text", "p_idempotency_key" "text", "p_client_fingerprint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_riichi_open_place"("p_token_hash" "text", "p_idempotency_key" "text", "p_client_fingerprint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."restart_cancelled_riichi_open_registration"("p_registration_id" "uuid", "p_previous_token_hash" "text", "p_new_token_hash" "text", "p_idempotency_key" "text", "p_client_fingerprint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restart_cancelled_riichi_open_registration"("p_registration_id" "uuid", "p_previous_token_hash" "text", "p_new_token_hash" "text", "p_idempotency_key" "text", "p_client_fingerprint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."riichi_open_has_active_recovery_claim"("p_registration_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."riichi_open_has_active_recovery_claim"("p_registration_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_riichi_open_table_results"("p_round_id" "uuid", "p_table_id" "uuid", "p_revision" integer, "p_sticks" integer, "p_results" "jsonb", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_riichi_open_table_results"("p_round_id" "uuid", "p_table_id" "uuid", "p_revision" integer, "p_sticks" integer, "p_results" "jsonb", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_riichi_match"("p_week_id" "text", "p_results" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_riichi_match"("p_week_id" "text", "p_results" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_riichi_match"("p_week_id" "text", "p_results" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_riichi_match"("p_week_id" "text", "p_results" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_riichi_match"("p_match_id" "text", "p_results" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_riichi_match"("p_match_id" "text", "p_results" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_riichi_match"("p_match_id" "text", "p_results" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_riichi_match"("p_match_id" "text", "p_results" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."attendees" TO "anon";
GRANT ALL ON TABLE "public"."attendees" TO "authenticated";
GRANT ALL ON TABLE "public"."attendees" TO "service_role";



GRANT ALL ON SEQUENCE "public"."attendees_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."attendees_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."attendees_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."birthday_greetings" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."birthday_greetings" TO "authenticated";



GRANT INSERT("name") ON TABLE "public"."birthday_greetings" TO "anon";
GRANT SELECT("name"),INSERT("name") ON TABLE "public"."birthday_greetings" TO "authenticated";



GRANT INSERT("birth_month") ON TABLE "public"."birthday_greetings" TO "anon";
GRANT SELECT("birth_month"),INSERT("birth_month") ON TABLE "public"."birthday_greetings" TO "authenticated";



GRANT INSERT("birth_day") ON TABLE "public"."birthday_greetings" TO "anon";
GRANT SELECT("birth_day"),INSERT("birth_day") ON TABLE "public"."birthday_greetings" TO "authenticated";



GRANT INSERT("allow_public_greeting") ON TABLE "public"."birthday_greetings" TO "anon";
GRANT SELECT("allow_public_greeting"),INSERT("allow_public_greeting") ON TABLE "public"."birthday_greetings" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."birthday_greetings" TO "authenticated";



GRANT ALL ON TABLE "public"."chatbot_log" TO "service_role";



GRANT INSERT("user_query") ON TABLE "public"."chatbot_log" TO "anon";
GRANT INSERT("user_query") ON TABLE "public"."chatbot_log" TO "authenticated";



GRANT INSERT("response") ON TABLE "public"."chatbot_log" TO "anon";
GRANT INSERT("response") ON TABLE "public"."chatbot_log" TO "authenticated";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."playlog" TO "anon";
GRANT ALL ON TABLE "public"."playlog" TO "authenticated";
GRANT ALL ON TABLE "public"."playlog" TO "service_role";



GRANT ALL ON SEQUENCE "public"."playlog_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."playlog_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."playlog_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_attendees" TO "anon";
GRANT ALL ON TABLE "public"."riichi_attendees" TO "authenticated";
GRANT ALL ON TABLE "public"."riichi_attendees" TO "service_role";



GRANT ALL ON SEQUENCE "public"."riichi_attendees_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."riichi_attendees_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."riichi_attendees_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_league_matches" TO "service_role";
GRANT SELECT ON TABLE "public"."riichi_league_matches" TO "anon";
GRANT SELECT ON TABLE "public"."riichi_league_matches" TO "authenticated";



GRANT ALL ON TABLE "public"."riichi_league_players" TO "service_role";
GRANT SELECT ON TABLE "public"."riichi_league_players" TO "anon";
GRANT SELECT ON TABLE "public"."riichi_league_players" TO "authenticated";



GRANT ALL ON TABLE "public"."riichi_league_results" TO "service_role";
GRANT SELECT ON TABLE "public"."riichi_league_results" TO "anon";
GRANT SELECT ON TABLE "public"."riichi_league_results" TO "authenticated";



GRANT ALL ON TABLE "public"."riichi_league_seasons" TO "service_role";
GRANT SELECT ON TABLE "public"."riichi_league_seasons" TO "anon";
GRANT SELECT ON TABLE "public"."riichi_league_seasons" TO "authenticated";



GRANT ALL ON TABLE "public"."riichi_league_weeks" TO "service_role";
GRANT SELECT ON TABLE "public"."riichi_league_weeks" TO "anon";
GRANT SELECT ON TABLE "public"."riichi_league_weeks" TO "authenticated";



GRANT ALL ON TABLE "public"."riichi_open_audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."riichi_open_audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."riichi_open_audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."riichi_open_audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_events" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_participants" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_penalties" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_publications" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_registration_holds" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_reservation_rate_limits" TO "service_role";



GRANT ALL ON SEQUENCE "public"."riichi_open_reservation_rate_limits_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."riichi_open_reservation_rate_limits_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."riichi_open_reservation_rate_limits_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_results" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_rounds" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_seats" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_tables" TO "service_role";



GRANT ALL ON TABLE "public"."riichi_open_tie_draws" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."visitors" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."visitors" TO "authenticated";
GRANT ALL ON TABLE "public"."visitors" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







