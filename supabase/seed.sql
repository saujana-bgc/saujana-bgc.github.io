-- Local-only fixtures. Never include production attendees or credentials here.
insert into public.riichi_open_events(slug, name, event_date, start_time, timezone, venue, payment_phone, payment_recipient, entry_fee_sen, capacity, registration_open)
values ('riichi-open-i', 'Riichi Open I (Local)', '2027-11-14', '14:30', 'Asia/Kuala_Lumpur', 'Local development fixture', '+60000000000', 'LOCAL FIXTURE', 1000, 16, true)
on conflict (slug) do update set
  name = excluded.name,
  event_date = excluded.event_date,
  start_time = excluded.start_time,
  timezone = excluded.timezone,
  venue = excluded.venue,
  payment_phone = excluded.payment_phone,
  payment_recipient = excluded.payment_recipient,
  entry_fee_sen = excluded.entry_fee_sen,
  capacity = excluded.capacity,
  registration_open = excluded.registration_open;

do $$
begin
  if not exists (select 1 from public.events where name = 'Local Development Gathering') then
    insert into public.events(name, date, venue, time, venue_url, description)
    values (
      'Local Development Gathering', current_date + 14, 'Local fixture venue',
      '14:00', 'https://example.com/local-fixture', 'Development-only attendance fixture.'
    );
  end if;
end
$$;

insert into public.riichi_league_seasons(id, season_number, name, start_date, end_date, status, total_weeks, best_results_count, supported_table_sizes, scoring)
values (
  'local-season', 999, 'Local Development Season', current_date - 7, current_date + 30,
  'active', 1, 1, array[3, 4]::smallint[],
  '{"threePlayer":{"first":30,"second":10,"third":-10},"fourPlayer":{"first":40,"second":10,"third":-10,"fourth":-20}}'::jsonb
)
on conflict (id) do nothing;

insert into public.riichi_league_weeks(id, season_id, week_number, event_date, status)
values ('local-season-week-1', 'local-season', 1, current_date, 'active')
on conflict (id) do nothing;
