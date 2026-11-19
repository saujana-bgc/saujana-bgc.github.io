-- Confirm attendee sign-up, edit and delete work without a notification trigger.
-- This test uses only the local seed event and rolls all writes back.
begin;
set local role anon;

do $$
declare
  v_event_id bigint;
  v_rows integer;
begin
  select id into strict v_event_id
  from public.events
  where name = 'Local Development Gathering';

  insert into public.attendees(event_id, name, notes)
  values (v_event_id, 'Local Attendance Probe', 'Temporary write-path check');
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'Attendance insert affected % rows', v_rows; end if;

  update public.attendees set notes = 'Updated by local smoke test'
  where name = 'Local Attendance Probe' and event_id = v_event_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'Attendance update affected % rows', v_rows; end if;

  delete from public.attendees
  where name = 'Local Attendance Probe' and event_id = v_event_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'Attendance delete affected % rows', v_rows; end if;
end $$;

rollback;
