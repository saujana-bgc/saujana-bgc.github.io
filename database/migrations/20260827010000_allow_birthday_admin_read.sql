revoke select on table public.birthday_greetings from anon;

grant select (
  id,
  name,
  birth_month,
  birth_day,
  allow_public_greeting,
  created_at
) on table public.birthday_greetings to authenticated;

drop policy if exists "Birthday admins can view birthdays"
  on public.birthday_greetings;

create policy "Birthday admins can view birthdays"
  on public.birthday_greetings
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'birthday_admin'
  );

comment on policy "Birthday admins can view birthdays"
  on public.birthday_greetings is
  'Restricts the private birthday calendar to accounts assigned the birthday_admin app role.';
