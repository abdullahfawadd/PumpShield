alter table public.stations add column latitude numeric check(latitude between -90 and 90), add column longitude numeric check(longitude between -180 and 180), add column geofence_m numeric not null default 500 check(geofence_m between 100 and 5000), add constraint station_coordinates_pair check((latitude is null)=(longitude is null));
alter table public.location_reports add column heading numeric check(heading>=0 and heading<360),add column speed_ms numeric check(speed_ms between 0 and 90);
alter table public.evidence add column offline boolean not null default false,add column capture_id uuid;
create unique index evidence_capture_once on public.evidence(capture_id) where capture_id is not null;
create table public.field_submissions(request_id uuid primary key,workspace_id uuid not null references public.workspaces(id),station_id uuid not null references public.stations(id),actor_id uuid not null references public.memberships(user_id),kind text not null check(kind in('parchi','submit_delivery','close_shift')),captured_at timestamptz not null,posted_at timestamptz not null default now(),payload_hash text not null,result jsonb not null);
alter table public.field_submissions enable row level security;
revoke all on public.field_submissions from anon,authenticated;
grant select on public.field_submissions to authenticated;
create policy own_field_receipts on public.field_submissions for select to authenticated using(workspace_id=(select(private.member()).workspace_id) and (actor_id=(select auth.uid()) or (select(private.member()).role)='owner'));
alter table public.parchis add column offline_captured_at timestamptz,add column offline_request_id uuid references public.field_submissions(request_id) deferrable initially deferred;
create index parchi_offline_receipt on public.parchis(offline_request_id);
create index field_submission_workspace on public.field_submissions(workspace_id,posted_at desc);
create index field_submission_station on public.field_submissions(station_id);
create index field_submission_actor on public.field_submissions(actor_id);

