drop function if exists public.submit_riichi_match(text, integer, integer, jsonb, text);

alter table public.riichi_league_matches
  drop column if exists submitter_name;

create unique index riichi_league_players_season_name_idx
  on public.riichi_league_players (season_id, lower(btrim(display_name)));

create function public.submit_riichi_match(
  p_week_id text,
  p_results jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season_id text;
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

  -- Lock the week so concurrent public submissions receive different table numbers.
  select w.season_id, s.supported_table_sizes
    into v_season_id, v_expected_table_sizes
    from public.riichi_league_weeks w
    join public.riichi_league_seasons s on s.id = w.season_id
    where w.id = p_week_id
    for update of w;

  if v_season_id is null then
    raise exception 'League week not found' using errcode = '22023';
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

  -- Reuse a roster entry by case-insensitive name; otherwise create the player atomically.
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

  insert into public.riichi_league_results (season_id, match_id, player_id, final_points, placement)
  select
    v_season_id,
    v_match_id,
    p.id,
    (r.value->>'final_points')::integer,
    row_number() over (order by (r.value->>'final_points')::integer desc, r.ordinality)::smallint
  from jsonb_array_elements(p_results) with ordinality as r(value, ordinality)
  join public.riichi_league_players p
    on p.season_id = v_season_id
    and lower(btrim(p.display_name)) = lower(btrim(r.value->>'player_name'));

  return v_table_number;
end;
$$;

revoke all on function public.submit_riichi_match(text, jsonb) from public;
grant execute on function public.submit_riichi_match(text, jsonb) to anon, authenticated;

comment on function public.submit_riichi_match(text, jsonb) is
  'Accepts anonymous full-table scores, creates unseen player names, assigns the next table number, and derives placement from points.';
