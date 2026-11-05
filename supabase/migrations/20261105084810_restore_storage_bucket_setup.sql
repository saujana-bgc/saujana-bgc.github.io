-- Storage buckets and policies are required application configuration, so keep
-- them in the migration chain rather than relying on local-only seed data.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('riichi-open-receipts', 'riichi-open-receipts', false, 5242880, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets(id, name, public)
values ('albums', 'albums', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can list album photos'
  ) then
    create policy "Public can list album photos"
      on storage.objects for select to anon, authenticated
      using (bucket_id = 'albums');
  end if;
end
$$;