-- Lock before testing consumption, so competing operations cannot reuse one photograph.
create or replace function private.check_evidence(eid uuid,sid uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 perform 1 from public.evidence where id=eid for update;
 if not exists(select 1 from public.evidence e where e.id=eid and e.station_id=sid and e.uploaded_by=auth.uid() and e.received_at>now()-interval '2 hours') then raise exception 'Fresh camera evidence is required';end if;
 if exists(select 1 from public.deliveries d where d.measurement->>'evidence_id'=eid::text)
 or exists(select 1 from public.parchis p where p.evidence_id=eid)
 or exists(select 1 from public.shifts s where s.submission->>'pos_evidence_id'=eid::text or exists(select 1 from jsonb_array_elements(coalesce(s.submission->'nozzles','[]')) j where j->>'evidence_id'=eid::text) or exists(select 1 from jsonb_array_elements(coalesce(s.submission->'tanks','[]')) j where j->>'evidence_id'=eid::text)) then raise exception 'This photo has already been used. Capture fresh evidence';end if;
end $$;

create function private.field(op text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare m public.memberships;sid uuid;v public.vehicles;a public.accounts;s public.shifts;d public.deliveries;e public.evidence;receipt public.field_submissions;rid uuid;captured timestamptz;payload jsonb;hash text;answer jsonb;k text;reference_id uuid;
begin
 m=private.member();if m.user_id is null then raise exception 'Active workspace access required';end if;
 if p is null or jsonb_typeof(p)<>'object' or p::text ~ '"(-?Infinity|NaN)"' then raise exception 'Invalid field request';end if;
 sid=nullif(p->>'station_id','')::uuid;
 if not exists(select 1 from public.stations where id=sid and workspace_id=m.workspace_id and(m.role='owner' or id=m.station_id)) then raise exception 'Station access denied';end if;
 if op='station_position' then
  if m.role<>'owner' then raise exception 'Owner access required';end if;
  if nullif(p->>'latitude','') is null or nullif(p->>'longitude','') is null then raise exception 'Select a location on the map';end if;
  update public.stations set latitude=(p->>'latitude')::numeric,longitude=(p->>'longitude')::numeric,geofence_m=coalesce((p->>'radius_m')::numeric,500) where id=sid;
  insert into public.audit_events(workspace_id,actor_id,action,subject_id) values(m.workspace_id,m.user_id,'station_position',sid);
  return jsonb_build_object('id',sid);
 elsif op='vehicle_lookup' then
  select * into v from public.vehicles where token=(p->>'token')::uuid and workspace_id=m.workspace_id and active;
  select * into a from public.accounts where id=v.account_id and station_id=sid;
  if a.id is null or v.id is null then raise exception 'This vehicle pass is not authorised at this station';end if;
  return jsonb_build_object('registration',v.registration,'account',a.name,'grade',v.grade,'max_liters',v.max_liters);
 elsif op='context' then
  select * into s from public.shifts where station_id=sid and status='open';
  return jsonb_build_object('user_id',m.user_id,'workspace_id',m.workspace_id,'person',m.name,'prepared_at',now(),'expires_at',now()+interval '24 hours',
   'station',(select jsonb_build_object('id',id,'name',name,'latitude',latitude,'longitude',longitude,'geofence_m',geofence_m) from public.stations where id=sid),
   'shift',case when s.id is null then null else jsonb_build_object('id',s.id,'name',s.name,'opened_at',s.opened_at,'due_at',s.due_at) end,
   'nozzles',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'name',n.name,'tank_id',n.tank_id,'totalizer',n.totalizer,'grade',t.grade)) from public.nozzles n join public.tanks t on t.id=n.tank_id where n.station_id=sid),'[]'::jsonb),
   'tanks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'grade',grade)) from public.tanks where station_id=sid),'[]'::jsonb),
   'deliveries',coalesce((select jsonb_agg(jsonb_build_object('id',id,'reference',reference,'vehicle',vehicle,'chamber_count',jsonb_array_length(chambers))) from public.deliveries where station_id=sid and status='dispatched'),'[]'::jsonb));
 elsif op='offline_evidence' then
  if nullif(p->>'capture_id','') is null or coalesce(p->>'sha256','') !~ '^[0-9a-f]{64}$' then raise exception 'Valid capture identity and file hash are required';end if;
  perform pg_advisory_xact_lock(hashtextextended(p->>'capture_id',0));
  select * into e from public.evidence where capture_id=(p->>'capture_id')::uuid;
  if e.id is not null then
   if e.uploaded_by is distinct from m.user_id or e.station_id<>sid or e.sha256 is distinct from p->>'sha256' or e.path is distinct from p->>'path' then raise exception 'Evidence reference does not match';end if;
   return jsonb_build_object('id',e.id);
  end if;
  if coalesce(p->>'path','') not like m.workspace_id::text||'/'||m.user_id::text||'/%' then raise exception 'Invalid evidence path';end if;
  if not exists(select 1 from storage.objects where bucket_id='evidence' and name=p->>'path' and owner_id=m.user_id::text) then raise exception 'Upload evidence first';end if;
  captured=(p->>'captured_at')::timestamptz;
  if captured is null or captured not between now()-interval '24 hours' and now()+interval '1 minute' then raise exception 'Offline evidence must be captured within the last 24 hours';end if;
  insert into public.evidence(workspace_id,station_id,uploaded_by,path,captured_at,latitude,longitude,accuracy,sha256,offline,capture_id) values(m.workspace_id,sid,m.user_id,p->>'path',captured,(p->>'latitude')::numeric,(p->>'longitude')::numeric,(p->>'accuracy')::numeric,p->>'sha256',true,(p->>'capture_id')::uuid) returning id into rid;
  return jsonb_build_object('id',rid);
 elsif op='sync' then
  reference_id=(p->>'request_id')::uuid;k=p->>'kind';payload=p->'payload';
  if reference_id is null or k is null or k not in('parchi','submit_delivery','close_shift') or jsonb_typeof(payload)<>'object' then raise exception 'Invalid queued operation';end if;
  perform pg_advisory_xact_lock(hashtextextended(reference_id::text,0));
  hash=encode(extensions.digest(p::text,'sha256'),'hex');
  select * into receipt from public.field_submissions where request_id=reference_id;
  if receipt.request_id is not null then
   if receipt.actor_id<>m.user_id or receipt.workspace_id<>m.workspace_id or receipt.station_id<>sid or receipt.payload_hash<>hash then raise exception 'Queued reference does not match the original submission';end if;
   return receipt.result||jsonb_build_object('replayed',true);
  end if;
  if (p->>'user_id')::uuid is distinct from m.user_id or (p->>'workspace_id')::uuid is distinct from m.workspace_id then raise exception 'Sign in with the same account that prepared this offline workspace';end if;
  captured=(p->>'captured_at')::timestamptz;
  if captured is null or captured not between now()-interval '24 hours' and now()+interval '1 minute' then raise exception 'This draft is too old for automatic posting. Ask the owner to review it';end if;
  if k in('parchi','close_shift') then
   select * into s from public.shifts where id=(p->>'shift_id')::uuid and station_id=sid for update;
   if s.id is null or s.status<>'open' or captured<s.opened_at then raise exception 'The original shift is no longer open. Owner review is required';end if;
   if k='close_shift' and payload->>'id' is distinct from s.id::text then raise exception 'Closing shift does not match the saved workspace';end if;
  else
   select * into d from public.deliveries where id=(payload->>'id')::uuid and station_id=sid for update;
   if d.id is null or d.status<>'dispatched' then raise exception 'This delivery no longer accepts an arrival audit';end if;
  end if;
  for rid in select (value)::uuid from jsonb_array_elements_text(case when k='close_shift' then (select coalesce(jsonb_agg(x->>'evidence_id'),'[]'::jsonb) from jsonb_array_elements(coalesce(payload->'nozzles','[]'::jsonb)||coalesce(payload->'tanks','[]'::jsonb)) x)||case when payload->>'pos_evidence_id' is null then '[]'::jsonb else jsonb_build_array(payload->>'pos_evidence_id') end else jsonb_build_array(payload->>'evidence_id') end) loop
   if not exists(select 1 from public.evidence where id=rid and station_id=sid and uploaded_by=m.user_id and offline and captured_at between coalesce(s.opened_at,d.created_at) and captured+interval '1 minute') then raise exception 'Offline photos must belong to the original shift or delivery and precede the saved draft';end if;
  end loop;
  -- Existing transactional commands recheck stock, credit, approvals and every evidence reference.
  payload=payload||jsonb_build_object('station_id',sid,'offline_request_id',reference_id,'offline_captured_at',captured);
  if k='parchi' then payload=payload||jsonb_build_object('request_id',reference_id);end if;
  answer=private.command(k,payload);
  if k='parchi' then update public.parchis set offline_captured_at=captured,offline_request_id=reference_id where id=(answer->>'id')::uuid;end if;
  insert into public.field_submissions(request_id,workspace_id,station_id,actor_id,kind,captured_at,payload_hash,result) values(reference_id,m.workspace_id,sid,m.user_id,k,captured,hash,answer);
  insert into public.audit_events(workspace_id,actor_id,action,subject_id) values(m.workspace_id,m.user_id,'offline_'||k,(answer->>'id')::uuid);
  return answer;
 end if;
 raise exception 'Unknown field operation';
