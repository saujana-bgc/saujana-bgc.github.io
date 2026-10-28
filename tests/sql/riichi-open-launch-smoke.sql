-- Every fixture write is rolled back inside the exception subtransaction.
-- Unexpected failures propagate; only the final success sentinel is caught.
do $smoke$
declare
  original_event public.riichi_open_events%rowtype;
  baseline_registrations bigint;
  baseline_holds bigint;
  baseline_participants bigint;
  baseline_audit bigint;
  fingerprint text := repeat(md5(gen_random_uuid()::text),2);
  token_a text := repeat(md5(gen_random_uuid()::text),2);
  token_b text := repeat(md5(gen_random_uuid()::text),2);
  token_c text := repeat(md5(gen_random_uuid()::text),2);
  token_d text := repeat(md5(gen_random_uuid()::text),2);
  key_a text := gen_random_uuid()::text;
  key_b text := gen_random_uuid()::text;
  key_c text := gen_random_uuid()::text;
  grant_a jsonb;
  grant_b jsonb;
  grant_c jsonb;
  grant_d jsonb;
  registration_a jsonb;
  registration_c jsonb;
  retry jsonb;
  used_places integer;
begin
  select * into strict original_event from public.riichi_open_events where slug='riichi-open-i';
  assert original_event.stage='registration' and original_event.registration_open, 'Smoke test requires open registration';
  select count(*) into baseline_registrations from public.riichi_open_registrations;
  select count(*) into baseline_holds from public.riichi_open_registration_holds;
  select count(*) into baseline_participants from public.riichi_open_participants;
  select count(*) into baseline_audit from public.riichi_open_audit_log;
  begin
    grant_a := public.reserve_riichi_open_place(token_a,key_a,fingerprint);
    retry := public.reserve_riichi_open_place(token_a,key_a,fingerprint);
    assert grant_a->>'id'=retry->>'id', 'Reservation retry created a different hold';
    select (select count(*) from public.riichi_open_registrations where status in ('pending','verified','needs_clarification'))
      + (select count(*) from public.riichi_open_registration_holds where status='active' and expires_at>now())
      into used_places;
    while used_places<4 loop
      perform public.reserve_riichi_open_place(repeat(md5(gen_random_uuid()::text),2),gen_random_uuid()::text,repeat(md5(gen_random_uuid()::text),2));
      used_places:=used_places+1;
    end loop;
    update public.riichi_open_events set capacity=used_places where id=original_event.id;
    begin
      perform public.reserve_riichi_open_place(token_b,gen_random_uuid()::text,fingerprint);
      raise exception 'Capacity enforcement failed' using errcode='ZX002';
    exception when sqlstate 'P0001' then
      if sqlerrm not like 'All places%' then raise; end if;
    end;
    update public.riichi_open_events set capacity=original_event.capacity where id=original_event.id;
    registration_a := public.finalize_riichi_open_registration(
      (grant_a->>'id')::uuid,token_a,'Launch smoke fixture',grant_a->>'receipt_path','image/png',8,token_a);
    assert registration_a->>'status'='pending', 'Active reservation did not become pending';
    retry := public.finalize_riichi_open_registration(
      (grant_a->>'id')::uuid,token_a,'Launch smoke fixture',grant_a->>'receipt_path','image/png',8,token_a);
    assert retry->>'id'=registration_a->>'id', 'Finalisation retry created a duplicate';
    perform public.admin_set_riichi_open_registration_status((registration_a->>'id')::uuid,'cancelled','Rollback-only smoke fixture',null::uuid);
    grant_b := public.restart_cancelled_riichi_open_registration((registration_a->>'id')::uuid,token_a,token_b,key_b,fingerprint);
    retry := public.restart_cancelled_riichi_open_registration((registration_a->>'id')::uuid,token_a,token_b,key_b,fingerprint);
    assert retry->>'id'=grant_b->>'id', 'Restart retry created a duplicate';
    begin
      perform public.admin_set_riichi_open_registration_status((registration_a->>'id')::uuid,'verified','Rollback-only smoke fixture',null::uuid);
      raise exception 'Ancestor was reactivated alongside its replacement' using errcode='ZX002';
    exception when sqlstate 'P0001' then
      if sqlerrm not like 'A related registration%' then raise; end if;
    end;
    perform public.cancel_riichi_open_place((grant_b->>'id')::uuid,token_b);
    grant_c := public.restart_cancelled_riichi_open_registration((registration_a->>'id')::uuid,token_a,token_c,key_c,fingerprint);
    assert grant_c->>'id'<>grant_b->>'id', 'Released replacement could not be retried';
    registration_c := public.finalize_riichi_open_registration(
      (grant_c->>'id')::uuid,token_c,'Launch smoke fixture',grant_c->>'path','image/png',8,token_c);
    assert registration_c->>'status'='pending', 'Replacement did not become pending';
    assert (select restarted_from_registration_id=(registration_a->>'id')::uuid
      from public.riichi_open_registrations where id=(registration_c->>'id')::uuid), 'Replacement lost its cancellation link';
    retry := public.restart_cancelled_riichi_open_registration((registration_a->>'id')::uuid,token_a,token_c,key_c,fingerprint);
    assert (retry->>'completed')::boolean and retry->>'registration_id'=registration_c->>'id', 'Submitted restart could not be recovered';
    begin
      perform public.admin_set_riichi_open_registration_status((registration_a->>'id')::uuid,'verified','Rollback-only smoke fixture',null::uuid);
      raise exception 'Ancestor was reactivated alongside its submitted replacement' using errcode='ZX002';
    exception when sqlstate 'P0001' then
      if sqlerrm not like 'A related registration%' then raise; end if;
    end;
    grant_d := public.reserve_riichi_open_place(token_d,gen_random_uuid()::text,fingerprint);
    update public.riichi_open_registration_holds set expires_at=now()-interval '1 second' where id=(grant_d->>'id')::uuid;
    retry := public.finalize_riichi_open_registration(
      (grant_d->>'id')::uuid,token_d,'Launch smoke fixture',grant_d->>'receipt_path','image/png',8,token_d);
    assert retry->>'status'='payment_exception', 'Expired reservation incorrectly claimed a place';
    begin
      perform public.reserve_riichi_open_place(repeat(md5(gen_random_uuid()::text),2),gen_random_uuid()::text,fingerprint);
      raise exception 'Fifth reservation bypassed the network rate limit' using errcode='ZX002';
    exception when sqlstate 'P0001' then
      if sqlerrm not like 'Reservation rate limit%' then raise; end if;
    end;
    raise exception 'All assertions passed; roll back fixtures' using errcode='ZX001';
  exception when sqlstate 'ZX001' then null;
  end;
  assert (select count(*) from public.riichi_open_registrations)=baseline_registrations, 'Registration fixture survived rollback';
  assert (select count(*) from public.riichi_open_registration_holds)=baseline_holds, 'Hold fixture survived rollback';
  assert (select count(*) from public.riichi_open_participants)=baseline_participants, 'Participant fixture survived rollback';
  assert (select count(*) from public.riichi_open_audit_log)=baseline_audit, 'Audit fixture survived rollback';
  assert (select capacity from public.riichi_open_events where id=original_event.id)=original_event.capacity, 'Event capacity was not restored';
end $smoke$;
select 'passed; all fixture rows rolled back' as riichi_open_launch_smoke;
