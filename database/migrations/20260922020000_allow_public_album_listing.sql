drop policy if exists "Public can list album photos" on storage.objects;

create policy "Public can list album photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'albums');