end $$;
create function public.field(op text,p jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.field(op,p)$$;
revoke all on function private.field(text,jsonb),public.field(text,jsonb) from public,anon;
grant execute on function private.field(text,jsonb),public.field(text,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION private.command(op text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare m public.memberships; sid uuid; rid uuid; tid uuid; d public.deliveries; s public.shifts; t public.tanks; n public.nozzles; a public.accounts; v public.vehicles; inv public.invitations; u auth.users; x jsonb; y jsonb; readings jsonb; snapshot jsonb; results jsonb='[]'; sold numeric=0; total_sales numeric=0; revenue numeric=0; expected numeric; actual numeric; delivered numeric; volume numeric=0; allowance numeric; shortage numeric; rate numeric; cash numeric; pos numeric; credit numeric; closing numeric; testing numeric; start_value numeric; cutoff timestamptz; wid uuid;
begin
 if p is null or jsonb_typeof(p)<>'object' or p::text ~ '"(-?Infinity|NaN)"' then raise exception 'Invalid request';end if;
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into u from auth.users where id=auth.uid();
 if u.email_confirmed_at is null then raise exception 'Confirm your email before continuing'; end if;
 select * into m from public.memberships where user_id=auth.uid() and active;
 if op='join' then
 if m.user_id is not null then return jsonb_build_object('id',m.workspace_id);end if;
 if exists(select 1 from public.memberships where user_id=auth.uid()) then raise exception 'Your account has been disabled';end if;
 select * into inv from public.invitations where lower(email)=lower(u.email) and accepted_at is null order by id limit 1 for update;
 if inv.id is not null then
 insert into public.memberships(user_id,workspace_id,role,name,station_id) values(auth.uid(),inv.workspace_id,'munshi',inv.name,inv.station_id);
 update public.invitations set accepted_at=now() where id=inv.id;
 return jsonb_build_object('id',inv.workspace_id);
 end if;
 if coalesce(p->>'name','')='' then raise exception 'Ask your owner for access, or create a workspace';end if;
 insert into public.workspaces(name) values(left(p->>'name',100)) returning id into wid;
 insert into public.memberships(user_id,workspace_id,role,name) values(auth.uid(),wid,'owner',left(coalesce(p->>'person','Owner'),100));
 return jsonb_build_object('id',wid);
 end if;
 if m.user_id is null then raise exception 'Workspace access required';end if;
 sid=nullif(p->>'station_id','')::uuid;
 if sid is not null and not exists(select 1 from public.stations where id=sid and workspace_id=m.workspace_id and (m.role='owner' or id=m.station_id)) then raise exception 'Station access denied';end if;
 if op not in ('evidence','submit_delivery','decant','open_shift','close_shift','parchi') and m.role<>'owner' then raise exception 'Owner access required';end if;
 if op='station' then
 insert into public.stations(workspace_id,name,omc,city) values(m.workspace_id,left(p->>'name',100),left(p->>'omc',80),left(p->>'city',80)) returning id into rid;
 elsif op='tank' then
 if exists(select 1 from public.shifts where station_id=sid and status='open')then raise exception 'Close the current shift before changing equipment';end if;
 actual=private.calibrate((p->>'dip')::numeric,p->'chart');
 if (select max((value->>'liters')::numeric) from jsonb_array_elements(p->'chart'))>(p->>'capacity')::numeric then raise exception 'Calibration exceeds capacity';end if;
 insert into public.tanks(workspace_id,station_id,name,grade,capacity,stock,chart) values(m.workspace_id,sid,p->>'name',p->>'grade',(p->>'capacity')::numeric,actual,p->'chart') returning id into rid;
 elsif op='nozzle' then
 if exists(select 1 from public.shifts where station_id=sid and status='open')then raise exception 'Close the current shift before changing equipment';end if;
 select * into t from public.tanks where id=(p->>'tank_id')::uuid and station_id=sid;
 if t.id is null then raise exception 'Tank not found';end if;
 insert into public.nozzles(workspace_id,station_id,tank_id,name,totalizer) values(m.workspace_id,sid,t.id,p->>'name',(p->>'totalizer')::numeric) returning id into rid;
 elsif op='price' then
 cutoff=(p->>'effective_at')::timestamptz;
 if cutoff<now()-interval '5 minutes' then raise exception 'Prices cannot be backdated';end if;
 if exists(select 1 from public.shifts where station_id=sid and status='open' and cutoff<=due_at) then raise exception 'Close the open shift before changing its price';end if;
 insert into public.prices(workspace_id,station_id,grade,price,beta,margin,effective_at,source) values(m.workspace_id,sid,p->>'grade',(p->>'price')::numeric,(p->>'beta')::numeric,(p->>'margin')::numeric,cutoff,p->>'source') returning id into rid;
 elsif op='invite' then
 if length(p->>'email')>254 or position('@' in p->>'email')<2 then raise exception 'Valid email required';end if;
 if exists(select 1 from public.memberships mm join auth.users uu on uu.id=mm.user_id where lower(uu.email)=lower(p->>'email')) then raise exception 'This user already belongs to a workspace';end if;
 insert into public.invitations(workspace_id,email,name,station_id) values(m.workspace_id,lower(p->>'email'),p->>'name',sid) returning id into rid;
 elsif op='revoke' then
 update public.memberships set active=false where user_id=(p->>'id')::uuid and workspace_id=m.workspace_id and role='munshi' returning user_id into rid;
 if rid is null then raise exception 'Munshi not found';end if;
 elsif op='cancel_invite' then
 delete from public.invitations where id=(p->>'id')::uuid and workspace_id=m.workspace_id and accepted_at is null returning id into rid;
 elsif op='evidence' then
 if (p->>'path') not like m.workspace_id::text||'/'||auth.uid()::text||'/%' then raise exception 'Invalid evidence path';end if;
 if not exists(select 1 from storage.objects where bucket_id='evidence' and name=p->>'path' and owner_id=auth.uid()::text) then raise exception 'Upload evidence first';end if;
 if (p->>'captured_at')::timestamptz not between now()-interval '10 minutes' and now()+interval '1 minute' then raise exception 'Capture a new photo';end if;
 insert into public.evidence(workspace_id,station_id,uploaded_by,path,captured_at,latitude,longitude,accuracy,sha256) values(m.workspace_id,sid,auth.uid(),p->>'path',(p->>'captured_at')::timestamptz,(p->>'latitude')::numeric,(p->>'longitude')::numeric,(p->>'accuracy')::numeric,p->>'sha256') returning id into rid;
 elsif op='delivery' then
 select * into t from public.tanks where id=(p->>'tank_id')::uuid and station_id=sid;
 if t.id is null then raise exception 'Tank not found';end if;
 if jsonb_typeof(p->'chambers')<>'array' or jsonb_array_length(p->'chambers') not between 1 and 8 then raise exception 'Provide 1 to 8 calibrated chambers';end if;
 for x in select value from jsonb_array_elements(p->'chambers') loop perform private.calibrate((x->0->>'mm')::numeric,x);end loop;
 select price,beta into rate,allowance from public.prices where station_id=sid and grade=t.grade and effective_at<=now() order by effective_at desc limit 1;
 if rate is null then raise exception 'Set the station fuel price first';end if;
 insert into public.deliveries(workspace_id,station_id,tank_id,reference,vehicle,depot,invoice,loading_temp,price,beta,chambers) values(m.workspace_id,sid,t.id,p->>'reference',upper(p->>'vehicle'),p->>'depot',(p->>'invoice')::numeric,(p->>'loading_temp')::numeric,rate,allowance,p->'chambers') returning id into rid;
 elsif op in ('submit_delivery','approve_delivery','decant') then
 select * into d from public.deliveries where id=(p->>'id')::uuid and station_id=sid for update;
 if d.id is null then raise exception 'Delivery not found';end if;
 rid=d.id;
 if op='submit_delivery' then
 if d.status<>'dispatched' then raise exception 'This audit is already locked';end if;
 if (p->>'arrival_temp') is null or (p->>'arrival_temp')::numeric not between -20 and 80 then raise exception 'Temperature outside allowed range';end if;
 perform private.check_evidence((p->>'evidence_id')::uuid,sid);
 if jsonb_array_length(p->'dips')<>jsonb_array_length(d.chambers) then raise exception 'All chambers must be measured';end if;
 for i in 0..jsonb_array_length(d.chambers)-1 loop volume=volume+private.calibrate((p->'dips'->>i)::numeric,d.chambers->i);end loop;
 allowance=d.invoice*d.beta*greatest(0,d.loading_temp-(p->>'arrival_temp')::numeric);
 shortage=greatest(0,d.invoice-volume-allowance);
 update public.deliveries set status='submitted',measurement=p-'station_id'-'id',measured=volume,allowance=allowance,shortage=shortage,claim=round(shortage*d.price,2),submitted_at=now() where id=d.id;
 elsif op='approve_delivery' then
 if d.status<>'submitted' then raise exception 'A submitted audit is required';end if;
 update public.deliveries set status='approved',approved_at=now(),approved_by=auth.uid() where id=d.id;
 else
 if d.status<>'approved' then raise exception 'Owner approval is required before decanting';end if;
 perform 1 from public.stations where id=sid for update;
 update public.tanks set stock=stock+d.measured,updated_at=now() where id=d.tank_id;
 update public.deliveries set status='decanted',decanted_at=now() where id=d.id;
 end if;
 elsif op='open_shift' then
 perform 1 from public.stations where id=sid for update;
 if not exists(select 1 from public.nozzles where station_id=sid) then raise exception 'Configure a tank and nozzle first';end if;
 snapshot=jsonb_build_object('tanks',(select jsonb_agg(to_jsonb(tt)-'chart') from public.tanks tt where station_id=sid),'nozzles',(select jsonb_agg(to_jsonb(nn)) from public.nozzles nn where station_id=sid),'prices',(select jsonb_agg(pp) from(select distinct on(grade) grade,price from public.prices where station_id=sid and effective_at<=now() order by grade,effective_at desc)pp));
 if exists(select 1 from public.tanks tt where station_id=sid and not exists(select 1 from jsonb_array_elements(snapshot->'prices') pp where pp->>'grade'=tt.grade)) then raise exception 'Set current prices for every fuel grade';end if;
 cutoff=least(now()+interval '12 hours',((now() at time zone 'Asia/Karachi')::date+1)::timestamp at time zone 'Asia/Karachi',coalesce((select min(effective_at) from public.prices where station_id=sid and effective_at>now()),now()+interval '12 hours'));
 insert into public.shifts(workspace_id,station_id,name,opened_by,opening,due_at) values(m.workspace_id,sid,p->>'name',auth.uid(),snapshot,cutoff) returning id into rid;
 elsif op='close_shift' then
 perform 1 from public.stations where id=sid for update;
 select * into s from public.shifts where id=(p->>'id')::uuid and station_id=sid for update;
 if s.id is null or s.status<>'open' then raise exception 'Shift is already closed or unavailable';end if;
 readings=p->'nozzles';
 if jsonb_array_length(readings)<>jsonb_array_length(s.opening->'nozzles') or (select count(distinct value->>'id') from jsonb_array_elements(readings))<>jsonb_array_length(readings) then raise exception 'Each nozzle needs one closing reading';end if;
 if jsonb_array_length(p->'tanks')<>jsonb_array_length(s.opening->'tanks') or (select count(distinct value->>'id') from jsonb_array_elements(p->'tanks'))<>jsonb_array_length(p->'tanks') then raise exception 'Each tank needs one closing dip';end if;
 for x in select value from jsonb_array_elements(s.opening->'tanks') loop
 tid=(x->>'id')::uuid;sold=0;
 for y in select value from jsonb_array_elements(s.opening->'nozzles') where value->>'tank_id'=tid::text loop
 select value into snapshot from jsonb_array_elements(readings) where value->>'id'=y->>'id';
 if snapshot is null then raise exception 'Nozzle reading missing';end if;
 perform private.check_evidence((snapshot->>'evidence_id')::uuid,sid);
 closing=(snapshot->>'closing')::numeric;testing=(snapshot->>'testing')::numeric;start_value=(y->>'totalizer')::numeric;
 if closing is null or testing is null or closing<start_value or testing<0 or testing>closing-start_value then raise exception 'Invalid closing or testing reading';end if;
 sold=sold+closing-start_value-testing;
 update public.nozzles set totalizer=closing where id=(y->>'id')::uuid;
 end loop;
 select value into snapshot from jsonb_array_elements(p->'tanks') where value->>'id'=tid::text;
 perform private.check_evidence((snapshot->>'evidence_id')::uuid,sid);
 select * into t from public.tanks where id=tid;
 actual=private.calibrate((snapshot->>'dip')::numeric,t.chart);
 select coalesce(sum(measured),0) into delivered from public.deliveries where tank_id=tid and status='decanted' and decanted_at>=s.opened_at;
 expected=(x->>'stock')::numeric+delivered-sold;
 if expected<0 then raise exception 'Sales exceed recorded available stock; review deliveries';end if;
 select (value->>'price')::numeric into rate from jsonb_array_elements(s.opening->'prices') where value->>'grade'=t.grade;
 revenue=revenue+sold*rate;total_sales=total_sales+sold;
 results=results||jsonb_build_object('tank_id',tid,'name',t.name,'grade',t.grade,'sold',sold,'delivered',delivered,'expected',expected,'actual',actual,'variance',actual-expected,'price',rate);
 update public.tanks set stock=actual,updated_at=now() where id=tid;
 end loop;
 pos=(p->>'pos')::numeric;cash=(p->>'cash')::numeric;
 if pos is null or cash is null or pos<0 or cash<0 then raise exception 'Valid cash and POS totals required';end if;
 if pos>0 then perform private.check_evidence((p->>'pos_evidence_id')::uuid,sid);end if;
 select coalesce(sum(amount),0) into credit from public.parchis where shift_id=s.id;
 if pos+credit>revenue then raise exception 'POS and credit exceed nozzle revenue';end if;
 update public.shifts set status='review',closed_at=now(),submission=p-'station_id'-'id',result=jsonb_build_object('tanks',results,'liters',total_sales,'revenue',revenue,'pos',pos,'credit',credit,'cash',cash,'expected_cash',revenue-pos-credit,'cash_variance',cash-(revenue-pos-credit),'late',now()>s.due_at) where id=s.id;
 rid=s.id;
 elsif op='review_shift' then
 if length(trim(coalesce(p->>'note','')))<3 then raise exception 'Review note required';end if;
 update public.shifts set status='verified',reviewed_by=auth.uid(),reviewed_at=now(),review_note=p->>'note' where id=(p->>'id')::uuid and station_id=sid and status='review' returning id into rid;
 if rid is null then raise exception 'Submitted shift not found';end if;
 elsif op='account' then
 insert into public.accounts(workspace_id,station_id,name,credit_limit) values(m.workspace_id,sid,p->>'name',(p->>'credit_limit')::numeric) returning id into rid;
 elsif op='vehicle' then
 select * into a from public.accounts where id=(p->>'account_id')::uuid and station_id=sid;
 if a.id is null then raise exception 'Account not found';end if;
 insert into public.vehicles(workspace_id,account_id,registration,grade,max_liters) values(m.workspace_id,a.id,upper(p->>'registration'),p->>'grade',(p->>'max_liters')::numeric) returning id into rid;
 elsif op='disable_vehicle' then
 update public.vehicles set active=false where id=(p->>'id')::uuid and workspace_id=m.workspace_id returning id into rid;
 elsif op='payment' then
 select * into a from public.accounts where id=(p->>'account_id')::uuid and station_id=sid for update;
 volume=(p->>'amount')::numeric;
 if a.id is null or volume is null or volume<=0 or volume>a.balance then raise exception 'Payment must be within the outstanding balance';end if;
 insert into public.payments(workspace_id,account_id,amount,reference) values(m.workspace_id,a.id,volume,p->>'reference') returning id into rid;
 update public.accounts set balance=balance-volume where id=a.id;
 elsif op='parchi' then
 perform pg_advisory_xact_lock(hashtextextended(p->>'request_id',0));
 if exists(select 1 from public.parchis where request_id=(p->>'request_id')::uuid) then
  select pp.id into rid from public.parchis pp join public.vehicles vv on vv.id=pp.vehicle_id where pp.request_id=(p->>'request_id')::uuid and pp.workspace_id=m.workspace_id and pp.station_id=sid and pp.created_by=m.user_id and pp.nozzle_id=(p->>'nozzle_id')::uuid and pp.liters=(p->>'liters')::numeric and pp.evidence_id=(p->>'evidence_id')::uuid and vv.token=(p->>'token')::uuid;
  if rid is null then raise exception 'Request reference does not match the recorded fill';end if;
  return jsonb_build_object('id',rid,'replayed',true);
 end if;
 select * into s from public.shifts where station_id=sid and status='open' for update;
 if s.id is null or now()>s.due_at then raise exception 'Open an on-time shift before recording credit';end if;
 select * into v from public.vehicles where token=(p->>'token')::uuid and workspace_id=m.workspace_id and active;
 select * into a from public.accounts where id=v.account_id and station_id=sid for update;
 select * into n from public.nozzles where id=(p->>'nozzle_id')::uuid and station_id=sid;
 select * into t from public.tanks where id=n.tank_id;
 if v.id is null or a.id is null or t.grade<>v.grade or n.id is null then raise exception 'Vehicle or nozzle is not authorized';end if;
 volume=(p->>'liters')::numeric;
 if volume is null or volume<=0 or volume>v.max_liters then raise exception 'Fuel exceeds the vehicle allowance';end if;
 select (value->>'price')::numeric into rate from jsonb_array_elements(s.opening->'prices') where value->>'grade'=v.grade;
 cash=round(volume*rate,2);
 if a.balance+cash>a.credit_limit then raise exception 'Corporate credit limit exceeded';end if;
 perform private.check_evidence((p->>'evidence_id')::uuid,sid);
 insert into public.parchis(workspace_id,station_id,account_id,vehicle_id,shift_id,nozzle_id,liters,price,amount,evidence_id,created_by,request_id) values(m.workspace_id,sid,a.id,v.id,s.id,n.id,volume,rate,cash,(p->>'evidence_id')::uuid,auth.uid(),(p->>'request_id')::uuid) returning id into rid;
 update public.accounts set balance=balance+cash where id=a.id;
 else raise exception 'Unknown operation';
 end if;
 insert into public.audit_events(workspace_id,actor_id,action,subject_id) values(m.workspace_id,auth.uid(),op,rid);
 return jsonb_build_object('id',rid);
end $function$

;
CREATE OR REPLACE FUNCTION private.tracking(op text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m public.memberships; d public.deliveries; session public.tracking_sessions; previous public.location_reports; secret text; since timestamptz; lat numeric; lon numeric; acc numeric; stopped boolean=false; moment timestamptz=clock_timestamp();
begin
 if p is null or jsonb_typeof(p)<>'object' or p::text ~ '"(-?Infinity|NaN)"' then raise exception 'Invalid request';end if;
 if op in('create','read','revoke') then
 m=private.member();if m.user_id is null or m.role<>'owner' then raise exception 'Owner access required';end if;
 select * into d from public.deliveries where id=(p->>'delivery_id')::uuid and workspace_id=m.workspace_id;
 if d.id is null then raise exception 'Delivery not found';end if;
 if op='read' then
 select * into session from public.tracking_sessions where delivery_id=d.id order by created_at desc limit 1;
 return jsonb_build_object('session',case when session.id is null then null else to_jsonb(session)-'token_hash' end,'reports',coalesce((select jsonb_agg(r order by received_at) from (select latitude,longitude,accuracy,received_at,stationary_since,review_stop,heading,speed_ms from public.location_reports where session_id=session.id order by received_at desc limit 120)r),'[]'));
 elsif op='revoke' then update public.tracking_sessions set revoked=true where delivery_id=d.id;return '{"ok":true}';end if;
 select * into d from public.deliveries where id=d.id for update;
 if d.status<>'dispatched' then raise exception 'Tracking links are only available for dispatched deliveries';end if;
 secret=encode(extensions.gen_random_bytes(32),'hex');
 update public.tracking_sessions set revoked=true where delivery_id=d.id;
 insert into public.tracking_sessions(workspace_id,delivery_id,token_hash,depot_lat,depot_lon,station_lat,station_lon,radius_m) values(m.workspace_id,d.id,encode(extensions.digest(secret,'sha256'),'hex'),(p->>'depot_lat')::numeric,(p->>'depot_lon')::numeric,(p->>'station_lat')::numeric,(p->>'station_lon')::numeric,coalesce((p->>'radius_m')::numeric,500));
 if coalesce((p->>'save_station')::boolean,false) then update public.stations set latitude=(p->>'station_lat')::numeric,longitude=(p->>'station_lon')::numeric,geofence_m=coalesce((p->>'radius_m')::numeric,500) where id=d.station_id;end if;
 insert into public.audit_events(workspace_id,actor_id,action,subject_id)values(m.workspace_id,auth.uid(),'create_gatepass',d.id);
 return jsonb_build_object('token',secret);
 end if;
 if length(coalesce(p->>'token',''))<>64 then raise exception 'Invalid or expired driver link';end if;
 select * into session from public.tracking_sessions where token_hash=encode(extensions.digest(p->>'token','sha256'),'hex') and not revoked and expires_at>moment for update;
 if session.id is null then raise exception 'Invalid or expired driver link';end if;
 select * into d from public.deliveries where id=session.delivery_id;
 if d.status<>'dispatched' then raise exception 'This delivery no longer accepts location reports';end if;
 if op='status' then return jsonb_build_object('vehicle',d.vehicle,'depot',d.depot,'station',(select name from public.stations where id=d.station_id),'expires_at',session.expires_at,'station_lat',session.station_lat,'station_lon',session.station_lon,'depot_lat',session.depot_lat,'depot_lon',session.depot_lon);end if;
 if op<>'ping' then raise exception 'Unknown operation';end if;
 lat=(p->>'latitude')::numeric;lon=(p->>'longitude')::numeric;acc=(p->>'accuracy')::numeric;
 if lat is null or lon is null or acc is null or lat not between -90 and 90 or lon not between -180 and 180 or acc not between 0 and 500 then raise exception 'A valid location with accuracy within 500 m is required';end if;
 select * into previous from public.location_reports where session_id=session.id order by received_at desc limit 1;
 if previous.received_at>moment-interval '20 seconds' then return '{"ok":true,"throttled":true}';end if;
 if previous.id is not null and previous.received_at>moment-interval '90 seconds' and acc<=50 and previous.accuracy<=50 and private.distance_m(lat,lon,previous.latitude,previous.longitude)<=20 and private.distance_m(lat,lon,session.depot_lat,session.depot_lon)>session.radius_m+acc and private.distance_m(lat,lon,session.station_lat,session.station_lon)>session.radius_m+acc then
 since=coalesce(previous.stationary_since,previous.received_at); stopped=moment-since>=interval '8 minutes';
 end if;
 insert into public.location_reports(session_id,workspace_id,latitude,longitude,accuracy,stationary_since,review_stop,heading,speed_ms)values(session.id,session.workspace_id,lat,lon,acc,since,stopped,(p->>'heading')::numeric,(p->>'speed_ms')::numeric);
 return jsonb_build_object('ok',true,'received_at',moment);
end $function$

;
