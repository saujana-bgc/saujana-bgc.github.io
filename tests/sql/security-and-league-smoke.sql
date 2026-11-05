-- Verify birthday rows stay private to the birthday_admin JWT role and the
-- public league submission RPC remains callable. All fixture writes roll back.
begin;

insert into public.birthday_greetings(name, birth_month, birth_day, allow_public_greeting)
values ('Local RLS Probe', 1, 1, false);

set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"not_birthday_admin"}}';
do $$ begin
  if (select count(*) from public.birthday_greetings where name='Local RLS Probe') <> 0 then
    raise exception 'Non-admin role saw a birthday row';
  end if;
end $$;

set local request.jwt.claims = '{"app_metadata":{"role":"birthday_admin"}}';
do $$ begin
  if (select count(*) from public.birthday_greetings where name='Local RLS Probe') <> 1 then
    raise exception 'birthday_admin role could not read birthday row';
  end if;
end $$;

reset role;
set local role anon;
select public.submit_riichi_match(
  'local-season-week-1',
  '[{"player_name":"Local Probe A","final_points":100000},{"player_name":"Local Probe B","final_points":90000},{"player_name":"Local Probe C","final_points":80000}]'::jsonb
);

rollback;
