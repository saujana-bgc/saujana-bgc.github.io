create table public.riichi_league_seasons (
  id text primary key,
  season_number integer not null unique check (season_number > 0),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('upcoming', 'active', 'completed')),
  total_weeks integer not null check (total_weeks > 0),
  best_results_count integer not null check (best_results_count > 0),
  supported_table_sizes smallint[] not null,
  scoring jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  check (end_date >= start_date),
  unique (id, season_number)
);

create table public.riichi_league_players (
  season_id text not null references public.riichi_league_seasons(id) on delete cascade,
  id text not null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  primary key (season_id, id)
);

create table public.riichi_league_weeks (
  id text primary key,
  season_id text not null references public.riichi_league_seasons(id) on delete cascade,
  week_number integer not null check (week_number > 0),
  event_date date not null,
  status text not null check (status in ('upcoming', 'scheduled', 'active', 'completed')),
  metadata jsonb not null default '{}'::jsonb,
  unique (season_id, week_number),
  unique (id, season_id)
);

create table public.riichi_league_matches (
  id text primary key default gen_random_uuid()::text,
  season_id text not null,
  week_id text not null,
  table_number integer not null check (table_number > 0),
  table_size smallint not null check (table_size in (3, 4)),
  submitter_name text check (submitter_name is null or char_length(btrim(submitter_name)) between 1 and 80),
  submitted_at timestamptz not null default now(),
  unique (week_id, table_number),
  unique (id, season_id),
  foreign key (week_id, season_id)
    references public.riichi_league_weeks(id, season_id) on delete cascade
);

create table public.riichi_league_results (
  season_id text not null,
  match_id text not null,
  player_id text not null,
  final_points integer not null check (final_points between -50000 and 200000),
  placement smallint not null check (placement between 1 and 4),
  primary key (match_id, player_id),
  unique (match_id, placement),
  foreign key (match_id, season_id)
    references public.riichi_league_matches(id, season_id) on delete cascade,
  foreign key (season_id, player_id)
    references public.riichi_league_players(season_id, id) on delete restrict
);

create index riichi_league_weeks_season_date_idx
  on public.riichi_league_weeks(season_id, event_date);
create index riichi_league_matches_week_idx
  on public.riichi_league_matches(week_id, table_number);
create index riichi_league_results_player_idx
  on public.riichi_league_results(season_id, player_id, match_id);

alter table public.riichi_league_seasons enable row level security;
alter table public.riichi_league_players enable row level security;
alter table public.riichi_league_weeks enable row level security;
alter table public.riichi_league_matches enable row level security;
alter table public.riichi_league_results enable row level security;

revoke all on public.riichi_league_seasons,
  public.riichi_league_players,
  public.riichi_league_weeks,
  public.riichi_league_matches,
  public.riichi_league_results
  from anon, authenticated;

grant select on public.riichi_league_seasons,
  public.riichi_league_players,
  public.riichi_league_weeks,
  public.riichi_league_matches,
  public.riichi_league_results
  to anon, authenticated;

create policy "Public can read league seasons"
  on public.riichi_league_seasons for select to anon, authenticated using (true);
create policy "Public can read league players"
  on public.riichi_league_players for select to anon, authenticated using (true);
create policy "Public can read league weeks"
  on public.riichi_league_weeks for select to anon, authenticated using (true);
create policy "Public can read league matches"
  on public.riichi_league_matches for select to anon, authenticated using (true);
create policy "Public can read league results"
  on public.riichi_league_results for select to anon, authenticated using (true);

create or replace function public.submit_riichi_match(
  p_week_id text,
  p_table_number integer,
  p_table_size integer,
  p_results jsonb,
  p_submitter_name text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season_id text;
  v_match_id text;
  v_expected_table_sizes smallint[];
  v_result_count integer;
  v_submitter_name text;
begin
  if p_table_number is null or p_table_number < 1 then
    raise exception 'Table number must be a positive integer' using errcode = '22023';
  end if;

  if jsonb_typeof(p_results) is distinct from 'array' then
    raise exception 'Results must be an array' using errcode = '22023';
  end if;

  v_result_count := jsonb_array_length(p_results);
  if p_table_size not in (3, 4) or v_result_count <> p_table_size then
    raise exception 'Submit exactly three or four player results' using errcode = '22023';
  end if;

  select w.season_id, s.supported_table_sizes
    into v_season_id, v_expected_table_sizes
    from public.riichi_league_weeks w
    join public.riichi_league_seasons s on s.id = w.season_id
    where w.id = p_week_id;

  if v_season_id is null then
    raise exception 'League week not found' using errcode = '22023';
  end if;

  if not (v_expected_table_sizes @> array[p_table_size::smallint]) then
    raise exception 'Table size is not supported for this season' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_results) r
    where coalesce(r->>'player_id', '') = ''
      or coalesce(r->>'final_points', '') !~ '^-?[0-9]+$'
      or coalesce(r->>'placement', '') !~ '^[0-9]+$'
  ) then
    raise exception 'Each result needs a player, integer final points, and integer placement' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_results) r
      left join public.riichi_league_players p
        on p.season_id = v_season_id and p.id = r->>'player_id'
      where p.id is null
  ) then
    raise exception 'A selected player is not on this season roster' using errcode = '22023';
  end if;

  if (select count(distinct r->>'player_id') from jsonb_array_elements(p_results) r) <> p_table_size then
    raise exception 'A player can appear only once at a table' using errcode = '22023';
  end if;

  if (select count(distinct (r->>'placement')::integer) from jsonb_array_elements(p_results) r) <> p_table_size
    or (select min((r->>'placement')::integer) from jsonb_array_elements(p_results) r) <> 1
    or (select max((r->>'placement')::integer) from jsonb_array_elements(p_results) r) <> p_table_size then
    raise exception 'Placements must be a unique sequence from first to last' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_results) a
      cross join jsonb_array_elements(p_results) b
      where (a->>'final_points')::integer > (b->>'final_points')::integer
        and (a->>'placement')::integer > (b->>'placement')::integer
  ) then
    raise exception 'Placement must agree with final points' using errcode = '22023';
  end if;

  v_submitter_name := nullif(btrim(coalesce(p_submitter_name, '')), '');
  if v_submitter_name is not null and char_length(v_submitter_name) > 80 then
    raise exception 'Submitter name must be 80 characters or fewer' using errcode = '22023';
  end if;

  v_match_id := gen_random_uuid()::text;
  insert into public.riichi_league_matches (
    id, season_id, week_id, table_number, table_size, submitter_name
  ) values (
    v_match_id, v_season_id, p_week_id, p_table_number, p_table_size, v_submitter_name
  );

  insert into public.riichi_league_results (
    season_id, match_id, player_id, final_points, placement
  )
  select
    v_season_id,
    v_match_id,
    r->>'player_id',
    (r->>'final_points')::integer,
    (r->>'placement')::smallint
  from jsonb_array_elements(p_results) r;

  return v_match_id;
