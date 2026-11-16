create schema if not exists visitor_private;
revoke all on schema visitor_private from public, anon, authenticated;
grant usage on schema visitor_private to authenticated;

create function visitor_private.get_recent_named_visitors_by_date()
returns table (name text, visited_on date)
language sql
stable
security definer
set search_path = ''
as $$
  with named_visits as (
    select
      regexp_replace(v.name, '^[[:space:]]+|[[:space:]]+$', '', 'g') as name,
      v.visited_at,
      v.id
    from public.visitors as v
    where (select auth.uid()) is not null
      and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'birthday_admin'
      and v.name is not null
      and v.visited_at >= (((now() at time zone 'Asia/Kuala_Lumpur')::date - 6)::timestamp at time zone 'Asia/Kuala_Lumpur')
      and v.visited_at <= now()
  ), latest_visits as (
    select distinct on (lower(v.name)) v.name, v.visited_at
    from named_visits as v
    where v.name <> ''
    order by lower(v.name), v.visited_at desc, v.id desc
  )
  select v.name, (v.visited_at at time zone 'Asia/Kuala_Lumpur')::date
  from latest_visits as v
$$;

revoke all on function visitor_private.get_recent_named_visitors_by_date() from public, anon, authenticated;
grant execute on function visitor_private.get_recent_named_visitors_by_date() to authenticated;

create function public.get_recent_named_visitors_by_date()
returns table (name text, visited_on date)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.name, v.visited_on
  from visitor_private.get_recent_named_visitors_by_date() as v
  order by v.visited_on desc, lower(v.name)
$$;

revoke all on function public.get_recent_named_visitors_by_date() from public, anon, authenticated;
grant execute on function public.get_recent_named_visitors_by_date() to authenticated;
