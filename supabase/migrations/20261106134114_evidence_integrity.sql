-- One photograph cannot support multiple unrelated saved operations.
create or replace function private.check_evidence(eid uuid,sid uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.evidence e where e.id=eid and e.station_id=sid and e.uploaded_by=auth.uid() and e.received_at>now()-interval '2 hours') then raise exception 'Fresh camera evidence is required';end if;
 if exists(select 1 from public.deliveries d where d.measurement->>'evidence_id'=eid::text)
 or exists(select 1 from public.parchis p where p.evidence_id=eid)
 or exists(select 1 from public.shifts s where s.submission->>'pos_evidence_id'=eid::text or exists(select 1 from jsonb_array_elements(coalesce(s.submission->'nozzles','[]')) j where j->>'evidence_id'=eid::text) or exists(select 1 from jsonb_array_elements(coalesce(s.submission->'tanks','[]')) j where j->>'evidence_id'=eid::text))
 then raise exception 'This photo has already been used. Capture fresh evidence';end if;
 -- Serialize competing attempts to consume the same evidence row.
 perform 1 from public.evidence where id=eid for update;
end $$;

create function private.validate_shift_evidence() returns trigger language plpgsql security invoker set search_path='' as $$
declare total integer; distinct_total integer;
begin
 if new.submission is not null and old.submission is null then
 select count(*),count(distinct evidence_id) into total,distinct_total from (
 select value->>'evidence_id' as evidence_id from jsonb_array_elements(new.submission->'nozzles')
 union all select value->>'evidence_id' from jsonb_array_elements(new.submission->'tanks')
 union all select new.submission->>'pos_evidence_id' where new.submission->>'pos_evidence_id' is not null) evidence;
 if total<>distinct_total then raise exception 'Capture a separate photo for each reading';end if;
 end if;
 return new;
end $$;
revoke all on function private.validate_shift_evidence() from public;
create trigger unique_shift_evidence before update on public.shifts for each row execute function private.validate_shift_evidence();
create unique index parchi_evidence_once on public.parchis(evidence_id);