end;
$$;

revoke all on function public.submit_riichi_match(text, integer, integer, jsonb, text) from public;
grant execute on function public.submit_riichi_match(text, integer, integer, jsonb, text) to anon, authenticated;

comment on function public.submit_riichi_match(text, integer, integer, jsonb, text) is
  'Accepts anonymous complete-table submissions after validating the roster, table size, placements, and points.';

-- One-time import of the league source data that was previously bundled with the site.

insert into public.riichi_league_seasons (id, season_number, name, start_date, end_date, status, total_weeks, best_results_count, supported_table_sizes, scoring, metadata) values ('season-1', 1, 'Saujana Riichi League — Season 1', '2026-08-01', '2026-10-31', 'active', 14, 8, array[3,4]::smallint[], '{"method":"placementPoints","threePlayer":{"first":9,"second":5,"third":0},"fourPlayer":{"first":10,"second":6,"third":3,"fourth":0}}'::jsonb, '{"id":"season-1","number":1,"name":"Saujana Riichi League — Season 1","startDate":"2026-08-01","endDate":"2026-10-31","status":"active","totalWeeks":14,"bestResultsCount":8,"hanchanPerRound":1,"supportedTableSizes":[3,4],"admission":{"amount":0,"currency":"MYR","display":"Free"},"prize":{"title":"Mystery Prize","description":"Mystery prize for the overall season winner","sponsored":true},"scoring":{"method":"placementPoints","threePlayer":{"first":9,"second":5,"third":0},"fourPlayer":{"first":10,"second":6,"third":3,"fourth":0}},"tieBreakers":["moreLeagueSessions","moreFirstPlaceFinishes","moreSecondPlaceFinishes","higherSingleGameFinalScore","sharedPositionOrAgreedPlayoff"],"resultCounting":"bestGamePerPlayerPerDay"}'::jsonb);

insert into public.riichi_league_players (season_id, id, display_name) values
  ('season-1', 'nick', 'Nick'),
  ('season-1', 'adam', 'Adam'),
  ('season-1', 'kah-hui', 'Kah Hui'),
  ('season-1', 'vincent', 'Vincent'),
  ('season-1', 'bena', 'Bena'),
  ('season-1', 'elvin', 'Elvin'),
  ('season-1', 'naavin', 'Naavin'),
  ('season-1', 'dice', 'Dice'),
  ('season-1', 'daus', 'Daus'),
  ('season-1', 'fatinah', 'Fatinah'),
  ('season-1', 'tom', 'Tom'),
  ('season-1', 'aaran', 'Aaran'),
  ('season-1', 'aaron', 'Aaron'),
  ('season-1', 'afif', 'Afif'),
  ('season-1', 'eric', 'Eric'),
  ('season-1', 'freya', 'Freya'),
  ('season-1', 'erin', 'Erin'),
  ('season-1', 'sasi', 'Sasi'),
  ('season-1', 'dennis', 'Dennis'),
  ('season-1', 'mun', 'Mun'),
  ('season-1', 'wilson', 'Wilson'),
  ('season-1', 'art', 'Art'),
  ('season-1', 'vafa', 'Vafa'),
  ('season-1', 'amir', 'Amir'),
  ('season-1', 'insyi', 'Insyi'),
  ('season-1', 'danny', 'Danny'),
  ('season-1', 'denzel', 'Denzel'),
  ('season-1', 'nicholas-lee', 'Nicholas Lee'),
  ('season-1', 'ben', 'Ben'),
  ('season-1', 'leek', 'Leek'),
  ('season-1', 'gina', 'Gina'),
  ('season-1', 'akabii', 'Akabii'),
  ('season-1', 'greg', 'Greg'),
  ('season-1', 'martin', 'Martin');

