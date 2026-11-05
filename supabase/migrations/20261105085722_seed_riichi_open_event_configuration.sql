-- Bootstrap the required Riichi Open public event when deploying to a new database.
-- Keep existing event configuration and registration state intact on conflict.
insert into public.riichi_open_events(
  slug, name, event_date, start_time, timezone, venue,
  payment_phone, payment_recipient, entry_fee_sen, capacity, registration_open
)
values (
  'riichi-open-i', 'Riichi Open I', '2026-11-14', '14:30', 'Asia/Kuala_Lumpur',
  'Boardroom Bandit, Ara Damansara', '+60162459482', 'NICHOLAS', 1000, 16, true
)
on conflict (slug) do nothing;
