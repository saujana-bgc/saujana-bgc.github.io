create extension if not exists pgcrypto;

create table public.riichi_open_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = 'riichi-open-i'),
  name text not null,
  event_date date not null,
  start_time time not null,
  timezone text not null default 'Asia/Kuala_Lumpur',
  venue text not null,
  payment_phone text not null,
  payment_recipient text not null,
  entry_fee_sen integer not null check (entry_fee_sen > 0),
  capacity integer not null check (capacity between 4 and 16),
  registration_hold_minutes smallint not null default 30 check (registration_hold_minutes between 5 and 120),
  registration_open boolean not null default false,
  stage text not null default 'registration' check (stage in ('registration','qualifier_1','qualifier_2','final','completed')),
  current_publication_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.riichi_open_registration_holds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.riichi_open_events(id),
  token_hash text not null unique,
  idempotency_key text not null,
  receipt_path text,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','submitted','expired','cancelled')),
  created_at timestamptz not null default now(),
  unique (event_id,idempotency_key)
);

create table public.riichi_open_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.riichi_open_events(id),
  hold_id uuid references public.riichi_open_registration_holds(id),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  status text not null check (status in ('pending','verified','needs_clarification','rejected','cancelled','payment_exception')),
  submitted_at timestamptz not null default now(),
  receipt_path text,
  receipt_mime text,
  receipt_size integer,
  receipt_sha256 text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  private_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hold_id)
);

create table public.riichi_open_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.riichi_open_events(id),
  registration_id uuid unique references public.riichi_open_registrations(id),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  active boolean not null default true,
  checked_in boolean not null default false,
  is_substitute boolean not null default false,
  eligible_for_final boolean not null default true,
  qualification_seed smallint check (qualification_seed is null or qualification_seed between 1 and 16),
  source text not null default 'registration' check (source in ('registration','manual')),
  created_at timestamptz not null default now(),
  check (not is_substitute or not eligible_for_final),
  unique (id,event_id)
);

create table public.riichi_open_rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.riichi_open_events(id),
  round_key text not null check (round_key in ('qualifier_1','qualifier_2','final')),
  status text not null default 'draft' check (status in ('draft','active','certified')),
  draft_revision integer not null default 1,
  expected_tables integer not null default 0 check (expected_tables >= 0),
  started_at timestamptz,
  certified_at timestamptz,
  certified_by uuid references auth.users(id),
  unique (event_id,round_key),
  unique (id,event_id)
);

create table public.riichi_open_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.riichi_open_events(id),
  round_id uuid not null,
  table_number integer not null check (table_number > 0),
  unclaimed_sticks integer not null default 0 check (unclaimed_sticks between 0 and 100),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id,round_id),
  unique (round_id,table_number),
  foreign key (round_id,event_id) references public.riichi_open_rounds(id,event_id) on delete cascade
);

create table public.riichi_open_seats (
  event_id uuid not null,
  round_id uuid not null,
  table_id uuid not null,
  participant_id uuid not null,
  seat_wind text not null check (seat_wind in ('East','South','West','North')),
  primary key (round_id,participant_id),
  unique (table_id,seat_wind),
  foreign key (table_id,round_id) references public.riichi_open_tables(id,round_id) on delete cascade,
  foreign key (participant_id,event_id) references public.riichi_open_participants(id,event_id) on delete restrict
);

create table public.riichi_open_results (
  event_id uuid not null,
  round_id uuid not null,
  table_id uuid not null,
  participant_id uuid not null,
  raw_points integer not null,
  placement smallint not null check (placement between 1 and 4),
  uma numeric(5,2) not null,
  score numeric(7,2) not null,
  first_place boolean not null,
  fourth_place boolean not null,
  updated_at timestamptz not null default now(),
  primary key (round_id,participant_id),
  foreign key (table_id,round_id) references public.riichi_open_tables(id,round_id) on delete cascade,
  foreign key (participant_id,event_id) references public.riichi_open_participants(id,event_id) on delete restrict
);

create table public.riichi_open_penalties (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  round_id uuid not null,
  participant_id uuid not null,
  points numeric(7,2) not null check (points >= 0),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (round_id,event_id) references public.riichi_open_rounds(id,event_id) on delete cascade,
  foreign key (participant_id,event_id) references public.riichi_open_participants(id,event_id) on delete restrict
);

create table public.riichi_open_tie_draws (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  round_id uuid not null,
  participant_ids uuid[] not null,
  order_ids uuid[] not null,
  public_note text not null,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (round_id,event_id) references public.riichi_open_rounds(id,event_id) on delete cascade
);

create table public.riichi_open_publications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.riichi_open_events(id),
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (event_id,version)
);
alter table public.riichi_open_events add constraint riichi_open_current_publication_fk
  foreign key (current_publication_id) references public.riichi_open_publications(id);

