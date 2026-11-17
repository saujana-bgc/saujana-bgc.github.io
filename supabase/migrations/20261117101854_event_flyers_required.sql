alter table public.events
  add column flyer_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-flyers',
  'event-flyers',
  true,
  12582912,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.require_event_flyer_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.flyer_path is null or pg_catalog.btrim(new.flyer_path) = '' then
    raise exception using
      errcode = '23514',
      message = 'A flyer is required when creating an event';
  end if;

  return new;
end;
$$;

revoke all on function public.require_event_flyer_on_insert() from public, anon, authenticated;

create trigger events_require_flyer_on_insert
before insert on public.events
for each row
execute function public.require_event_flyer_on_insert();
