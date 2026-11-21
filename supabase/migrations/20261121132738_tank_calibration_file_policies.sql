insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tank-calibrations', 'tank-calibrations', false, 4194304,
  array['application/pdf', 'text/csv', 'text/tab-separated-values', 'text/plain', 'image/jpeg', 'image/png']
);

create policy tank_calibration_upload on storage.objects
for insert to authenticated with check (
  bucket_id = 'tank-calibrations'
  and (select (private.member()).role) = 'owner'
  and split_part(name, '/', 1) = (select (private.member()).workspace_id)::text
  and split_part(name, '/', 2) = (select auth.uid())::text
  and owner_id = (select auth.uid())::text
  and split_part(name, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|csv|tsv|txt|jpg|png)$'
  and array_length(string_to_array(name, '/'), 1) = 4
  and exists (
    select 1 from public.stations s
    where s.workspace_id = (select (private.member()).workspace_id)
      and s.id::text = split_part(name, '/', 3)
  )
);

create policy tank_calibration_read on storage.objects
for select to authenticated using (
  bucket_id = 'tank-calibrations'
  and (select (private.member()).role) = 'owner'
  and split_part(name, '/', 1) = (select (private.member()).workspace_id)::text
);

-- Failed setup requests may clean up their own unlinked file. Saved sources stay intact.
create policy tank_calibration_discard_unlinked on storage.objects
for delete to authenticated using (
  bucket_id = 'tank-calibrations'
  and (select (private.member()).role) = 'owner'
  and split_part(name, '/', 1) = (select (private.member()).workspace_id)::text
  and owner_id = (select auth.uid())::text
  and not exists (
    select 1 from public.tanks t
    where t.workspace_id = (select (private.member()).workspace_id)
      and t.calibration_document ->> 'path' = storage.objects.name
  )
);