create table public.riichi_open_audit_log (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.riichi_open_events(id),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index riichi_open_reg_status_idx on public.riichi_open_registrations(event_id,status,submitted_at);
create index riichi_open_holds_capacity_idx on public.riichi_open_registration_holds(event_id,status,expires_at);
create index riichi_open_participants_active_idx on public.riichi_open_participants(event_id,active,checked_in);
create index riichi_open_audit_created_idx on public.riichi_open_audit_log(event_id,created_at desc);

alter table public.riichi_open_events enable row level security;
alter table public.riichi_open_registration_holds enable row level security;
alter table public.riichi_open_registrations enable row level security;
alter table public.riichi_open_participants enable row level security;
alter table public.riichi_open_rounds enable row level security;
alter table public.riichi_open_tables enable row level security;
alter table public.riichi_open_seats enable row level security;
alter table public.riichi_open_results enable row level security;
alter table public.riichi_open_penalties enable row level security;
alter table public.riichi_open_tie_draws enable row level security;
alter table public.riichi_open_publications enable row level security;
alter table public.riichi_open_audit_log enable row level security;

revoke all on public.riichi_open_events, public.riichi_open_registration_holds,
  public.riichi_open_registrations, public.riichi_open_participants,
  public.riichi_open_rounds, public.riichi_open_tables, public.riichi_open_seats,
  public.riichi_open_results, public.riichi_open_penalties, public.riichi_open_tie_draws,
  public.riichi_open_publications, public.riichi_open_audit_log from anon, authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('riichi-open-receipts','riichi-open-receipts',false,5242880,array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','application/pdf'];

insert into public.riichi_open_events(slug,name,event_date,start_time,timezone,venue,payment_phone,payment_recipient,entry_fee_sen,capacity,registration_open)
values ('riichi-open-i','Riichi Open I','2026-11-14','14:30','Asia/Kuala_Lumpur','Boardroom Bandit, Ara Damansara','+60162459482','NICHOLAS',1000,16,true)
on conflict (slug) do nothing;

create or replace function public.reserve_riichi_open_place(p_token_hash text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_event public.riichi_open_events%rowtype; v_hold public.riichi_open_registration_holds%rowtype; v_used integer;
begin
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found or not v_event.registration_open then raise exception 'Registration is closed' using errcode='P0001'; end if;
  if v_event.stage<>'registration' then raise exception 'The playing roster is already locked'; end if;
  select * into v_hold from public.riichi_open_registration_holds where event_id=v_event.id and idempotency_key=p_idempotency_key;
  if found and v_hold.expires_at>now() and v_hold.status='active' then
    if v_hold.token_hash is distinct from p_token_hash then raise exception 'This reservation belongs to another browser session'; end if;
    return jsonb_build_object('id',v_hold.id,'expires_at',v_hold.expires_at,'receipt_path',v_hold.receipt_path,'existing',true);
  end if;
  if found then raise exception 'This reservation has expired. Cancel it and reserve another place.'; end if;
  update public.riichi_open_registration_holds set status='expired' where event_id=v_event.id and status='active' and expires_at<=now();
  select (select count(*) from public.riichi_open_registration_holds h where h.event_id=v_event.id and h.status='active' and h.expires_at>now()) +
         (select count(*) from public.riichi_open_registrations r where r.event_id=v_event.id and r.status in ('pending','verified','needs_clarification')) into v_used;
  if v_used>=v_event.capacity then raise exception 'All places are reserved' using errcode='P0001'; end if;
  insert into public.riichi_open_registration_holds(event_id,token_hash,idempotency_key,expires_at)
  values(v_event.id,p_token_hash,p_idempotency_key,now()+make_interval(mins=>v_event.registration_hold_minutes)) returning * into v_hold;
  update public.riichi_open_registration_holds set receipt_path=v_event.id::text||'/'||v_hold.id::text||'/'||gen_random_uuid()::text where id=v_hold.id returning * into v_hold;
  return jsonb_build_object('id',v_hold.id,'expires_at',v_hold.expires_at,'receipt_path',v_hold.receipt_path,'existing',false);
end $$;
revoke all on function public.reserve_riichi_open_place(text,text) from public,anon,authenticated;
grant execute on function public.reserve_riichi_open_place(text,text) to service_role;

create or replace function public.cancel_riichi_open_place(p_hold_id uuid,p_token_hash text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.riichi_open_registration_holds set status='cancelled'
  where id=p_hold_id and token_hash=p_token_hash and status='active' and expires_at>now();
  if not found then raise exception 'This reservation is already submitted or has expired'; end if;
end $$;
revoke all on function public.cancel_riichi_open_place(uuid,text) from public,anon,authenticated;
grant execute on function public.cancel_riichi_open_place(uuid,text) to service_role;

create or replace function public.finalize_riichi_open_registration(p_hold_id uuid,p_token_hash text,p_display_name text,p_receipt_path text,p_receipt_mime text,p_receipt_size integer,p_receipt_sha256 text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_event public.riichi_open_events%rowtype; v_hold public.riichi_open_registration_holds%rowtype; v_registration public.riichi_open_registrations%rowtype; v_status text;
begin
  select * into v_hold from public.riichi_open_registration_holds where id=p_hold_id and token_hash=p_token_hash for update;
  if not found or v_hold.status<>'active' then raise exception 'This place reservation is no longer active' using errcode='P0001'; end if;
  select * into v_event from public.riichi_open_events where id=v_hold.event_id for update;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 80 then raise exception 'Enter a name of up to 80 characters' using errcode='22023'; end if;
  if v_hold.receipt_path is distinct from p_receipt_path then raise exception 'Receipt upload path does not match this reservation' using errcode='22023'; end if;
  if p_receipt_mime not in ('image/jpeg','image/png','application/pdf') or p_receipt_size not between 1 and 5242880 then raise exception 'Receipt file is not accepted' using errcode='22023'; end if;
  v_status := case when v_hold.expires_at>now() then 'pending' else 'payment_exception' end;
  insert into public.riichi_open_registrations(event_id,hold_id,display_name,status,receipt_path,receipt_mime,receipt_size,receipt_sha256)
  values(v_event.id,v_hold.id,btrim(p_display_name),v_status,p_receipt_path,p_receipt_mime,p_receipt_size,p_receipt_sha256) returning * into v_registration;
  update public.riichi_open_registration_holds set status='submitted' where id=v_hold.id;
  if v_status='pending' then
    insert into public.riichi_open_participants(event_id,registration_id,display_name) values(v_event.id,v_registration.id,btrim(p_display_name));
  end if;
  return jsonb_build_object('id',v_registration.id,'status',v_registration.status,'submitted_at',v_registration.submitted_at);
end $$;
revoke all on function public.finalize_riichi_open_registration(uuid,text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.finalize_riichi_open_registration(uuid,text,text,text,text,integer,text) to service_role;

create or replace function public.admin_add_riichi_open_participant(p_name text,p_payment_verified boolean,p_reason text,p_actor uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_event public.riichi_open_events%rowtype; v_status text; v_registration uuid; v_participant uuid;
begin
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found then raise exception 'Event not found'; end if;
  if v_event.stage<>'registration' then raise exception 'The playing roster is already locked'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Enter a name of up to 80 characters'; end if;
  if p_payment_verified and char_length(btrim(coalesce(p_reason,'')))<4 then raise exception 'Record why payment was manually verified'; end if;
  if (select count(*) from public.riichi_open_registration_holds h where h.event_id=v_event.id and h.status='active' and h.expires_at>now()) +
     (select count(*) from public.riichi_open_registrations r where r.event_id=v_event.id and r.status in ('pending','verified','needs_clarification')) >= v_event.capacity then raise exception 'All places are reserved'; end if;
  v_status:=case when p_payment_verified then 'verified' else 'pending' end;
  insert into public.riichi_open_registrations(event_id,display_name,status,private_note,verified_by,verified_at)
  values(v_event.id,btrim(p_name),v_status,nullif(btrim(p_reason),''),case when p_payment_verified then p_actor end,case when p_payment_verified then now() end)
  returning id into v_registration;
  insert into public.riichi_open_participants(event_id,registration_id,display_name,source)
  values(v_event.id,v_registration,btrim(p_name),'manual') returning id into v_participant;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason)
  values(v_event.id,p_actor,'add_participant','participant',v_participant::text,nullif(btrim(p_reason),''));
  return v_participant;
end $$;
revoke all on function public.admin_add_riichi_open_participant(text,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_add_riichi_open_participant(text,boolean,text,uuid) to service_role;

create or replace function public.admin_set_riichi_open_registration_status(p_registration_id uuid,p_status text,p_note text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_event public.riichi_open_events%rowtype; v_registration public.riichi_open_registrations%rowtype; v_participant uuid;
begin
  if p_status not in ('verified','needs_clarification','rejected','cancelled') then raise exception 'Choose a valid payment status'; end if;
  select e.* into v_event from public.riichi_open_events e join public.riichi_open_registrations r on r.event_id=e.id where r.id=p_registration_id for update of e;
  if not found then raise exception 'Registration not found'; end if;
  if v_event.stage<>'registration' then raise exception 'Payment status is locked after the playing roster starts'; end if;
  select * into v_registration from public.riichi_open_registrations where id=p_registration_id for update;
  if p_status='verified' and v_registration.status not in ('pending','verified') then
    if (select count(*) from public.riichi_open_registration_holds h where h.event_id=v_event.id and h.status='active' and h.expires_at>now()) +
       (select count(*) from public.riichi_open_registrations r where r.event_id=v_event.id and r.id<>p_registration_id and r.status in ('pending','verified','needs_clarification')) >=v_event.capacity then raise exception 'No place is available to confirm this late payment'; end if;
  end if;
  update public.riichi_open_registrations set status=p_status,private_note=nullif(btrim(p_note),''),verified_at=case when p_status='verified' then now() else verified_at end,verified_by=case when p_status='verified' then p_actor else verified_by end,updated_at=now() where id=p_registration_id;
  select id into v_participant from public.riichi_open_participants where registration_id=p_registration_id;
  if p_status in ('verified','needs_clarification') then
    if v_participant is null then
      insert into public.riichi_open_participants(event_id,registration_id,display_name,source) values(v_event.id,v_registration.id,v_registration.display_name,case when v_registration.hold_id is null then 'manual' else 'registration' end) returning id into v_participant;
    else update public.riichi_open_participants set active=true where id=v_participant;
    end if;
  elsif v_participant is not null then update public.riichi_open_participants set active=false where id=v_participant;
  end if;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason,details)
  values(v_event.id,p_actor,'registration_'||p_status,'registration',p_registration_id::text,nullif(btrim(p_note),''),jsonb_build_object('previous_status',v_registration.status));
end $$;
revoke all on function public.admin_set_riichi_open_registration_status(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_set_riichi_open_registration_status(uuid,text,text,uuid) to service_role;

create or replace function public.admin_generate_riichi_open_q1(p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_event public.riichi_open_events%rowtype; v_round uuid; v_count integer; v_tables integer;
begin
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found or v_event.stage<>'registration' then raise exception 'The first qualifier can only start during registration setup'; end if;
  select count(*) into v_count from public.riichi_open_participants p
  join public.riichi_open_registrations r on r.id=p.registration_id
  where p.event_id=v_event.id and p.active and p.checked_in and r.status='verified';
  if v_count<4 or v_count>16 or v_count%4<>0 then raise exception 'Check in 4, 8, 12 or 16 verified players before drawing tables'; end if;
  v_tables:=v_count/4;
  insert into public.riichi_open_rounds(event_id,round_key,status,expected_tables) values(v_event.id,'qualifier_1','active',v_tables) returning id into v_round;
  insert into public.riichi_open_tables(event_id,round_id,table_number) select v_event.id,v_round,n.table_number from generate_series(1,v_tables) as n(table_number);
  with shuffled as (
    select p.id participant_id,row_number() over(order by random()) rn from public.riichi_open_participants p
    join public.riichi_open_registrations r on r.id=p.registration_id
    where p.event_id=v_event.id and p.active and p.checked_in and r.status='verified'
  ), seated as (
    select s.participant_id,t.id table_id,case row_number() over(partition by t.id order by random()) when 1 then 'East' when 2 then 'South' when 3 then 'West' else 'North' end seat_wind
    from shuffled s join public.riichi_open_tables t on t.round_id=v_round and t.table_number=((s.rn-1)/4)+1
  ) insert into public.riichi_open_seats(event_id,round_id,table_id,participant_id,seat_wind)
  select v_event.id,v_round,table_id,participant_id,seat_wind from seated;
  update public.riichi_open_tables set published=true where round_id=v_round;
  update public.riichi_open_events set stage='qualifier_1',updated_at=now() where id=v_event.id;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details)
  values(v_event.id,p_actor,'draw_tables','round',v_round::text,jsonb_build_object('players',v_count,'tables',v_tables));
  return jsonb_build_object('round_id',v_round,'tables',v_tables,'players',v_count);
end $$;
revoke all on function public.admin_generate_riichi_open_q1(uuid) from public,anon,authenticated;
grant execute on function public.admin_generate_riichi_open_q1(uuid) to service_role;

create or replace function public.admin_prepare_riichi_open_round(p_round_key text,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_event public.riichi_open_events%rowtype; v_prev public.riichi_open_rounds%rowtype; v_round uuid; v_count integer; v_tables integer;
begin
  if p_round_key not in ('qualifier_2','final') then raise exception 'Choose a supported tournament stage'; end if;
  select * into v_event from public.riichi_open_events where slug='riichi-open-i' for update;
  if not found or v_event.stage<>p_round_key then raise exception 'That tournament stage is not ready'; end if;
  select * into v_prev from public.riichi_open_rounds where event_id=v_event.id and round_key=case p_round_key when 'qualifier_2' then 'qualifier_1' else 'qualifier_2' end and status='certified';
  if not found then raise exception 'Certify the previous round first'; end if;
  if p_round_key='qualifier_2' then
    select count(distinct s.participant_id) into v_count from public.riichi_open_seats s where s.round_id=v_prev.id;
    if v_count<4 or v_count>16 or v_count%4<>0 then raise exception 'The first qualifier roster cannot form full tables of four'; end if;
    if exists(
      with q as (
        select r.participant_id,sum(r.score)-coalesce((select sum(x.points) from public.riichi_open_penalties x where x.participant_id=r.participant_id and x.round_id=v_prev.id),0) score,count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
        from public.riichi_open_results r where r.round_id=v_prev.id group by r.participant_id
      ), ties as (select score,firsts,fourths,best,array_agg(participant_id) players from q group by score,firsts,fourths,best having count(*)>1)
      select 1 from ties x where not exists(select 1 from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> x.players and cardinality(d.participant_ids)=cardinality(x.players))
    ) then raise exception 'A qualifying tie remains after the score tie-breakers. Record the public draw order, then prepare the next round.'; end if;
  else
    select count(*) into v_count from public.riichi_open_participants p where p.event_id=v_event.id and p.active and p.eligible_for_final and not p.is_substitute
      and exists(select 1 from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id where r.participant_id=p.id and rr.event_id=v_event.id and rr.round_key='qualifier_2');
    if v_count<4 then raise exception 'Four eligible qualifiers with two completed rounds are needed to prepare the final'; end if;
    if exists(
      with q as (
        select p.id participant_id,
          coalesce(sum(r.score) filter(where rr.round_key in ('qualifier_1','qualifier_2')),0)-coalesce((select sum(x.points) from public.riichi_open_penalties x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=p.id and xr.round_key in ('qualifier_1','qualifier_2')),0) score,
          count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
        from public.riichi_open_participants p left join public.riichi_open_results r on r.participant_id=p.id
        left join public.riichi_open_rounds rr on rr.id=r.round_id
        where p.event_id=v_event.id and p.active and p.eligible_for_final and not p.is_substitute group by p.id
      ), eligible as (select * from q where exists(select 1 from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id where r.participant_id=q.participant_id and rr.event_id=v_event.id and rr.round_key='qualifier_2')),
      tie_groups as (
        select score,firsts,fourths,best,array_agg(participant_id) players,
          (select count(*) from eligible better where (better.score,better.firsts,better.fourths,better.best) is distinct from (eligible.score,eligible.firsts,eligible.fourths,eligible.best)
            and (better.score>eligible.score or (better.score=eligible.score and better.firsts>eligible.firsts) or (better.score=eligible.score and better.firsts=eligible.firsts and better.fourths<eligible.fourths) or (better.score=eligible.score and better.firsts=eligible.firsts and better.fourths=eligible.fourths and better.best>eligible.best))) ahead
        from eligible group by score,firsts,fourths,best having count(*)>1
      )
      select 1 from tie_groups x where x.ahead<4 and not exists(select 1 from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> x.players and cardinality(d.participant_ids)=cardinality(x.players))
    ) then raise exception 'A Top 4 tie remains after the score tie-breakers. Record the public draw order, then prepare the final.'; end if;
  end if;
  if exists(select 1 from public.riichi_open_rounds where event_id=v_event.id and round_key=p_round_key) then raise exception 'This round has already been prepared'; end if;
  v_tables:=case when p_round_key='final' then 1 else v_count/4 end;
  insert into public.riichi_open_rounds(event_id,round_key,status,expected_tables) values(v_event.id,p_round_key,'active',v_tables) returning id into v_round;
  insert into public.riichi_open_tables(event_id,round_id,table_number) select v_event.id,v_round,n.table_number from generate_series(1,v_tables) as n(table_number);
  if p_round_key='qualifier_2' then
    with q as (
      select r.participant_id,sum(r.score) score,count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
      from public.riichi_open_results r where r.round_id=v_prev.id group by r.participant_id
    ), ranked as (
      select q.*,row_number() over(order by q.score desc,q.firsts desc,q.fourths asc,q.best desc,coalesce((select array_position(d.order_ids,q.participant_id) from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> array[q.participant_id]::uuid[] limit 1),999)) rn
      from q
    ), assigned as (
      select participant_id,case when ceil(rn::numeric/v_tables)::integer%2=1 then ((rn-1)%v_tables)+1 else v_tables-((rn-1)%v_tables) end table_number
      from ranked
    ), seated as (
      select a.participant_id,t.id table_id,case row_number() over(partition by t.id order by random()) when 1 then 'East' when 2 then 'South' when 3 then 'West' else 'North' end seat_wind
      from assigned a join public.riichi_open_tables t on t.round_id=v_round and t.table_number=a.table_number
    ) insert into public.riichi_open_seats(event_id,round_id,table_id,participant_id,seat_wind) select v_event.id,v_round,table_id,participant_id,seat_wind from seated;
  else
    with totals as (
      select r.participant_id,sum(r.score) score,count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
      from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id and rr.round_key in ('qualifier_1','qualifier_2') where rr.event_id=v_event.id group by r.participant_id
    ), penalties as (
      select x.participant_id,sum(x.points) points from public.riichi_open_penalties x join public.riichi_open_rounds rr on rr.id=x.round_id and rr.round_key in ('qualifier_1','qualifier_2') where rr.event_id=v_event.id group by x.participant_id
    ), ranked as (
      select p.id participant_id,row_number() over(order by (coalesce(t.score,0)-coalesce(x.points,0)) desc,coalesce(t.firsts,0) desc,coalesce(t.fourths,0) asc,t.best desc,coalesce((select array_position(d.order_ids,p.id) from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> array[p.id]::uuid[] limit 1),999)) rn
      from public.riichi_open_participants p left join totals t on t.participant_id=p.id left join penalties x on x.participant_id=p.id
      where p.event_id=v_event.id and p.active and p.eligible_for_final and not p.is_substitute and exists(select 1 from public.riichi_open_results x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=p.id and xr.event_id=v_event.id and xr.round_key='qualifier_2')
    ) update public.riichi_open_participants p set qualification_seed=r.rn::smallint from ranked r where r.participant_id=p.id and r.rn<=4;
    with q as (
      select p.id participant_id,
        coalesce(sum(r.score) filter(where rr.round_key in ('qualifier_1','qualifier_2')),0)-coalesce((select sum(x.points) from public.riichi_open_penalties x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=p.id and xr.round_key in ('qualifier_1','qualifier_2')),0) score,
        count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
      from public.riichi_open_participants p left join public.riichi_open_results r on r.participant_id=p.id
      left join public.riichi_open_rounds rr on rr.id=r.round_id
      where p.event_id=v_event.id and p.active and p.eligible_for_final and not p.is_substitute and exists(select 1 from public.riichi_open_results x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=p.id and xr.event_id=v_event.id and xr.round_key='qualifier_2') group by p.id
    ), ranked as (
      select q.*,row_number() over(order by q.score desc,q.firsts desc,q.fourths asc,q.best desc,coalesce((select array_position(d.order_ids,q.participant_id) from public.riichi_open_tie_draws d where d.round_id=v_prev.id and d.participant_ids @> array[q.participant_id]::uuid[] limit 1),999)) rn from q
    ), seated as (
      select r.participant_id,t.id table_id,case row_number() over(order by random()) when 1 then 'East' when 2 then 'South' when 3 then 'West' else 'North' end seat_wind
      from ranked r join public.riichi_open_tables t on t.round_id=v_round where r.rn<=4
    ) insert into public.riichi_open_seats(event_id,round_id,table_id,participant_id,seat_wind) select v_event.id,v_round,table_id,participant_id,seat_wind from seated;
  end if;
  update public.riichi_open_tables set published=true where round_id=v_round;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details) values(v_event.id,p_actor,'prepare_round','round',v_round::text,jsonb_build_object('round',p_round_key,'tables',v_tables));
  return jsonb_build_object('round_id',v_round,'tables',v_tables);
end $$;
revoke all on function public.admin_prepare_riichi_open_round(text,uuid) from public,anon,authenticated;
grant execute on function public.admin_prepare_riichi_open_round(text,uuid) to service_role;

create or replace function public.admin_record_riichi_open_tie_draw(p_round_id uuid,p_participant_ids uuid[],p_order_ids uuid[],p_note text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_round public.riichi_open_rounds%rowtype; v_event public.riichi_open_events%rowtype; v_count integer; v_snapshot jsonb; v_version integer; v_publication uuid; v_tie_draws jsonb;
begin
  select * into v_round from public.riichi_open_rounds where id=p_round_id and round_key in ('qualifier_1','qualifier_2') for update;
  if not found or v_round.status<>'certified' then raise exception 'Record a draw for a certified qualifying round'; end if;
  if cardinality(p_participant_ids)<2 or cardinality(p_participant_ids)<>cardinality(p_order_ids) or cardinality(p_participant_ids)>16 or char_length(btrim(coalesce(p_note,'')))<8 then raise exception 'Enter the tied players, draw order and a public note'; end if;
  if (select count(distinct selected.participant_id) from unnest(p_participant_ids) as selected(participant_id))<>cardinality(p_participant_ids) or (select count(distinct selected.participant_id) from unnest(p_order_ids) as selected(participant_id))<>cardinality(p_order_ids) then raise exception 'Each tied player must appear once'; end if;
  if exists(select 1 from unnest(p_participant_ids) as selected(participant_id) where not selected.participant_id=any(p_order_ids)) or exists(select 1 from unnest(p_order_ids) as selected(participant_id) where not selected.participant_id=any(p_participant_ids)) then raise exception 'The draw order must include exactly the tied players'; end if;
  if exists(select 1 from unnest(p_participant_ids) as selected(participant_id) where not exists(select 1 from public.riichi_open_results r where r.round_id=p_round_id and r.participant_id=selected.participant_id)) then raise exception 'A selected player is not in this round'; end if;
  if (select count(distinct (score,firsts,fourths,best)) from (
    select sum(r.score)-coalesce((select sum(x.points) from public.riichi_open_penalties x join public.riichi_open_rounds xr on xr.id=x.round_id where x.participant_id=r.participant_id and xr.event_id=v_round.event_id and xr.round_key in ('qualifier_1','qualifier_2') and (v_round.round_key='qualifier_2' or xr.round_key='qualifier_1')),0) score,
      count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
    from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id
    where r.participant_id=any(p_participant_ids) and rr.event_id=v_round.event_id and rr.round_key in ('qualifier_1','qualifier_2') and (v_round.round_key='qualifier_2' or rr.round_key='qualifier_1')
    group by r.participant_id
  ) metrics)<>1 then raise exception 'Selected players do not share the same qualifying tie-break values'; end if;
  select count(*) into v_count from public.riichi_open_tie_draws where round_id=p_round_id and participant_ids @> p_participant_ids and cardinality(participant_ids)=cardinality(p_participant_ids);
  if v_count>0 then raise exception 'A draw order has already been recorded for this group'; end if;
  insert into public.riichi_open_tie_draws(event_id,round_id,participant_ids,order_ids,public_note,recorded_by) values(v_round.event_id,v_round.id,p_participant_ids,p_order_ids,btrim(p_note),p_actor);
  select * into v_event from public.riichi_open_events where id=v_round.event_id for update;
  select snapshot into v_snapshot from public.riichi_open_publications where id=v_event.current_publication_id;
  select jsonb_agg(jsonb_build_object('round',rr.round_key,'players',players.names,'public_note',d.public_note,'recorded_at',d.created_at) order by d.created_at)
    into v_tie_draws
    from public.riichi_open_tie_draws d join public.riichi_open_rounds rr on rr.id=d.round_id
    cross join lateral (select jsonb_agg(jsonb_build_object('participant_id',p.id,'display_name',p.display_name) order by item.position) names
      from unnest(d.order_ids) with ordinality as item(participant_id,position) join public.riichi_open_participants p on p.id=item.participant_id) players
    where d.event_id=v_event.id;
  v_snapshot:=jsonb_set(coalesce(v_snapshot,'{}'::jsonb),'{tie_draws}',coalesce(v_tie_draws,'[]'::jsonb),true);
  select coalesce(max(version),0)+1 into v_version from public.riichi_open_publications where event_id=v_event.id;
  insert into public.riichi_open_publications(event_id,version,snapshot,created_by) values(v_event.id,v_version,v_snapshot,p_actor) returning id into v_publication;
  update public.riichi_open_events set current_publication_id=v_publication,updated_at=now() where id=v_event.id;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason) values(v_round.event_id,p_actor,'record_tie_draw','round',p_round_id::text,btrim(p_note));
end $$;
revoke all on function public.admin_record_riichi_open_tie_draw(uuid,uuid[],uuid[],text,uuid) from public,anon,authenticated;
grant execute on function public.admin_record_riichi_open_tie_draw(uuid,uuid[],uuid[],text,uuid) to service_role;

create or replace function public.publish_riichi_open_assignments(p_round_id uuid,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_round public.riichi_open_rounds%rowtype; v_event public.riichi_open_events%rowtype; v_version integer; v_snapshot jsonb; v_assignments jsonb; v_publication uuid; v_top_four jsonb;
begin
  select r.* into v_round from public.riichi_open_rounds r where r.id=p_round_id for update;
  if not found or v_round.status='certified' then raise exception 'Only active round seating can be published'; end if;
  select e.* into v_event from public.riichi_open_events e where e.id=v_round.event_id for update;
  if exists(select 1 from public.riichi_open_tables t where t.round_id=v_round.id and (select count(*) from public.riichi_open_seats s where s.table_id=t.id)<>4) then raise exception 'Each published table needs four assigned seats'; end if;
  select jsonb_agg(jsonb_build_object('table_number',t.table_number,'seats',s.seats) order by t.table_number) into v_assignments
  from public.riichi_open_tables t cross join lateral (
    select jsonb_agg(jsonb_build_object('seat_wind',s.seat_wind,'display_name',p.display_name,'participant_id',p.id) order by case s.seat_wind when 'East' then 1 when 'South' then 2 when 'West' then 3 else 4 end) seats
    from public.riichi_open_seats s join public.riichi_open_participants p on p.id=s.participant_id where s.table_id=t.id
  ) s where t.round_id=v_round.id;
  select coalesce(max(version),0)+1 into v_version from public.riichi_open_publications where event_id=v_event.id;
  select snapshot into v_snapshot from public.riichi_open_publications where id=v_event.current_publication_id;
  v_snapshot:=coalesce(v_snapshot,'{}'::jsonb);
  v_snapshot:=jsonb_set(v_snapshot,'{assignments}',coalesce(v_snapshot->'assignments','{}'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,array['assignments',v_round.round_key],coalesce(v_assignments,'[]'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,'{assignment_round}',to_jsonb(v_round.round_key),true);
  v_snapshot:=jsonb_set(v_snapshot,'{stage}',to_jsonb(v_event.stage),true);
  v_snapshot:=jsonb_set(v_snapshot,'{last_certified}',coalesce(v_snapshot->'last_certified','null'::jsonb),true);
  if v_round.round_key='final' then
    select jsonb_agg(jsonb_build_object('participant_id',p.id,'display_name',p.display_name,'seed',p.qualification_seed) order by p.qualification_seed) into v_top_four
    from public.riichi_open_participants p where p.event_id=v_event.id and p.qualification_seed is not null and p.qualification_seed<=4;
    v_snapshot:=jsonb_set(v_snapshot,'{top_four}',coalesce(v_top_four,'[]'::jsonb),true);
  end if;
  insert into public.riichi_open_publications(event_id,version,snapshot,created_by) values(v_event.id,v_version,v_snapshot,p_actor) returning id into v_publication;
  update public.riichi_open_events set current_publication_id=v_publication,updated_at=now() where id=v_event.id;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details) values(v_event.id,p_actor,'publish_seating','round',v_round.id::text,jsonb_build_object('version',v_version,'round',v_round.round_key));
  return jsonb_build_object('version',v_version);
end $$;
revoke all on function public.publish_riichi_open_assignments(uuid,uuid) from public,anon,authenticated;
grant execute on function public.publish_riichi_open_assignments(uuid,uuid) to service_role;

create or replace function public.admin_record_riichi_open_penalty(p_round_id uuid,p_participant_id uuid,p_points numeric,p_reason text,p_revision integer,p_actor uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_round public.riichi_open_rounds%rowtype; v_revision integer;
begin
  select * into v_round from public.riichi_open_rounds where id=p_round_id for update;
  if not found or v_round.status='certified' or v_round.draft_revision<>p_revision then raise exception 'Round changed or is certified; reload before editing'; end if;
  if p_points<0 or p_points>9999 or p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'Enter a penalty and its reason'; end if;
  if not exists(select 1 from public.riichi_open_participants where id=p_participant_id and event_id=v_round.event_id) then raise exception 'Participant is not in this event'; end if;
  insert into public.riichi_open_penalties(event_id,round_id,participant_id,points,reason,recorded_by) values(v_round.event_id,v_round.id,p_participant_id,p_points,btrim(p_reason),p_actor);
  update public.riichi_open_rounds set draft_revision=draft_revision+1 where id=v_round.id returning draft_revision into v_revision;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,reason,details) values(v_round.event_id,p_actor,'record_penalty','participant',p_participant_id::text,btrim(p_reason),jsonb_build_object('points',p_points,'round',v_round.round_key));
  return v_revision;
end $$;
revoke all on function public.admin_record_riichi_open_penalty(uuid,uuid,numeric,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_record_riichi_open_penalty(uuid,uuid,numeric,text,integer,uuid) to service_role;

create or replace function public.admin_certify_riichi_open_round(p_round_id uuid,p_revision integer,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_round public.riichi_open_rounds%rowtype; v_event public.riichi_open_events%rowtype; v_result_count integer; v_table_count integer; v_version integer; v_snapshot jsonb; v_publication uuid; v_next_stage text; v_assignments jsonb; v_round_results jsonb; v_standings jsonb; v_final jsonb; v_top_four jsonb;
begin
  select r.* into v_round from public.riichi_open_rounds r where r.id=p_round_id for update;
  if not found or v_round.status='certified' or v_round.draft_revision<>p_revision then raise exception 'Round changed or is already certified; reload before continuing'; end if;
  select e.* into v_event from public.riichi_open_events e where e.id=v_round.event_id for update;
  if v_event.stage<>v_round.round_key then raise exception 'This round is not the active event stage'; end if;
  select count(*) into v_table_count from public.riichi_open_tables where round_id=p_round_id;
  select count(*) into v_result_count from public.riichi_open_results where round_id=p_round_id;
  if v_table_count<>v_round.expected_tables or v_result_count<>v_table_count*4 then raise exception 'Every expected table needs four complete results'; end if;
  if exists(select 1 from public.riichi_open_tables t where t.round_id=p_round_id and (select count(*) from public.riichi_open_seats s where s.table_id=t.id)<>4) then raise exception 'Every table needs four distinct assigned seats'; end if;
  if exists(select 1 from public.riichi_open_tables t where t.round_id=p_round_id and (select count(*) from public.riichi_open_results r where r.table_id=t.id)<>4) then raise exception 'Every table needs four saved results'; end if;
  if exists(select 1 from public.riichi_open_tables t where t.round_id=p_round_id and (select sum(r.raw_points) from public.riichi_open_results r where r.table_id=t.id)+t.unclaimed_sticks*1000<>120000) then raise exception 'A table has invalid raw points or unclaimed sticks'; end if;
  select snapshot into v_snapshot from public.riichi_open_publications where id=v_event.current_publication_id;
  v_snapshot:=coalesce(v_snapshot,'{}'::jsonb);
  update public.riichi_open_rounds set status='certified',certified_at=now(),certified_by=p_actor where id=p_round_id;
  v_next_stage:=case v_round.round_key when 'qualifier_1' then 'qualifier_2' when 'qualifier_2' then 'final' else 'completed' end;
  update public.riichi_open_events set stage=v_next_stage,updated_at=now() where id=v_event.id;
  select jsonb_agg(jsonb_build_object('table_number',t.table_number,'seats',s.seats) order by t.table_number) into v_assignments
  from public.riichi_open_tables t cross join lateral (
    select jsonb_agg(jsonb_build_object('seat_wind',s.seat_wind,'display_name',p.display_name,'participant_id',p.id) order by case s.seat_wind when 'East' then 1 when 'South' then 2 when 'West' then 3 else 4 end) seats
    from public.riichi_open_seats s join public.riichi_open_participants p on p.id=s.participant_id where s.table_id=t.id
  ) s where t.round_id=p_round_id;
  select jsonb_agg(jsonb_build_object('table_number',t.table_number,'unclaimed_sticks',t.unclaimed_sticks,'results',s.rows) order by t.table_number) into v_round_results
  from public.riichi_open_tables t cross join lateral (
    select jsonb_agg(jsonb_build_object('participant_id',p.id,'display_name',p.display_name,'seat_wind',s.seat_wind,'raw_points',r.raw_points,'placement',r.placement,'uma',r.uma,'score',r.score) order by case s.seat_wind when 'East' then 1 when 'South' then 2 when 'West' then 3 else 4 end) rows
    from public.riichi_open_seats s join public.riichi_open_participants p on p.id=s.participant_id join public.riichi_open_results r on r.round_id=s.round_id and r.participant_id=s.participant_id where s.table_id=t.id
  ) s where t.round_id=p_round_id;
  v_snapshot:=jsonb_set(v_snapshot,'{assignments}',coalesce(v_snapshot->'assignments','{}'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,array['assignments',v_round.round_key],coalesce(v_assignments,'[]'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,'{round_results}',coalesce(v_snapshot->'round_results','{}'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,array['round_results',v_round.round_key],coalesce(v_round_results,'[]'::jsonb),true);
  v_snapshot:=jsonb_set(v_snapshot,'{assignment_round}',to_jsonb(v_round.round_key),true);
  v_snapshot:=jsonb_set(v_snapshot,'{stage}',to_jsonb(v_next_stage),true);
  v_snapshot:=jsonb_set(v_snapshot,'{last_certified}',to_jsonb(now()),true);
  v_snapshot:=jsonb_set(v_snapshot,'{message}',to_jsonb('Certified results are now published.'::text),true);
  if v_round.round_key in ('qualifier_1','qualifier_2') then
    with score_totals as (
      select r.participant_id,coalesce(sum(r.score) filter(where rr.round_key='qualifier_1'),0) q1,
        coalesce(sum(r.score) filter(where rr.round_key='qualifier_2'),0) q2,
        count(*) filter(where r.first_place)::integer firsts,count(*) filter(where r.fourth_place)::integer fourths,max(r.score) best
      from public.riichi_open_results r join public.riichi_open_rounds rr on rr.id=r.round_id and rr.round_key in ('qualifier_1','qualifier_2')
      where rr.event_id=v_event.id group by r.participant_id
    ), penalty_totals as (
      select x.participant_id,sum(x.points) penalties from public.riichi_open_penalties x join public.riichi_open_rounds rr on rr.id=x.round_id and rr.round_key in ('qualifier_1','qualifier_2') where rr.event_id=v_event.id group by x.participant_id
    ), q as (
      select p.id participant_id,p.display_name,p.is_substitute,coalesce(st.q1,0) q1,coalesce(st.q2,0) q2,coalesce(pt.penalties,0) penalties,
        coalesce(st.firsts,0) firsts,coalesce(st.fourths,0) fourths,st.best
      from public.riichi_open_participants p left join score_totals st on st.participant_id=p.id left join penalty_totals pt on pt.participant_id=p.id
      where p.event_id=v_event.id and p.active and exists(select 1 from public.riichi_open_seats s where s.participant_id=p.id and s.round_id in(select id from public.riichi_open_rounds where event_id=v_event.id and round_key in ('qualifier_1','qualifier_2')))
    ), ranked as (
      select q.*,rank() over(order by (q.q1+q.q2-q.penalties) desc,q.firsts desc,q.fourths asc,q.best desc) rank_no,
        row_number() over(order by (q.q1+q.q2-q.penalties) desc,q.firsts desc,q.fourths asc,q.best desc,coalesce((select array_position(d.order_ids,q.participant_id) from public.riichi_open_tie_draws d where d.round_id=(select id from public.riichi_open_rounds where event_id=v_event.id and round_key=v_round.round_key) and d.participant_ids @> array[q.participant_id]::uuid[] limit 1),999)) seed
      from q
    ) select jsonb_agg(jsonb_build_object('rank',rank_no,'participant_id',participant_id,'display_name',display_name,'qualifier_1',q1,'qualifier_2',case when v_round.round_key='qualifier_1' then null else q2 end,'penalties',penalties,'total',q1+q2-penalties,'seed',null,'is_substitute',is_substitute) order by seed) into v_standings from ranked;
    v_snapshot:=jsonb_set(v_snapshot,'{standings}',coalesce(v_standings,'[]'::jsonb),true);
    if v_round.round_key='qualifier_2' then
      v_snapshot:=jsonb_set(v_snapshot,'{top_four}','[]'::jsonb,true);
    end if;
  else
    with final_scores as (
      select p.id participant_id,p.display_name,r.score-coalesce(sum(x.points),0) score,coalesce(p.qualification_seed,99) seed
      from public.riichi_open_participants p join public.riichi_open_results r on r.participant_id=p.id and r.round_id=p_round_id
      left join public.riichi_open_penalties x on x.participant_id=p.id and x.round_id=p_round_id
      where p.event_id=v_event.id group by p.id,p.display_name,r.score
    ), ranked as(select *,row_number() over(order by score desc,seed asc) rank_no from final_scores)
    select jsonb_agg(jsonb_build_object('rank',rank_no,'participant_id',participant_id,'display_name',display_name,'score',score,'seed',seed) order by rank_no) into v_final from ranked;
    v_snapshot:=jsonb_set(v_snapshot,'{final}',coalesce(v_final,'[]'::jsonb),true);
    v_snapshot:=jsonb_set(v_snapshot,'{champion}',coalesce(v_final->0->'display_name','null'::jsonb),true);
  end if;
  select coalesce(max(version),0)+1 into v_version from public.riichi_open_publications where event_id=v_event.id;
  insert into public.riichi_open_publications(event_id,version,snapshot,created_by) values(v_event.id,v_version,v_snapshot,p_actor) returning id into v_publication;
  update public.riichi_open_events set current_publication_id=v_publication where id=v_event.id;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details) values(v_event.id,p_actor,'certify_round','round',p_round_id::text,jsonb_build_object('round',v_round.round_key,'version',v_version));
  return jsonb_build_object('version',v_version,'next_stage',v_next_stage);
end $$;
revoke all on function public.admin_certify_riichi_open_round(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_certify_riichi_open_round(uuid,integer,uuid) to service_role;

create or replace function public.save_riichi_open_table_results(p_round_id uuid,p_table_id uuid,p_revision integer,p_sticks integer,p_results jsonb,p_actor uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_round public.riichi_open_rounds%rowtype; v_event uuid; v_count integer; v_revision integer;
begin
  select r.* into v_round from public.riichi_open_rounds r where r.id=p_round_id for update;
  if not found or v_round.status='certified' or v_round.draft_revision<>p_revision then raise exception 'Round changed or is certified; reload before editing' using errcode='P0001'; end if;
  v_event:=v_round.event_id;
  if not exists(select 1 from public.riichi_open_events where id=v_event and stage=v_round.round_key) then raise exception 'This is not the active tournament round'; end if;
  if p_sticks<0 or p_sticks>100 or jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)<>4 then raise exception 'Enter four player scores and valid unclaimed sticks' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_results) a where coalesce(a->>'participant_id','')='' or coalesce(a->>'raw_points','') !~ '^-?[0-9]+$') then raise exception 'Each result needs a participant and integer raw points' using errcode='22023'; end if;
  if (select count(distinct a->>'participant_id') from jsonb_array_elements(p_results) a)<>4 then raise exception 'A participant can appear only once at a table' using errcode='22023'; end if;
  if (select sum((a->>'raw_points')::integer) from jsonb_array_elements(p_results) a)+p_sticks*1000<>120000 then raise exception 'Raw points and unclaimed riichi sticks must total 120,000' using errcode='22023'; end if;
  if not exists(select 1 from public.riichi_open_tables t where t.id=p_table_id and t.round_id=p_round_id) then raise exception 'Table not found in this round' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_results) a left join public.riichi_open_seats s on s.round_id=p_round_id and s.table_id=p_table_id and s.participant_id=(a->>'participant_id')::uuid where s.participant_id is null) then raise exception 'All four participants must be assigned to this table' using errcode='22023'; end if;
  delete from public.riichi_open_results where table_id=p_table_id;
  with input as (
    select (a->>'participant_id')::uuid participant_id,(a->>'raw_points')::integer raw_points
    from jsonb_array_elements(p_results) a
  ), ranked as (
    select i.*,rank() over(order by raw_points desc)::integer place,
      count(*) over(partition by raw_points)::integer tie_count,
      max(raw_points) over() max_points,min(raw_points) over() min_points
    from input i
  ), scored as (
    select r.*,
      (select avg(u.value::numeric) from generate_series(r.place,r.place+r.tie_count-1) as positions(position)
       join unnest(array[15,5,-5,-15]) with ordinality as u(value,position) on u.position=positions.position) shared_uma
    from ranked r
  )
  insert into public.riichi_open_results(event_id,round_id,table_id,participant_id,raw_points,placement,uma,score,first_place,fourth_place)
    select v_event,p_round_id,p_table_id,participant_id,raw_points,place,shared_uma,
      (raw_points-30000)::numeric/1000+shared_uma,raw_points=max_points,raw_points=min_points from scored;
  update public.riichi_open_tables set unclaimed_sticks=p_sticks where id=p_table_id;
  update public.riichi_open_rounds set status='active',draft_revision=draft_revision+1,started_at=coalesce(started_at,now()) where id=p_round_id returning draft_revision into v_revision;
  insert into public.riichi_open_audit_log(event_id,actor_id,action,entity_type,entity_id,details) values(v_event,p_actor,'save_results','table',p_table_id::text,jsonb_build_object('revision',v_revision));
  return v_revision;
end $$;
revoke all on function public.save_riichi_open_table_results(uuid,uuid,integer,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_riichi_open_table_results(uuid,uuid,integer,integer,jsonb,uuid) to service_role;
