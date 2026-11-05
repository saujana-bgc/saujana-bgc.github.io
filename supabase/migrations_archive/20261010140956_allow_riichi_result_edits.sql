create or replace function public.update_riichi_match(
  p_match_id text,
  p_results jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function public.update_riichi_match(text, jsonb) from public;
grant execute on function public.update_riichi_match(text, jsonb) to anon, authenticated;

comment on function public.update_riichi_match(text, jsonb) is
  'Replaces one full table result within three calendar days after its session date, recalculating placements and seats from submitted order.';

create or replace function public.delete_riichi_match(
  p_match_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
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

revoke all on function public.delete_riichi_match(text) from public;
grant execute on function public.delete_riichi_match(text) to anon, authenticated;

comment on function public.delete_riichi_match(text) is
  'Deletes one full table result within three calendar days after its session date.';
