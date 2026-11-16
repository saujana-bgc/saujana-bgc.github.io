create or replace function public.get_recent_named_visitors()
returns table (name text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (lower(btrim(v.name))) btrim(v.name) as name
  from public.visitors as v
  where coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'birthday_admin'
    and v.name is not null
    and btrim(v.name) <> ''
    and v.visited_at >= ((now() at time zone 'Asia/Kuala_Lumpur')::date - 6)::timestamp at time zone 'Asia/Kuala_Lumpur'
    and v.visited_at < (((now() at time zone 'Asia/Kuala_Lumpur')::date + 1)::timestamp at time zone 'Asia/Kuala_Lumpur')
  order by lower(btrim(v.name)), v.visited_at desc
$$;

revoke all on function public.get_recent_named_visitors() from public, anon;
grant execute on function public.get_recent_named_visitors() to authenticated;
