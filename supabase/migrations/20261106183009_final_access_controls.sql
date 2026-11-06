-- Explicit deny policies document the RPC-only tracking boundary.
create policy rpc_only on public.tracking_sessions for all to anon,authenticated using(false) with check(false);
create policy rpc_only on public.location_reports for all to anon,authenticated using(false) with check(false);

create or replace function private.check_evidence(eid uuid,sid uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 perform 1 from public.evidence where id=eid for update;
 if not exists(select 1 from public.evidence e where e.id=eid and e.station_id=sid and e.uploaded_by=auth.uid() and e.received_at>now()-interval '2 hours') then raise exception 'Fresh camera evidence is required';end if;
 if exists(select 1 from public.deliveries d where d.measurement->>'evidence_id'=eid::text)
 or exists(select 1 from public.parchis p where p.evidence_id=eid)
 or exists(select 1 from public.shifts s where s.submission->>'pos_evidence_id'=eid::text or exists(select 1 from jsonb_array_elements(coalesce(s.submission->'nozzles','[]')) j where j->>'evidence_id'=eid::text) or exists(select 1 from jsonb_array_elements(coalesce(s.submission->'tanks','[]')) j where j->>'evidence_id'=eid::text))
 then raise exception 'This photo has already been used. Capture fresh evidence';end if;
end $$;
