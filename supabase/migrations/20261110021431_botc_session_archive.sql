create table public.botc_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  session_time text,
  venue text,
  signup_url text,
  first_timer_note text,
  teaser text,
  recap text,
  featured_game_id uuid,
  published boolean not null default false,
  games jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint botc_sessions_games_array check (jsonb_typeof(games) = 'array')
);

create table public.botc_players (
  id uuid primary key default gen_random_uuid(),
  private_name text not null unique,
  public_name text,
  created_at timestamptz not null default now(),
  constraint botc_players_name_length check (length(trim(private_name)) between 1 and 100)
);

create index botc_sessions_public_date_idx on public.botc_sessions (session_date desc) where published;

alter table public.botc_sessions enable row level security;
alter table public.botc_players enable row level security;
revoke all on public.botc_sessions, public.botc_players from anon, authenticated;
grant all on public.botc_sessions, public.botc_players to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('botc-session-photos', 'botc-session-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Clocktower admins manage session photos"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'botc-session-photos'
    and coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'birthday_admin'
  )
  with check (
    bucket_id = 'botc-session-photos'
    and coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'birthday_admin'
  );
