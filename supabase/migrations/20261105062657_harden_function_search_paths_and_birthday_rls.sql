-- Pin the trigger function's object resolution and avoid per-row JWT function calls.
alter function public.enforce_riichi_capacity() set search_path = '';

alter policy "Birthday admins can view birthdays"
  on public.birthday_greetings
  using (
    coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'birthday_admin'
  );
