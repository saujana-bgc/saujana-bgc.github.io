-- Durable attendance notification queue. Capture and delivery start disabled.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to service_role;

create table app_private.attendance_notification_settings (
  singleton boolean primary key default true check (singleton),
  capture_enabled boolean not null default false,
  delivery_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table app_private.attendance_notification_settings enable row level security;
revoke all on app_private.attendance_notification_settings from public, anon, authenticated, service_role;
insert into app_private.attendance_notification_settings(singleton) values (true) on conflict do nothing;

create table app_private.attendance_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  queue_order bigint generated always as identity unique,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  attendee_id bigint not null,
  event_id bigint not null,
  occurred_at timestamptz not null default now(),
  payload jsonb,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed','discarded')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  delivery_metadata jsonb,
  last_error_category text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index attendance_notification_jobs_pending_idx on app_private.attendance_notification_jobs(next_attempt_at, created_at) where status in ('pending','processing');
create index attendance_notification_jobs_attendee_order_idx on app_private.attendance_notification_jobs(attendee_id, queue_order);
alter table app_private.attendance_notification_jobs enable row level security;
revoke all on app_private.attendance_notification_jobs from public, anon, authenticated, service_role;

create function app_private.enqueue_attendance_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  attendee public.attendees%rowtype;
  op text;
  event_name text;
  event_date date;
  enabled boolean;
begin
  select s.capture_enabled into enabled from app_private.attendance_notification_settings s where s.singleton;
  if enabled is distinct from true then return null; end if;
  if tg_op = 'UPDATE' then
    if (old.name, old.event_id, old.eta, old.amount_spent, old.bringing_games, old.notes)
       is not distinct from (new.name, new.event_id, new.eta, new.amount_spent, new.bringing_games, new.notes) then return new; end if;
    attendee := new; op := 'UPDATE';
  elsif tg_op = 'INSERT' then attendee := new; op := 'INSERT';
  else attendee := old; op := 'DELETE';
  end if;
  select e.name, e.date into event_name, event_date from public.events e where e.id = attendee.event_id;
  insert into app_private.attendance_notification_jobs(operation, attendee_id, event_id, payload)
  values (op, attendee.id, attendee.event_id, jsonb_build_object(
    'name', attendee.name, 'eta', attendee.eta, 'amount_spent', attendee.amount_spent,
    'bringing_games', attendee.bringing_games, 'notes', attendee.notes,
    'event_name', event_name, 'event_date', event_date));
  return null;
end;
$$;
alter function app_private.enqueue_attendance_notification() owner to postgres;
revoke all on function app_private.enqueue_attendance_notification() from public, anon, authenticated, service_role;
drop trigger if exists attendance_notification_enqueue on public.attendees;
create trigger attendance_notification_enqueue after insert or update or delete on public.attendees
for each row execute function app_private.enqueue_attendance_notification();

create function app_private.claim_attendance_notification_jobs(p_batch_size integer, p_lease_seconds integer)
returns table(id uuid, operation text, attendee_id bigint, event_id bigint, payload jsonb, attempts integer, lease_token uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if p_batch_size < 1 or p_batch_size > 10 or p_lease_seconds < 30 or p_lease_seconds > 600 then raise exception 'invalid claim parameters'; end if;
  if not exists (select 1 from app_private.attendance_notification_settings s where s.singleton and s.delivery_enabled) then return; end if;
  return query
  with candidates as (
    select j.id from app_private.attendance_notification_jobs j
    where ((j.status = 'pending' and j.next_attempt_at <= now()) or (j.status = 'processing' and j.lease_until < now()))
      and not exists (
        select 1 from app_private.attendance_notification_jobs earlier
        where earlier.attendee_id = j.attendee_id and earlier.queue_order < j.queue_order
          and earlier.status not in ('delivered','discarded'))
    order by j.queue_order for update of j skip locked limit p_batch_size
  ), claimed as (
    update app_private.attendance_notification_jobs j
    set status='processing', attempts=j.attempts+1, lease_token=gen_random_uuid(),
        lease_until=now()+make_interval(secs=>p_lease_seconds)
    from candidates c where j.id=c.id
    returning j.id,j.operation,j.attendee_id,j.event_id,j.payload,j.attempts,j.lease_token
  ) select * from claimed;
end;
$$;

create function app_private.complete_attendance_notification(p_id uuid,p_lease_token uuid,p_message_ids jsonb)
returns boolean language sql security definer set search_path = '' as $$
  with changed as (update app_private.attendance_notification_jobs set status='delivered',payload=null,
    delivery_metadata=jsonb_build_object('telegram_message_ids',p_message_ids),delivered_at=now(),
    lease_token=null,lease_until=null,last_error_category=null
    where id=p_id and status='processing' and lease_token=p_lease_token returning 1)
  select exists(select 1 from changed);
$$;

create function app_private.retry_attendance_notification(p_id uuid,p_lease_token uuid,p_delay_seconds integer,p_category text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_delay_seconds < 1 or p_delay_seconds > 86400 then raise exception 'invalid retry delay'; end if;
  update app_private.attendance_notification_jobs set status='pending',next_attempt_at=now()+make_interval(secs=>p_delay_seconds),
    lease_token=null,lease_until=null,last_error_category=left(p_category,64)
    where id=p_id and status='processing' and lease_token=p_lease_token and attempts < 10;
  if found then return true; end if;
  update app_private.attendance_notification_jobs set status='failed',lease_token=null,lease_until=null,
    last_error_category=left(p_category,64) where id=p_id and status='processing' and lease_token=p_lease_token;
  return found;
end;
$$;

create function app_private.fail_attendance_notification(p_id uuid,p_lease_token uuid,p_category text)
returns boolean language sql security definer set search_path = '' as $$
  with changed as (update app_private.attendance_notification_jobs set status='failed',lease_token=null,lease_until=null,
    last_error_category=left(p_category,64) where id=p_id and status='processing' and lease_token=p_lease_token returning 1)
  select exists(select 1 from changed);
$$;

create function app_private.set_attendance_notification_switches(p_capture boolean,p_delivery boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update app_private.attendance_notification_settings set capture_enabled=p_capture,delivery_enabled=p_delivery,updated_at=now()
  where singleton;
end;
$$;
create function app_private.retry_failed_attendance_notification(p_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  with changed as (update app_private.attendance_notification_jobs set status='pending',attempts=0,next_attempt_at=now(),
    last_error_category=null,lease_token=null,lease_until=null where id=p_id and status='failed' returning 1)
  select exists(select 1 from changed);
$$;
create function app_private.discard_attendance_notification(p_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  with changed as (update app_private.attendance_notification_jobs set status='discarded',payload=null,lease_token=null,lease_until=null
    where id=p_id and status in ('pending','failed') returning 1)
  select exists(select 1 from changed);
$$;
create function app_private.attendance_notification_stats()
returns table(status text,job_count bigint,oldest_pending_at timestamptz)
language sql security definer set search_path = '' as $$
  select j.status,count(*),min(j.created_at) from app_private.attendance_notification_jobs j group by j.status order by j.status;
$$;
create function app_private.purge_attendance_notification_history()
returns bigint language plpgsql security definer set search_path = '' as $$
declare removed bigint;
begin
  delete from app_private.attendance_notification_jobs
  where (status='delivered' and delivered_at < now()-interval '30 days')
     or (status='discarded' and created_at < now()-interval '30 days');
  get diagnostics removed=row_count;
  return removed;
end;
$$;

create function public.attendance_notifications_claim(p_batch_size integer default 5,p_lease_seconds integer default 120)
returns table(id uuid,operation text,attendee_id bigint,event_id bigint,payload jsonb,attempts integer,lease_token uuid)
language sql security invoker set search_path = '' as $$ select * from app_private.claim_attendance_notification_jobs(p_batch_size,p_lease_seconds); $$;
create function public.attendance_notifications_complete(p_id uuid,p_lease_token uuid,p_message_ids jsonb)
returns boolean language sql security invoker set search_path = '' as $$ select app_private.complete_attendance_notification(p_id,p_lease_token,p_message_ids); $$;
create function public.attendance_notifications_retry(p_id uuid,p_lease_token uuid,p_delay_seconds integer,p_category text)
returns boolean language sql security invoker set search_path = '' as $$ select app_private.retry_attendance_notification(p_id,p_lease_token,p_delay_seconds,p_category); $$;
create function public.attendance_notifications_fail(p_id uuid,p_lease_token uuid,p_category text)
returns boolean language sql security invoker set search_path = '' as $$ select app_private.fail_attendance_notification(p_id,p_lease_token,p_category); $$;
create function public.attendance_notifications_set_switches(p_capture boolean,p_delivery boolean)
returns void language sql security invoker set search_path = '' as $$ select app_private.set_attendance_notification_switches(p_capture,p_delivery); $$;
create function public.attendance_notifications_retry_failed(p_id uuid)
returns boolean language sql security invoker set search_path = '' as $$ select app_private.retry_failed_attendance_notification(p_id); $$;
create function public.attendance_notifications_discard(p_id uuid)
returns boolean language sql security invoker set search_path = '' as $$ select app_private.discard_attendance_notification(p_id); $$;
create function public.attendance_notifications_stats()
returns table(status text,job_count bigint,oldest_pending_at timestamptz)
language sql security invoker set search_path = '' as $$ select * from app_private.attendance_notification_stats(); $$;
create function public.attendance_notifications_purge()
returns bigint language sql security invoker set search_path = '' as $$ select app_private.purge_attendance_notification_history(); $$;

alter function app_private.claim_attendance_notification_jobs(integer,integer) owner to postgres;
alter function app_private.complete_attendance_notification(uuid,uuid,jsonb) owner to postgres;
alter function app_private.retry_attendance_notification(uuid,uuid,integer,text) owner to postgres;
alter function app_private.fail_attendance_notification(uuid,uuid,text) owner to postgres;
alter function app_private.set_attendance_notification_switches(boolean,boolean) owner to postgres;
alter function app_private.retry_failed_attendance_notification(uuid) owner to postgres;
alter function app_private.discard_attendance_notification(uuid) owner to postgres;
alter function app_private.attendance_notification_stats() owner to postgres;
alter function app_private.purge_attendance_notification_history() owner to postgres;

revoke all on all functions in schema app_private from public,anon,authenticated;
grant execute on function app_private.claim_attendance_notification_jobs(integer,integer) to service_role;
grant execute on function app_private.complete_attendance_notification(uuid,uuid,jsonb) to service_role;
grant execute on function app_private.retry_attendance_notification(uuid,uuid,integer,text) to service_role;
grant execute on function app_private.fail_attendance_notification(uuid,uuid,text) to service_role;
grant execute on function app_private.set_attendance_notification_switches(boolean,boolean) to service_role;
grant execute on function app_private.retry_failed_attendance_notification(uuid) to service_role;
grant execute on function app_private.discard_attendance_notification(uuid) to service_role;
grant execute on function app_private.attendance_notification_stats() to service_role;
grant execute on function app_private.purge_attendance_notification_history() to service_role;
revoke all on function public.attendance_notifications_claim(integer,integer) from public,anon,authenticated;
revoke all on function public.attendance_notifications_complete(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.attendance_notifications_retry(uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.attendance_notifications_fail(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.attendance_notifications_set_switches(boolean,boolean) from public,anon,authenticated;
revoke all on function public.attendance_notifications_retry_failed(uuid) from public,anon,authenticated;
revoke all on function public.attendance_notifications_discard(uuid) from public,anon,authenticated;
revoke all on function public.attendance_notifications_stats() from public,anon,authenticated;
revoke all on function public.attendance_notifications_purge() from public,anon,authenticated;
grant execute on function public.attendance_notifications_claim(integer,integer) to service_role;
grant execute on function public.attendance_notifications_complete(uuid,uuid,jsonb) to service_role;
grant execute on function public.attendance_notifications_retry(uuid,uuid,integer,text) to service_role;
grant execute on function public.attendance_notifications_fail(uuid,uuid,text) to service_role;
grant execute on function public.attendance_notifications_set_switches(boolean,boolean) to service_role;
grant execute on function public.attendance_notifications_retry_failed(uuid) to service_role;
grant execute on function public.attendance_notifications_discard(uuid) to service_role;
grant execute on function public.attendance_notifications_stats() to service_role;
grant execute on function public.attendance_notifications_purge() to service_role;