insert into public.riichi_league_weeks (id, season_id, week_number, event_date, status, metadata) values
  ('season-1-week-01', 'season-1', 1, '2026-08-01', 'completed', '{"id":"season-1-week-01","weekNumber":1,"date":"2026-08-01","startTime":"13:30","endTime":null,"location":"Starbucks Oasis Damansara, Ara Damansara","admissionDisplay":"Free","status":"completed","notes":""}'::jsonb),
  ('season-1-week-02', 'season-1', 2, '2026-08-08', 'completed', '{"id":"season-1-week-02","weekNumber":2,"date":"2026-08-08","startTime":"13:30","endTime":null,"location":"Boardroom Bandit, Ara Damansara","admissionDisplay":"Free","status":"completed","notes":""}'::jsonb),
  ('season-1-week-03', 'season-1', 3, '2026-08-15', 'completed', '{"id":"season-1-week-03","weekNumber":3,"date":"2026-08-15","startTime":"13:30","endTime":null,"location":"Starbucks Oasis Damansara, Ara Damansara","admissionDisplay":"Free","status":"completed","notes":""}'::jsonb),
  ('season-1-week-04', 'season-1', 4, '2026-08-22', 'completed', '{"id":"season-1-week-04","weekNumber":4,"date":"2026-08-22","startTime":"13:30","endTime":null,"location":"Boardroom Bandit, Ara Damansara","admissionDisplay":"Free","status":"completed","notes":""}'::jsonb),
  ('season-1-week-05', 'season-1', 5, '2026-08-29', 'completed', '{"id":"season-1-week-05","weekNumber":5,"date":"2026-08-29","startTime":"13:30","endTime":null,"location":"Boardroom Bandit, Ara Damansara","admissionDisplay":"Free","status":"completed","notes":""}'::jsonb),
  ('season-1-week-06', 'season-1', 6, '2026-09-05', 'completed', '{"id":"season-1-week-06","weekNumber":6,"date":"2026-09-05","startTime":"13:30","endTime":null,"location":"Boardroom Bandit, Ara Damansara","admissionDisplay":"Free","status":"completed","notes":""}'::jsonb),
  ('season-1-week-07', 'season-1', 7, '2026-09-12', 'completed', '{"id":"season-1-week-07","weekNumber":7,"date":"2026-09-12","startTime":"13:30","endTime":null,"location":"Boardroom Bandit, Ara Damansara","admissionDisplay":"Free","status":"completed","notes":""}'::jsonb),
  ('season-1-week-08', 'season-1', 8, '2026-09-19', 'completed', '{"id":"season-1-week-08","weekNumber":8,"date":"2026-09-19","startTime":"13:30","endTime":null,"location":"Boardroom Bandit, Ara Damansara","admissionDisplay":"Free","status":"completed","notes":""}'::jsonb),
  ('season-1-week-09', 'season-1', 9, '2026-09-26', 'completed', '{"id":"season-1-week-09","weekNumber":9,"date":"2026-09-26","startTime":"13:30","endTime":null,"location":"Boardroom Bandit, Ara Damansara","admissionDisplay":"Free","status":"completed","notes":"Game 7: Adam (Initial East) placed ahead of Tom (Initial North) on equal points."}'::jsonb),
  ('season-1-week-10', 'season-1', 10, '2026-10-03', 'scheduled', '{"id":"season-1-week-10","weekNumber":10,"date":"2026-10-03","startTime":"13:30","endTime":null,"location":"Boardroom Bandit, Ara Damansara","admissionDisplay":"Free","status":"scheduled","notes":""}'::jsonb),
  ('season-1-week-11', 'season-1', 11, '2026-10-10', 'scheduled', '{"id":"season-1-week-11","weekNumber":11,"date":"2026-10-10","startTime":"13:30","endTime":null,"location":"","admissionDisplay":"Free","status":"scheduled","notes":""}'::jsonb),
  ('season-1-week-12', 'season-1', 12, '2026-10-17', 'scheduled', '{"id":"season-1-week-12","weekNumber":12,"date":"2026-10-17","startTime":"13:30","endTime":null,"location":"","admissionDisplay":"Free","status":"scheduled","notes":""}'::jsonb),
  ('season-1-week-13', 'season-1', 13, '2026-10-24', 'scheduled', '{"id":"season-1-week-13","weekNumber":13,"date":"2026-10-24","startTime":"13:30","endTime":null,"location":"","admissionDisplay":"Free","status":"scheduled","notes":""}'::jsonb),
  ('season-1-week-14', 'season-1', 14, '2026-10-31', 'scheduled', '{"id":"season-1-week-14","weekNumber":14,"date":"2026-10-31","startTime":"13:30","endTime":null,"location":"","admissionDisplay":"Free","status":"scheduled","notes":""}'::jsonb);

