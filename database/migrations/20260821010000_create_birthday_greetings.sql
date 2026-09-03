create table public.birthday_greetings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_month smallint not null,
  birth_day smallint not null,
  allow_public_greeting boolean not null default false,
  created_at timestamptz not null default now(),
  constraint birthday_greetings_name_length
    check (char_length(btrim(name)) between 1 and 80),
  constraint birthday_greetings_month_range
    check (birth_month between 1 and 12),
  constraint birthday_greetings_valid_day
    check (
      birth_day between 1 and case
        when birth_month = 2 then 29
        when birth_month in (4, 6, 9, 11) then 30
        else 31
      end
    )
);

alter table public.birthday_greetings enable row level security;

revoke all on table public.birthday_greetings from anon, authenticated;
grant insert (name, birth_month, birth_day, allow_public_greeting)
  on table public.birthday_greetings to anon, authenticated;

create policy "Anyone can submit a birthday"
  on public.birthday_greetings
  for insert
  to anon, authenticated
  with check (true);

comment on table public.birthday_greetings is
  'Private birthday submissions collected through the Saujana BGC birthday page.';

comment on column public.birthday_greetings.allow_public_greeting is
  'Explicit permission to greet the person by their submitted name on Instagram and community channels.';
