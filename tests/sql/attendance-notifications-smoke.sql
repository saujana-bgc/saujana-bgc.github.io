begin;

set local role service_role;
select public.attendance_notifications_set_switches(true, false);
reset role;

do $$
declare
  event_key bigint;
  attendee_key bigint;
  inserted_jobs integer;
  updated_jobs integer;
  deleted_jobs integer;
  job_record record;
  next_job_record record;
begin
  if has_function_privilege('anon', 'public.attendance_notifications_claim(integer,integer)', 'EXECUTE') then
    raise exception 'anon can claim attendance jobs';
  end if;
  if has_schema_privilege('anon', 'app_private', 'USAGE') then
    raise exception 'anon can use the private notification schema';
  end if;
  if not has_function_privilege('service_role', 'public.attendance_notifications_claim(integer,integer)', 'EXECUTE') then
    raise exception 'service_role cannot claim attendance jobs';
  end if;

  select id into event_key from public.events order by id limit 1;
  if event_key is null then raise exception 'local event fixture is missing'; end if;
  insert into public.attendees(event_id,name,notes) values(event_key,'Notification fixture','original') returning id into attendee_key;
  update public.attendees set notes='original' where id=attendee_key;
  update public.attendees set notes='updated' where id=attendee_key;
  delete from public.attendees where id=attendee_key;

  select count(*) into inserted_jobs from app_private.attendance_notification_jobs where attendee_id=attendee_key and operation='INSERT';
  select count(*) into updated_jobs from app_private.attendance_notification_jobs where attendee_id=attendee_key and operation='UPDATE';
  select count(*) into deleted_jobs from app_private.attendance_notification_jobs where attendee_id=attendee_key and operation='DELETE';
  if inserted_jobs <> 1 or updated_jobs <> 1 or deleted_jobs <> 1 then
    raise exception 'unexpected capture counts: insert %, update %, delete %', inserted_jobs, updated_jobs, deleted_jobs;
  end if;
  if exists(select 1 from app_private.attendance_notification_jobs where attendee_id=attendee_key and operation='DELETE' and payload->>'name' <> 'Notification fixture') then
    raise exception 'delete snapshot did not preserve attendee details';
  end if;

  perform public.attendance_notifications_set_switches(true, true);
  select * into job_record from public.attendance_notifications_claim(10, 300);
  if not found or job_record.operation <> 'INSERT' then raise exception 'first job was not claimed in attendee order'; end if;
  if not public.attendance_notifications_complete(job_record.id, job_record.lease_token, '[101]'::jsonb) then
    raise exception 'first job acknowledgement failed';
  end if;

  select * into job_record from public.attendance_notifications_claim(10, 300);
  if not found or job_record.operation <> 'UPDATE' then raise exception 'second job was not claimed in attendee order'; end if;
  if not public.attendance_notifications_retry(job_record.id, job_record.lease_token, 60, 'smoke_retry') then
    raise exception 'job retry did not return to pending';
  end if;
  select * into next_job_record from public.attendance_notifications_claim(10, 300);
  if found then raise exception 'later attendee job bypassed the earlier retry'; end if;
  if not public.attendance_notifications_discard(job_record.id) then raise exception 'pending job could not be discarded'; end if;

  select * into job_record from public.attendance_notifications_claim(10, 300);
  if not found or job_record.operation <> 'DELETE' or job_record.payload->>'name' <> 'Notification fixture' then
    raise exception 'delete did not become claimable with its preserved snapshot';
  end if;
  if not public.attendance_notifications_complete(job_record.id, job_record.lease_token, '[102]'::jsonb) then
    raise exception 'delete job acknowledgement failed';
  end if;
end;
$$;

rollback;
