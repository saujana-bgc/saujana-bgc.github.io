drop policy if exists "public insert upcoming attendees" on public.attendees;
create policy "public insert upcoming attendees"
  on public.attendees for insert to anon
  with check (exists (
    select 1 from public.events e
    where e.id = attendees.event_id
      and (now() at time zone 'Asia/Kuala_Lumpur')::date <= e.date + 2
  ));

drop policy if exists "public update" on public.attendees;
create policy "public update"
  on public.attendees for update to anon
  using (exists (
    select 1 from public.events e
    where e.id = attendees.event_id
      and (now() at time zone 'Asia/Kuala_Lumpur')::date <= e.date + 2
  ))
  with check (exists (
    select 1 from public.events e
    where e.id = attendees.event_id
      and (now() at time zone 'Asia/Kuala_Lumpur')::date <= e.date + 2
  ));

drop policy if exists "public delete" on public.attendees;
create policy "public delete"
  on public.attendees for delete to anon
  using (exists (
    select 1 from public.events e
    where e.id = attendees.event_id
      and (now() at time zone 'Asia/Kuala_Lumpur')::date <= e.date + 2
  ));