insert into public.riichi_league_matches (id, season_id, week_id, table_number, table_size, submitter_name) values
  ('season-1-week-01-game-01', 'season-1', 'season-1-week-01', 1, 4, null),
  ('season-1-week-01-game-02', 'season-1', 'season-1-week-01', 2, 4, null),
  ('season-1-week-01-game-03', 'season-1', 'season-1-week-01', 3, 4, null),
  ('season-1-week-01-game-04', 'season-1', 'season-1-week-01', 4, 4, null),
  ('season-1-week-01-game-05', 'season-1', 'season-1-week-01', 5, 4, null),
  ('season-1-week-02-game-01', 'season-1', 'season-1-week-02', 1, 4, null),
  ('season-1-week-02-game-02', 'season-1', 'season-1-week-02', 2, 4, null),
  ('season-1-week-02-game-03', 'season-1', 'season-1-week-02', 3, 3, null),
  ('season-1-week-02-game-04', 'season-1', 'season-1-week-02', 4, 4, null),
  ('season-1-week-03-game-01', 'season-1', 'season-1-week-03', 1, 4, null),
  ('season-1-week-03-game-02', 'season-1', 'season-1-week-03', 2, 4, null),
  ('season-1-week-03-game-03', 'season-1', 'season-1-week-03', 3, 4, null),
  ('season-1-week-03-game-04', 'season-1', 'season-1-week-03', 4, 4, null),
  ('season-1-week-03-game-05', 'season-1', 'season-1-week-03', 5, 4, null),
  ('season-1-week-03-game-06', 'season-1', 'season-1-week-03', 6, 4, null),
  ('season-1-week-03-game-07', 'season-1', 'season-1-week-03', 7, 4, null),
  ('season-1-week-04-game-01', 'season-1', 'season-1-week-04', 1, 4, null),
  ('season-1-week-04-game-02', 'season-1', 'season-1-week-04', 2, 4, null),
  ('season-1-week-04-game-03', 'season-1', 'season-1-week-04', 3, 4, null),
  ('season-1-week-04-game-04', 'season-1', 'season-1-week-04', 4, 4, null),
  ('season-1-week-04-game-05', 'season-1', 'season-1-week-04', 5, 4, null),
  ('season-1-week-04-game-06', 'season-1', 'season-1-week-04', 6, 4, null),
  ('season-1-week-04-game-07', 'season-1', 'season-1-week-04', 7, 4, null),
  ('season-1-week-04-game-08', 'season-1', 'season-1-week-04', 8, 4, null),
  ('season-1-week-04-game-09', 'season-1', 'season-1-week-04', 9, 4, null),
  ('season-1-week-05-game-01', 'season-1', 'season-1-week-05', 1, 4, null),
  ('season-1-week-05-game-02', 'season-1', 'season-1-week-05', 2, 4, null),
  ('season-1-week-05-game-03', 'season-1', 'season-1-week-05', 3, 4, null),
  ('season-1-week-05-game-04', 'season-1', 'season-1-week-05', 4, 4, null),
  ('season-1-week-05-game-05', 'season-1', 'season-1-week-05', 5, 4, null),
  ('season-1-week-05-game-06', 'season-1', 'season-1-week-05', 6, 4, null),
  ('season-1-week-05-game-07', 'season-1', 'season-1-week-05', 7, 4, null),
  ('season-1-week-05-game-08', 'season-1', 'season-1-week-05', 8, 4, null),
  ('season-1-week-05-game-09', 'season-1', 'season-1-week-05', 9, 4, null),
  ('season-1-week-05-game-10', 'season-1', 'season-1-week-05', 10, 4, null),
  ('season-1-week-06-game-01', 'season-1', 'season-1-week-06', 1, 4, null),
  ('season-1-week-06-game-02', 'season-1', 'season-1-week-06', 2, 4, null),
  ('season-1-week-06-game-03', 'season-1', 'season-1-week-06', 3, 4, null),
  ('season-1-week-06-game-04', 'season-1', 'season-1-week-06', 4, 4, null),
  ('season-1-week-06-game-05', 'season-1', 'season-1-week-06', 5, 4, null),
  ('season-1-week-06-game-06', 'season-1', 'season-1-week-06', 6, 4, null),
  ('season-1-week-06-game-07', 'season-1', 'season-1-week-06', 7, 4, null),
  ('season-1-week-07-game-01', 'season-1', 'season-1-week-07', 1, 4, null),
  ('season-1-week-07-game-02', 'season-1', 'season-1-week-07', 2, 4, null),
  ('season-1-week-07-game-03', 'season-1', 'season-1-week-07', 3, 4, null),
  ('season-1-week-07-game-04', 'season-1', 'season-1-week-07', 4, 4, null),
  ('season-1-week-07-game-05', 'season-1', 'season-1-week-07', 5, 4, null),
  ('season-1-week-07-game-06', 'season-1', 'season-1-week-07', 6, 4, null),
  ('season-1-week-07-game-07', 'season-1', 'season-1-week-07', 7, 4, null),
  ('season-1-week-07-game-08', 'season-1', 'season-1-week-07', 8, 4, null),
  ('season-1-week-07-game-09', 'season-1', 'season-1-week-07', 9, 4, null),
  ('season-1-week-07-game-10', 'season-1', 'season-1-week-07', 10, 4, null),
  ('season-1-week-08-game-01', 'season-1', 'season-1-week-08', 1, 3, null),
  ('season-1-week-08-game-02', 'season-1', 'season-1-week-08', 2, 4, null),
  ('season-1-week-08-game-03', 'season-1', 'season-1-week-08', 3, 4, null),
  ('season-1-week-08-game-04', 'season-1', 'season-1-week-08', 4, 4, null),
  ('season-1-week-08-game-05', 'season-1', 'season-1-week-08', 5, 4, null),
  ('season-1-week-08-game-06', 'season-1', 'season-1-week-08', 6, 4, null),
  ('season-1-week-08-game-07', 'season-1', 'season-1-week-08', 7, 4, null),
  ('season-1-week-08-game-08', 'season-1', 'season-1-week-08', 8, 4, null),
  ('season-1-week-08-game-09', 'season-1', 'season-1-week-08', 9, 4, null),
  ('season-1-week-08-game-10', 'season-1', 'season-1-week-08', 10, 4, null),
  ('season-1-week-08-game-11', 'season-1', 'season-1-week-08', 12, 3, null),
  ('season-1-week-08-game-12', 'season-1', 'season-1-week-08', 13, 3, null),
  ('season-1-week-09-game-01', 'season-1', 'season-1-week-09', 1, 4, null),
  ('season-1-week-09-game-02', 'season-1', 'season-1-week-09', 2, 3, null),
  ('season-1-week-09-game-03', 'season-1', 'season-1-week-09', 3, 3, null),
  ('season-1-week-09-game-04', 'season-1', 'season-1-week-09', 4, 4, null),
  ('season-1-week-09-game-05', 'season-1', 'season-1-week-09', 5, 4, null),
  ('season-1-week-09-game-06', 'season-1', 'season-1-week-09', 6, 4, null),
  ('season-1-week-09-game-07', 'season-1', 'season-1-week-09', 7, 4, null),
  ('season-1-week-09-game-08', 'season-1', 'season-1-week-09', 8, 4, null),
  ('season-1-week-09-game-09', 'season-1', 'season-1-week-09', 9, 4, null),
  ('season-1-week-09-game-10', 'season-1', 'season-1-week-09', 10, 4, null),
  ('season-1-week-09-game-11', 'season-1', 'season-1-week-09', 11, 4, null),
  ('season-1-week-09-game-12', 'season-1', 'season-1-week-09', 12, 4, null);

