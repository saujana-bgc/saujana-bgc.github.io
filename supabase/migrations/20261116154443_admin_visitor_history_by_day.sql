create or replace function visitor_private.get_recent_named_visitors_by_date()
returns table (name text, visited_on date)
language sql
stable
security definer
set search_path = ''
as $$
  with named_visits as (
    select
      regexp_replace(v.name, '^[[:space:]]+|[[:space:]]+$', '', 'g') as name,
      (v.visited_at at time zone 'Asia/Kuala_Lumpur')::date as visited_on,
      v.visited_at,
      v.id
    from public.visitors as v
    where (select auth.uid()) is not null
      and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'birthday_admin'
      and v.name is not null
      and v.visited_at >= (((now() at time zone 'Asia/Kuala_Lumpur')::date - 6)::timestamp at time zone 'Asia/Kuala_Lumpur')
      and v.visited_at <= now()
  )
  select distinct on (v.visited_on, lower(v.name)) v.name, v.visited_on
  from named_visits as v
  where v.name <> ''
  order by v.visited_on, lower(v.name), v.visited_at desc, v.id desc
$$;
