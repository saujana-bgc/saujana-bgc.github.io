create or replace function public.cancel_riichi_open_place(p_hold_id uuid,p_token_hash text)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.riichi_open_registration_holds set status='cancelled'
  where id=p_hold_id and token_hash=p_token_hash and status in ('active','expired');
  if not found then raise exception 'This reservation is already submitted or has been released'; end if;
end $$;
revoke all on function public.cancel_riichi_open_place(uuid,text) from public,anon,authenticated;
grant execute on function public.cancel_riichi_open_place(uuid,text) to service_role;