insert into public.riichi_league_results (season_id, match_id, player_id, final_points, placement) values
  ('season-1', 'season-1-week-01-game-01', 'nick', 27300, 3),
  ('season-1', 'season-1-week-01-game-01', 'adam', 30200, 2),
  ('season-1', 'season-1-week-01-game-01', 'kah-hui', 3200, 4),
  ('season-1', 'season-1-week-01-game-01', 'vincent', 39300, 1),
  ('season-1', 'season-1-week-01-game-02', 'bena', 16100, 3),
  ('season-1', 'season-1-week-01-game-02', 'dice', 30300, 2),
  ('season-1', 'season-1-week-01-game-02', 'daus', 58400, 1),
  ('season-1', 'season-1-week-01-game-02', 'fatinah', -4800, 4),
  ('season-1', 'season-1-week-01-game-03', 'tom', 40900, 1),
  ('season-1', 'season-1-week-01-game-03', 'kah-hui', 26400, 2),
  ('season-1', 'season-1-week-01-game-03', 'aaran', 25800, 3),
  ('season-1', 'season-1-week-01-game-03', 'adam', 6900, 4),
  ('season-1', 'season-1-week-01-game-04', 'afif', 21700, 3),
  ('season-1', 'season-1-week-01-game-04', 'dice', 31200, 1),
  ('season-1', 'season-1-week-01-game-04', 'daus', 30400, 2),
  ('season-1', 'season-1-week-01-game-04', 'fatinah', 16700, 4),
  ('season-1', 'season-1-week-01-game-05', 'eric', 40700, 1),
  ('season-1', 'season-1-week-01-game-05', 'aaran', 22900, 2),
  ('season-1', 'season-1-week-01-game-05', 'afif', 22300, 3),
  ('season-1', 'season-1-week-01-game-05', 'tom', 14100, 4),
  ('season-1', 'season-1-week-02-game-01', 'dice', 40500, 1),
  ('season-1', 'season-1-week-02-game-01', 'fatinah', 26400, 2),
  ('season-1', 'season-1-week-02-game-01', 'vincent', 22100, 3),
  ('season-1', 'season-1-week-02-game-01', 'dennis', 11000, 4),
  ('season-1', 'season-1-week-02-game-02', 'fatinah', 33400, 1),
  ('season-1', 'season-1-week-02-game-02', 'dice', 29700, 2),
  ('season-1', 'season-1-week-02-game-02', 'aaran', 22300, 3),
  ('season-1', 'season-1-week-02-game-02', 'bena', 14600, 4),
  ('season-1', 'season-1-week-02-game-03', 'bena', 49100, 1),
  ('season-1', 'season-1-week-02-game-03', 'afif', 28300, 2),
  ('season-1', 'season-1-week-02-game-03', 'aaran', 27600, 3),
  ('season-1', 'season-1-week-02-game-04', 'tom', 57700, 1),
  ('season-1', 'season-1-week-02-game-04', 'kah-hui', 37300, 2),
  ('season-1', 'season-1-week-02-game-04', 'aaran', 2500, 3),
  ('season-1', 'season-1-week-02-game-04', 'bena', 2500, 4),
  ('season-1', 'season-1-week-03-game-01', 'mun', 30100, 1),
  ('season-1', 'season-1-week-03-game-01', 'wilson', 26600, 2),
  ('season-1', 'season-1-week-03-game-01', 'art', 26500, 3),
  ('season-1', 'season-1-week-03-game-01', 'vafa', 16800, 4),
  ('season-1', 'season-1-week-03-game-02', 'aaran', 51000, 1),
  ('season-1', 'season-1-week-03-game-02', 'bena', 35000, 2),
  ('season-1', 'season-1-week-03-game-02', 'tom', 12600, 3),
  ('season-1', 'season-1-week-03-game-02', 'eric', 1400, 4),
  ('season-1', 'season-1-week-03-game-03', 'mun', 28600, 1),
  ('season-1', 'season-1-week-03-game-03', 'bena', 28300, 2),
  ('season-1', 'season-1-week-03-game-03', 'aaran', 27100, 3),
  ('season-1', 'season-1-week-03-game-03', 'eric', 16000, 4),
  ('season-1', 'season-1-week-03-game-04', 'adam', 47000, 1),
  ('season-1', 'season-1-week-03-game-04', 'vafa', 30100, 2),
  ('season-1', 'season-1-week-03-game-04', 'kah-hui', 17100, 3),
  ('season-1', 'season-1-week-03-game-04', 'art', 5800, 4),
  ('season-1', 'season-1-week-03-game-05', 'daus', 33800, 1),
  ('season-1', 'season-1-week-03-game-05', 'dice', 27900, 2),
  ('season-1', 'season-1-week-03-game-05', 'vafa', 19500, 3),
  ('season-1', 'season-1-week-03-game-05', 'fatinah', 18800, 4),
  ('season-1', 'season-1-week-03-game-06', 'nick', 63100, 1),
  ('season-1', 'season-1-week-03-game-06', 'art', 22100, 2),
  ('season-1', 'season-1-week-03-game-06', 'vafa', 15000, 3),
  ('season-1', 'season-1-week-03-game-06', 'wilson', -200, 4),
  ('season-1', 'season-1-week-03-game-07', 'eric', 42200, 1),
  ('season-1', 'season-1-week-03-game-07', 'bena', 33600, 2),
  ('season-1', 'season-1-week-03-game-07', 'aaran', 12700, 3),
  ('season-1', 'season-1-week-03-game-07', 'mun', 11500, 4),
  ('season-1', 'season-1-week-04-game-01', 'bena', 62200, 1),
  ('season-1', 'season-1-week-04-game-01', 'eric', 23300, 2),
  ('season-1', 'season-1-week-04-game-01', 'kah-hui', 8300, 3),
  ('season-1', 'season-1-week-04-game-01', 'aaran', 7200, 4),
  ('season-1', 'season-1-week-04-game-02', 'dice', 36500, 1),
  ('season-1', 'season-1-week-04-game-02', 'nick', 30800, 2),
  ('season-1', 'season-1-week-04-game-02', 'vincent', 20200, 3),
  ('season-1', 'season-1-week-04-game-02', 'fatinah', 12500, 4),
  ('season-1', 'season-1-week-04-game-03', 'aaran', 29300, 1),
  ('season-1', 'season-1-week-04-game-03', 'kah-hui', 27800, 2),
  ('season-1', 'season-1-week-04-game-03', 'amir', 25000, 3),
  ('season-1', 'season-1-week-04-game-03', 'eric', 17900, 4),
  ('season-1', 'season-1-week-04-game-04', 'daus', 44600, 1),
  ('season-1', 'season-1-week-04-game-04', 'bena', 19700, 2),
  ('season-1', 'season-1-week-04-game-04', 'aaran', 18000, 3),
  ('season-1', 'season-1-week-04-game-04', 'kah-hui', 17700, 4),
  ('season-1', 'season-1-week-04-game-05', 'wilson', 31700, 1),
  ('season-1', 'season-1-week-04-game-05', 'tom', 31000, 2),
  ('season-1', 'season-1-week-04-game-05', 'insyi', 21800, 3),
  ('season-1', 'season-1-week-04-game-05', 'eric', 15500, 4),
  ('season-1', 'season-1-week-04-game-06', 'bena', 27300, 1),
  ('season-1', 'season-1-week-04-game-06', 'vincent', 26900, 2),
  ('season-1', 'season-1-week-04-game-06', 'aaran', 24900, 3),
  ('season-1', 'season-1-week-04-game-06', 'daus', 20900, 4),
  ('season-1', 'season-1-week-04-game-07', 'fatinah', 42200, 1),
  ('season-1', 'season-1-week-04-game-07', 'dice', 24100, 2),
  ('season-1', 'season-1-week-04-game-07', 'nicholas-lee', 21000, 3),
  ('season-1', 'season-1-week-04-game-07', 'danny', 12700, 4),
  ('season-1', 'season-1-week-04-game-08', 'dice', 59500, 1),
  ('season-1', 'season-1-week-04-game-08', 'aaran', 25200, 2),
  ('season-1', 'season-1-week-04-game-08', 'bena', 13500, 3),
  ('season-1', 'season-1-week-04-game-08', 'adam', 1800, 4),
  ('season-1', 'season-1-week-04-game-09', 'tom', 62800, 1),
  ('season-1', 'season-1-week-04-game-09', 'eric', 29700, 2),
  ('season-1', 'season-1-week-04-game-09', 'fatinah', 12700, 3),
  ('season-1', 'season-1-week-04-game-09', 'daus', -5200, 4),
  ('season-1', 'season-1-week-05-game-01', 'wilson', 44400, 1),
  ('season-1', 'season-1-week-05-game-01', 'bena', 29900, 2),
  ('season-1', 'season-1-week-05-game-01', 'tom', 24600, 3),
  ('season-1', 'season-1-week-05-game-01', 'mun', -2200, 4),
  ('season-1', 'season-1-week-05-game-02', 'eric', 51600, 1),
  ('season-1', 'season-1-week-05-game-02', 'daus', 41200, 2),
  ('season-1', 'season-1-week-05-game-02', 'nick', 8700, 3),
  ('season-1', 'season-1-week-05-game-02', 'aaran', -1600, 4),
  ('season-1', 'season-1-week-05-game-03', 'tom', 34800, 1),
  ('season-1', 'season-1-week-05-game-03', 'mun', 25400, 2),
  ('season-1', 'season-1-week-05-game-03', 'bena', 22700, 3),
  ('season-1', 'season-1-week-05-game-03', 'wilson', 17100, 4),
  ('season-1', 'season-1-week-05-game-04', 'dice', 42600, 1),
  ('season-1', 'season-1-week-05-game-04', 'ben', 26600, 2),
  ('season-1', 'season-1-week-05-game-04', 'fatinah', 18200, 3),
  ('season-1', 'season-1-week-05-game-04', 'akabii', 12600, 4),
  ('season-1', 'season-1-week-05-game-05', 'dice', 43900, 1),
  ('season-1', 'season-1-week-05-game-05', 'ben', 21600, 2),
  ('season-1', 'season-1-week-05-game-05', 'fatinah', 19100, 3),
  ('season-1', 'season-1-week-05-game-05', 'akabii', 15400, 4),
  ('season-1', 'season-1-week-05-game-06', 'gina', 61200, 1),
  ('season-1', 'season-1-week-05-game-06', 'aaran', 20500, 2),
  ('season-1', 'season-1-week-05-game-06', 'bena', 19100, 3),
  ('season-1', 'season-1-week-05-game-06', 'mun', -600, 4),
  ('season-1', 'season-1-week-05-game-07', 'daus', 91300, 1),
  ('season-1', 'season-1-week-05-game-07', 'eric', 8900, 2),
  ('season-1', 'season-1-week-05-game-07', 'leek', 8900, 3),
  ('season-1', 'season-1-week-05-game-07', 'ben', -9100, 4),
  ('season-1', 'season-1-week-05-game-08', 'leek', 47100, 1),
  ('season-1', 'season-1-week-05-game-08', 'fatinah', 30000, 2),
  ('season-1', 'season-1-week-05-game-08', 'dice', 24400, 3),
  ('season-1', 'season-1-week-05-game-08', 'eric', -1500, 4),
  ('season-1', 'season-1-week-05-game-09', 'aaran', 32600, 1),
  ('season-1', 'season-1-week-05-game-09', 'dice', 30200, 2),
  ('season-1', 'season-1-week-05-game-09', 'nick', 29300, 3),
  ('season-1', 'season-1-week-05-game-09', 'wilson', 7900, 4),
  ('season-1', 'season-1-week-05-game-10', 'daus', 39800, 1),
  ('season-1', 'season-1-week-05-game-10', 'bena', 28300, 2),
  ('season-1', 'season-1-week-05-game-10', 'gina', 18900, 3),
  ('season-1', 'season-1-week-05-game-10', 'aaran', 13000, 4),
  ('season-1', 'season-1-week-06-game-01', 'aaran', 39800, 1),
  ('season-1', 'season-1-week-06-game-01', 'tom', 31100, 2),
  ('season-1', 'season-1-week-06-game-01', 'bena', 23900, 3),
  ('season-1', 'season-1-week-06-game-01', 'daus', 5200, 4),
  ('season-1', 'season-1-week-06-game-02', 'tom', 34900, 1),
  ('season-1', 'season-1-week-06-game-02', 'nick', 29500, 2),
  ('season-1', 'season-1-week-06-game-02', 'bena', 24900, 3),
  ('season-1', 'season-1-week-06-game-02', 'amir', 10700, 4),
  ('season-1', 'season-1-week-06-game-03', 'nick', 39100, 1),
  ('season-1', 'season-1-week-06-game-03', 'daus', 28100, 2),
  ('season-1', 'season-1-week-06-game-03', 'eric', 16600, 3),
  ('season-1', 'season-1-week-06-game-03', 'aaran', 16200, 4),
  ('season-1', 'season-1-week-06-game-04', 'bena', 54900, 1),
  ('season-1', 'season-1-week-06-game-04', 'fatinah', 20700, 2),
  ('season-1', 'season-1-week-06-game-04', 'dice', 14700, 3),
  ('season-1', 'season-1-week-06-game-04', 'tom', 9700, 4),
  ('season-1', 'season-1-week-06-game-05', 'dice', 59500, 1),
  ('season-1', 'season-1-week-06-game-05', 'fatinah', 27200, 2),
  ('season-1', 'season-1-week-06-game-05', 'danny', 10000, 3),
  ('season-1', 'season-1-week-06-game-05', 'denzel', 3300, 4),
  ('season-1', 'season-1-week-06-game-06', 'aaran', 44200, 1),
  ('season-1', 'season-1-week-06-game-06', 'daus', 21100, 2),
  ('season-1', 'season-1-week-06-game-06', 'tom', 19600, 3),
  ('season-1', 'season-1-week-06-game-06', 'bena', 15100, 4),
  ('season-1', 'season-1-week-06-game-07', 'daus', 43800, 1),
  ('season-1', 'season-1-week-06-game-07', 'dice', 27300, 2),
  ('season-1', 'season-1-week-06-game-07', 'fatinah', 16900, 3),
  ('season-1', 'season-1-week-06-game-07', 'aaran', 12000, 4),
  ('season-1', 'season-1-week-07-game-01', 'bena', 39700, 1),
  ('season-1', 'season-1-week-07-game-01', 'aaran', 33000, 2),
  ('season-1', 'season-1-week-07-game-01', 'eric', 24400, 3),
  ('season-1', 'season-1-week-07-game-01', 'tom', 2900, 4),
  ('season-1', 'season-1-week-07-game-02', 'aaran', 39200, 1),
  ('season-1', 'season-1-week-07-game-02', 'freya', 20800, 2),
  ('season-1', 'season-1-week-07-game-02', 'bena', 20000, 3),
  ('season-1', 'season-1-week-07-game-02', 'tom', 20000, 4),
  ('season-1', 'season-1-week-07-game-03', 'dice', 37500, 1),
  ('season-1', 'season-1-week-07-game-03', 'eric', 34400, 2),
  ('season-1', 'season-1-week-07-game-03', 'adam', 17300, 3),
  ('season-1', 'season-1-week-07-game-03', 'daus', 10800, 4),
  ('season-1', 'season-1-week-07-game-04', 'aaran', 38100, 1),
  ('season-1', 'season-1-week-07-game-04', 'dice', 35600, 2),
  ('season-1', 'season-1-week-07-game-04', 'daus', 28700, 3),
  ('season-1', 'season-1-week-07-game-04', 'freya', -2400, 4),
  ('season-1', 'season-1-week-07-game-05', 'aaran', 30500, 1),
  ('season-1', 'season-1-week-07-game-05', 'bena', 26100, 2),
  ('season-1', 'season-1-week-07-game-05', 'daus', 21900, 3),
  ('season-1', 'season-1-week-07-game-05', 'erin', 21500, 4),
  ('season-1', 'season-1-week-07-game-06', 'aaron', 40500, 1),
  ('season-1', 'season-1-week-07-game-06', 'sasi', 31100, 2),
  ('season-1', 'season-1-week-07-game-06', 'daus', 30400, 3),
  ('season-1', 'season-1-week-07-game-06', 'eric', -2000, 4),
  ('season-1', 'season-1-week-07-game-07', 'adam', 30000, 1),
  ('season-1', 'season-1-week-07-game-07', 'sasi', 28900, 2),
  ('season-1', 'season-1-week-07-game-07', 'aaron', 27400, 3),
  ('season-1', 'season-1-week-07-game-07', 'eric', 13700, 4),
  ('season-1', 'season-1-week-07-game-08', 'aaran', 40100, 1),
  ('season-1', 'season-1-week-07-game-08', 'daus', 28700, 2),
  ('season-1', 'season-1-week-07-game-08', 'tom', 24500, 3),
  ('season-1', 'season-1-week-07-game-08', 'bena', 6700, 4),
  ('season-1', 'season-1-week-07-game-09', 'aaran', 44800, 1),
  ('season-1', 'season-1-week-07-game-09', 'erin', 27100, 2),
  ('season-1', 'season-1-week-07-game-09', 'tom', 14300, 3),
  ('season-1', 'season-1-week-07-game-09', 'bena', 13800, 4),
  ('season-1', 'season-1-week-07-game-10', 'eric', 39200, 1),
  ('season-1', 'season-1-week-07-game-10', 'aaron', 34700, 2),
  ('season-1', 'season-1-week-07-game-10', 'adam', 28900, 3),
  ('season-1', 'season-1-week-07-game-10', 'sasi', -2800, 4),
  ('season-1', 'season-1-week-08-game-01', 'naavin', 113400, 1),
  ('season-1', 'season-1-week-08-game-01', 'elvin', 10000, 2),
  ('season-1', 'season-1-week-08-game-01', 'bena', -18400, 3),
  ('season-1', 'season-1-week-08-game-02', 'fatinah', 38300, 1),
  ('season-1', 'season-1-week-08-game-02', 'adam', 33400, 2),
  ('season-1', 'season-1-week-08-game-02', 'daus', 26500, 3),
  ('season-1', 'season-1-week-08-game-02', 'dice', 1800, 4),
  ('season-1', 'season-1-week-08-game-03', 'daus', 43200, 1),
  ('season-1', 'season-1-week-08-game-03', 'adam', 30500, 2),
  ('season-1', 'season-1-week-08-game-03', 'dice', 27600, 3),
  ('season-1', 'season-1-week-08-game-03', 'fatinah', -1300, 4),
  ('season-1', 'season-1-week-08-game-04', 'sasi', 36400, 1),
  ('season-1', 'season-1-week-08-game-04', 'aaron', 34600, 2),
  ('season-1', 'season-1-week-08-game-04', 'freya', 21600, 3),
  ('season-1', 'season-1-week-08-game-04', 'aaran', 7400, 4),
  ('season-1', 'season-1-week-08-game-05', 'bena', 48400, 1),
  ('season-1', 'season-1-week-08-game-05', 'naavin', 34500, 2),
  ('season-1', 'season-1-week-08-game-05', 'elvin', 16900, 3),
  ('season-1', 'season-1-week-08-game-05', 'eric', 200, 4),
  ('season-1', 'season-1-week-08-game-06', 'eric', 28900, 1),
  ('season-1', 'season-1-week-08-game-06', 'bena', 25500, 2),
  ('season-1', 'season-1-week-08-game-06', 'naavin', 23600, 3),
  ('season-1', 'season-1-week-08-game-06', 'elvin', 22000, 4),
  ('season-1', 'season-1-week-08-game-07', 'dice', 39100, 1),
  ('season-1', 'season-1-week-08-game-07', 'daus', 36400, 2),
  ('season-1', 'season-1-week-08-game-07', 'aaron', 25000, 3),
  ('season-1', 'season-1-week-08-game-07', 'adam', -500, 4),
  ('season-1', 'season-1-week-08-game-08', 'fatinah', 39500, 1),
  ('season-1', 'season-1-week-08-game-08', 'aaran', 32500, 2),
  ('season-1', 'season-1-week-08-game-08', 'sasi', 28700, 3),
  ('season-1', 'season-1-week-08-game-08', 'tom', -700, 4),
  ('season-1', 'season-1-week-08-game-09', 'aaron', 50800, 1),
  ('season-1', 'season-1-week-08-game-09', 'sasi', 28100, 2),
  ('season-1', 'season-1-week-08-game-09', 'bena', 23100, 3),
  ('season-1', 'season-1-week-08-game-09', 'kah-hui', -1900, 4),
  ('season-1', 'season-1-week-08-game-10', 'daus', 38200, 1),
  ('season-1', 'season-1-week-08-game-10', 'eric', 26900, 2),
  ('season-1', 'season-1-week-08-game-10', 'aaran', 23800, 3),
  ('season-1', 'season-1-week-08-game-10', 'tom', 11100, 4),
  ('season-1', 'season-1-week-08-game-11', 'aaran', 41000, 1),
  ('season-1', 'season-1-week-08-game-11', 'eric', 38100, 2),
  ('season-1', 'season-1-week-08-game-11', 'bena', 25900, 3),
  ('season-1', 'season-1-week-08-game-12', 'aaran', 66000, 1),
  ('season-1', 'season-1-week-08-game-12', 'eric', 40600, 2),
  ('season-1', 'season-1-week-08-game-12', 'bena', -1600, 3),
  ('season-1', 'season-1-week-09-game-01', 'aaran', 33600, 1),
  ('season-1', 'season-1-week-09-game-01', 'aaron', 28700, 2),
  ('season-1', 'season-1-week-09-game-01', 'adam', 24600, 3),
  ('season-1', 'season-1-week-09-game-01', 'greg', 13100, 4),
  ('season-1', 'season-1-week-09-game-02', 'daus', 51600, 1),
  ('season-1', 'season-1-week-09-game-02', 'bena', 32100, 2),
  ('season-1', 'season-1-week-09-game-02', 'eric', 21300, 3),
  ('season-1', 'season-1-week-09-game-03', 'daus', 48100, 1),
  ('season-1', 'season-1-week-09-game-03', 'eric', 45400, 2),
  ('season-1', 'season-1-week-09-game-03', 'bena', 11500, 3),
  ('season-1', 'season-1-week-09-game-04', 'fatinah', 53300, 1),
  ('season-1', 'season-1-week-09-game-04', 'tom', 28800, 2),
  ('season-1', 'season-1-week-09-game-04', 'dice', 11500, 3),
  ('season-1', 'season-1-week-09-game-04', 'freya', 6400, 4),
  ('season-1', 'season-1-week-09-game-05', 'aaron', 44700, 1),
  ('season-1', 'season-1-week-09-game-05', 'adam', 39700, 2),
  ('season-1', 'season-1-week-09-game-05', 'aaran', 11200, 3),
  ('season-1', 'season-1-week-09-game-05', 'greg', 4400, 4),
  ('season-1', 'season-1-week-09-game-06', 'bena', 53400, 1),
  ('season-1', 'season-1-week-09-game-06', 'elvin', 25300, 2),
  ('season-1', 'season-1-week-09-game-06', 'eric', 21500, 3),
  ('season-1', 'season-1-week-09-game-06', 'naavin', -200, 4),
  ('season-1', 'season-1-week-09-game-07', 'daus', 38600, 1),
  ('season-1', 'season-1-week-09-game-07', 'adam', 23400, 2),
  ('season-1', 'season-1-week-09-game-07', 'tom', 23400, 3),
  ('season-1', 'season-1-week-09-game-07', 'dice', 14600, 4),
  ('season-1', 'season-1-week-09-game-08', 'dice', 33100, 1),
  ('season-1', 'season-1-week-09-game-08', 'fatinah', 32100, 2),
  ('season-1', 'season-1-week-09-game-08', 'akabii', 23900, 3),
  ('season-1', 'season-1-week-09-game-08', 'daus', 10900, 4),
  ('season-1', 'season-1-week-09-game-09', 'aaran', 41300, 1),
  ('season-1', 'season-1-week-09-game-09', 'naavin', 29800, 2),
  ('season-1', 'season-1-week-09-game-09', 'elvin', 17500, 3),
  ('season-1', 'season-1-week-09-game-09', 'aaron', 11400, 4),
  ('season-1', 'season-1-week-09-game-10', 'dennis', 35200, 1),
  ('season-1', 'season-1-week-09-game-10', 'bena', 31400, 2),
  ('season-1', 'season-1-week-09-game-10', 'eric', 20400, 3),
  ('season-1', 'season-1-week-09-game-10', 'martin', 13000, 4),
  ('season-1', 'season-1-week-09-game-11', 'tom', 36100, 1),
  ('season-1', 'season-1-week-09-game-11', 'naavin', 26600, 2),
  ('season-1', 'season-1-week-09-game-11', 'elvin', 19200, 3),
  ('season-1', 'season-1-week-09-game-11', 'aaron', 18100, 4),
  ('season-1', 'season-1-week-09-game-12', 'eric', 52200, 1),
  ('season-1', 'season-1-week-09-game-12', 'naavin', 22000, 2),
  ('season-1', 'season-1-week-09-game-12', 'elvin', 20000, 3),
  ('season-1', 'season-1-week-09-game-12', 'aaran', 5800, 4);
