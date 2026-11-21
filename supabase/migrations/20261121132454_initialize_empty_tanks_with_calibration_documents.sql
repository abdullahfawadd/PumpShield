-- Calibration describes a tank. Receiving and reconciled readings determine stock.
alter table public.tanks add column calibration_document jsonb;

CREATE OR REPLACE FUNCTION private.command(op text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare m public.memberships; sid uuid; rid uuid; tid uuid; d public.deliveries; s public.shifts; t public.tanks; n public.nozzles; a public.accounts; v public.vehicles; inv public.invitations; u auth.users; x jsonb; y jsonb; readings jsonb; snapshot jsonb; results jsonb='[]'; sold numeric=0; total_sales numeric=0; revenue numeric=0; expected numeric; actual numeric; delivered numeric; volume numeric=0; allowance numeric; shortage numeric; rate numeric; cash numeric; pos numeric; credit numeric; closing numeric; testing numeric; start_value numeric; cutoff timestamptz; wid uuid;
 tank_capacity numeric; document_path text; document_name text; tank_document jsonb;
begin
 if p is null or jsonb_typeof(p)<>'object' or p::text ~ '"(-?Infinity|NaN)"' then raise exception 'Invalid request';end if;
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into u from auth.users where id=auth.uid();
 if u.email_confirmed_at is null then raise exception 'Confirm your email before continuing'; end if;
 select * into m from public.memberships where user_id=auth.uid() and active;
 if op in ('join','accept_invite','decline_invite') then
  -- Serialize membership creation even when no membership row exists yet.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  select * into m from public.memberships where user_id=auth.uid() and active;
  if m.user_id is not null then
   if op='join' then return jsonb_build_object('id',m.workspace_id);end if;
   if op='accept_invite' and exists(select 1 from public.invitations where id=(p->>'invitation_id')::uuid and lower(email)=lower(u.email) and accepted_at is not null and workspace_id=m.workspace_id and station_id=m.station_id) then return jsonb_build_object('id',m.workspace_id);end if;
   raise exception 'This account already belongs to a workspace';
  end if;
  if exists(select 1 from public.memberships where user_id=auth.uid()) then raise exception 'Workspace access has been revoked. Contact the workspace owner for recovery';end if;
  if op='join' then
   if p->>'intent' is distinct from 'create_workspace' then raise exception 'Confirm workspace creation in PumpShield before continuing';end if;
   if length(btrim(coalesce(p->>'name','')))<2 then raise exception 'Business name is required';end if;
   insert into public.workspaces(name) values(left(btrim(p->>'name'),100)) returning id into wid;
   insert into public.memberships(user_id,workspace_id,role,name) values(auth.uid(),wid,'owner',left(coalesce(nullif(btrim(p->>'person'),''),'Owner'),100));
   insert into public.audit_events(workspace_id,actor_id,action,subject_id) values(wid,auth.uid(),'create_workspace',wid);
   return jsonb_build_object('id',wid);
  end if;
  select * into inv from public.invitations where id=(p->>'invitation_id')::uuid and lower(email)=lower(u.email) and accepted_at is null and declined_at is null and expires_at>now() for update;
  if inv.id is null then raise exception 'This invitation is unavailable, expired, or belongs to another account';end if;
  if op='decline_invite' then
   update public.invitations set declined_at=now() where id=inv.id;
   insert into public.audit_events(workspace_id,actor_id,action,subject_id) values(inv.workspace_id,auth.uid(),'decline_invite',inv.id);
   return jsonb_build_object('id',inv.id);
  end if;
  if not exists(select 1 from public.stations where id=inv.station_id and workspace_id=inv.workspace_id) then raise exception 'The invitation station is no longer available';end if;
  insert into public.memberships(user_id,workspace_id,role,name,station_id) values(auth.uid(),inv.workspace_id,'munshi',inv.name,inv.station_id);
  update public.invitations set accepted_at=now() where id=inv.id;
  insert into public.audit_events(workspace_id,actor_id,action,subject_id) values(inv.workspace_id,auth.uid(),'accept_invite',inv.id);
  return jsonb_build_object('id',inv.workspace_id);
 end if;
 if m.user_id is null then raise exception 'Workspace access required';end if;
 sid=nullif(p->>'station_id','')::uuid;
 if sid is not null and not exists(select 1 from public.stations where id=sid and workspace_id=m.workspace_id and (m.role='owner' or id=m.station_id)) then raise exception 'Station access denied';end if;
 if op not in ('evidence','submit_delivery','decant','open_shift','close_shift','parchi') and m.role<>'owner' then raise exception 'Owner access required';end if;
 if op='station' then
 insert into public.stations(workspace_id,name,omc,city) values(m.workspace_id,left(p->>'name',100),left(p->>'omc',80),left(p->>'city',80)) returning id into rid;
 elsif op='tank' then
 -- Share the station lock with shift opening so its equipment snapshot is consistent.
 perform 1 from public.stations where id=sid for update;
 if not found then raise exception 'Station access denied'; end if;
 if exists(select 1 from public.shifts where station_id=sid and status='open') then
  raise exception 'Close the current shift before changing equipment';
 end if;

 tank_capacity := private.finite_numeric(p->>'capacity');
 if tank_capacity is null or tank_capacity <= 0 then raise exception 'Tank capacity must be positive'; end if;
 if jsonb_typeof(p->'chart') is distinct from 'array' then
  raise exception 'A calibration chart with at least two points is required';
 end if;
 -- Validate all chart points using the first depth, independently of inventory.
 perform private.calibrate(private.finite_numeric(p->'chart'->0->>'mm'),p->'chart');
 if private.finite_numeric(p->'chart'->-1->>'liters') > tank_capacity then
  raise exception 'Calibration exceeds capacity';
 end if;

 if p->'calibration_document' is not null and p->'calibration_document' <> 'null'::jsonb then
  document_path := p->'calibration_document'->>'path';
  document_name := btrim(p->'calibration_document'->>'name');
  if jsonb_typeof(p->'calibration_document') is distinct from 'object'
     or jsonb_typeof(p->'calibration_document'->'path') is distinct from 'string'
     or jsonb_typeof(p->'calibration_document'->'name') is distinct from 'string'
     or length(document_name) not between 1 and 200
     or document_name ~ '[[:cntrl:]]'
     or document_path !~ ('^' || m.workspace_id || '/' || m.user_id || '/' || sid ||
        '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](pdf|csv|tsv|txt|jpg|png)$') then
   raise exception 'Invalid calibration document';
  end if;
  if not exists(
   select 1 from storage.objects
   where bucket_id='tank-calibrations' and name=document_path and owner_id=m.user_id::text
  ) then
   raise exception 'Upload the calibration document before saving the tank';
  end if;
  tank_document := jsonb_build_object('path',document_path,'name',document_name);
 end if;

 -- Legacy clients may still send a dip. Only operational events post inventory.
 insert into public.tanks(workspace_id,station_id,name,grade,capacity,stock,chart,calibration_document)
 values(m.workspace_id,sid,p->>'name',p->>'grade',tank_capacity,0,p->'chart',tank_document)
 returning id into rid;
 elsif op='nozzle' then
 if exists(select 1 from public.shifts where station_id=sid and status='open')then raise exception 'Close the current shift before changing equipment';end if;
 select * into t from public.tanks where id=(p->>'tank_id')::uuid and station_id=sid;
 if t.id is null then raise exception 'Tank not found';end if;
 insert into public.nozzles(workspace_id,station_id,tank_id,name,totalizer) values(m.workspace_id,sid,t.id,p->>'name',private.finite_numeric(p->>'totalizer')) returning id into rid;
 elsif op='price' then
 cutoff=(p->>'effective_at')::timestamptz;
 if cutoff<now()-interval '5 minutes' then raise exception 'Prices cannot be backdated';end if;
 if exists(select 1 from public.shifts where station_id=sid and status='open' and cutoff<=due_at) then raise exception 'Close the open shift before changing its price';end if;
 insert into public.prices(workspace_id,station_id,grade,price,beta,margin,effective_at,source) values(m.workspace_id,sid,p->>'grade',private.finite_numeric(p->>'price'),private.finite_numeric(p->>'beta'),private.finite_numeric(p->>'margin'),cutoff,p->>'source') returning id into rid;
 elsif op='invite' then
 if length(p->>'email')>254 or position('@' in p->>'email')<2 then raise exception 'Valid email required';end if;
 if exists(select 1 from public.memberships mm join auth.users uu on uu.id=mm.user_id where lower(uu.email)=lower(p->>'email')) then raise exception 'This user already belongs to a workspace';end if;
 insert into public.invitations(workspace_id,email,name,station_id) values(m.workspace_id,lower(p->>'email'),p->>'name',sid)
 on conflict(workspace_id,email) do update set name=excluded.name,station_id=excluded.station_id,declined_at=null,expires_at=now()+interval '14 days' where public.invitations.accepted_at is null returning id into rid;
 if rid is null then raise exception 'This invitation was already accepted';end if;
 elsif op='revoke' then
 update public.memberships set active=false where user_id=(p->>'id')::uuid and workspace_id=m.workspace_id and role='munshi' returning user_id into rid;
 if rid is null then raise exception 'Munshi not found';end if;
 elsif op='cancel_invite' then
 delete from public.invitations where id=(p->>'id')::uuid and workspace_id=m.workspace_id and accepted_at is null returning id into rid;
 elsif op='evidence' then
 if (p->>'path') not like m.workspace_id::text||'/'||auth.uid()::text||'/%' then raise exception 'Invalid evidence path';end if;
 if not exists(select 1 from storage.objects where bucket_id='evidence' and name=p->>'path' and owner_id=auth.uid()::text) then raise exception 'Upload evidence first';end if;
 if (p->>'captured_at')::timestamptz not between now()-interval '10 minutes' and now()+interval '1 minute' then raise exception 'Capture a new photo';end if;
 insert into public.evidence(workspace_id,station_id,uploaded_by,path,captured_at,latitude,longitude,accuracy,sha256) values(m.workspace_id,sid,auth.uid(),p->>'path',(p->>'captured_at')::timestamptz,private.finite_numeric(p->>'latitude'),private.finite_numeric(p->>'longitude'),private.finite_numeric(p->>'accuracy'),p->>'sha256') returning id into rid;
 elsif op='delivery' then
 select * into t from public.tanks where id=(p->>'tank_id')::uuid and station_id=sid;
 if t.id is null then raise exception 'Tank not found';end if;
 if jsonb_typeof(p->'chambers')<>'array' or jsonb_array_length(p->'chambers') not between 1 and 8 then raise exception 'Provide 1 to 8 calibrated chambers';end if;
 for x in select value from jsonb_array_elements(p->'chambers') loop perform private.calibrate(private.finite_numeric(x->0->>'mm'),x);end loop;
 select price,beta into rate,allowance from public.prices where station_id=sid and grade=t.grade and effective_at<=now() order by effective_at desc limit 1;
 if rate is null then raise exception 'Set the station fuel price first';end if;
 insert into public.deliveries(workspace_id,station_id,tank_id,reference,vehicle,depot,invoice,loading_temp,price,beta,chambers) values(m.workspace_id,sid,t.id,p->>'reference',upper(p->>'vehicle'),p->>'depot',private.finite_numeric(p->>'invoice'),private.finite_numeric(p->>'loading_temp'),rate,allowance,p->'chambers') returning id into rid;
 elsif op in ('submit_delivery','approve_delivery','decant') then
 select * into d from public.deliveries where id=(p->>'id')::uuid and station_id=sid for update;
 if d.id is null then raise exception 'Delivery not found';end if;
 rid=d.id;
 if op='submit_delivery' then
 if d.status<>'dispatched' then raise exception 'This audit is already locked';end if;
 if (p->>'arrival_temp') is null or private.finite_numeric(p->>'arrival_temp') not between -20 and 80 then raise exception 'Temperature outside allowed range';end if;
 perform private.check_evidence((p->>'evidence_id')::uuid,sid);
 if jsonb_array_length(p->'dips')<>jsonb_array_length(d.chambers) then raise exception 'All chambers must be measured';end if;
 for i in 0..jsonb_array_length(d.chambers)-1 loop volume=volume+private.calibrate(private.finite_numeric(p->'dips'->>i),d.chambers->i);end loop;
 allowance=d.invoice*d.beta*greatest(0,d.loading_temp-private.finite_numeric(p->>'arrival_temp'));
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
 snapshot=jsonb_build_object('tanks',(select jsonb_agg(to_jsonb(tt)-'chart'-'calibration_document') from public.tanks tt where station_id=sid),'nozzles',(select jsonb_agg(to_jsonb(nn)) from public.nozzles nn where station_id=sid),'prices',(select jsonb_agg(pp) from(select distinct on(grade) grade,price from public.prices where station_id=sid and effective_at<=now() order by grade,effective_at desc)pp));
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
 closing=private.finite_numeric(snapshot->>'closing');testing=private.finite_numeric(snapshot->>'testing');start_value=private.finite_numeric(y->>'totalizer');
 if closing is null or testing is null or closing<start_value or testing<0 or testing>closing-start_value then raise exception 'Invalid closing or testing reading';end if;
 sold=sold+closing-start_value-testing;
 update public.nozzles set totalizer=closing where id=(y->>'id')::uuid;
 end loop;
 select value into snapshot from jsonb_array_elements(p->'tanks') where value->>'id'=tid::text;
 perform private.check_evidence((snapshot->>'evidence_id')::uuid,sid);
 select * into t from public.tanks where id=tid;
 actual=private.calibrate(private.finite_numeric(snapshot->>'dip'),t.chart);
 select coalesce(sum(measured),0) into delivered from public.deliveries where tank_id=tid and status='decanted' and decanted_at>=s.opened_at;
 expected=private.finite_numeric(x->>'stock')+delivered-sold;
 if expected<0 then raise exception 'Sales exceed recorded available stock; review deliveries';end if;
 select private.finite_numeric(value->>'price') into rate from jsonb_array_elements(s.opening->'prices') where value->>'grade'=t.grade;
 revenue=revenue+sold*rate;total_sales=total_sales+sold;
 results=results||jsonb_build_object('tank_id',tid,'name',t.name,'grade',t.grade,'sold',sold,'delivered',delivered,'expected',expected,'actual',actual,'variance',actual-expected,'price',rate);
 update public.tanks set stock=actual,updated_at=now() where id=tid;
 end loop;
 pos=private.finite_numeric(p->>'pos');cash=private.finite_numeric(p->>'cash');
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
 insert into public.accounts(workspace_id,station_id,name,credit_limit) values(m.workspace_id,sid,p->>'name',private.finite_numeric(p->>'credit_limit')) returning id into rid;
 elsif op='vehicle' then
 select * into a from public.accounts where id=(p->>'account_id')::uuid and station_id=sid;
 if a.id is null then raise exception 'Account not found';end if;
 insert into public.vehicles(workspace_id,account_id,registration,grade,max_liters) values(m.workspace_id,a.id,upper(p->>'registration'),p->>'grade',private.finite_numeric(p->>'max_liters')) returning id into rid;
 elsif op='disable_vehicle' then
 update public.vehicles set active=false where id=(p->>'id')::uuid and workspace_id=m.workspace_id returning id into rid;
 elsif op='payment' then
 select * into a from public.accounts where id=(p->>'account_id')::uuid and station_id=sid for update;
 volume=private.finite_numeric(p->>'amount');
 if a.id is null or volume is null or volume<=0 or volume>a.balance then raise exception 'Payment must be within the outstanding balance';end if;
 insert into public.payments(workspace_id,account_id,amount,reference) values(m.workspace_id,a.id,volume,p->>'reference') returning id into rid;
 update public.accounts set balance=balance-volume where id=a.id;
 elsif op='parchi' then
 perform pg_advisory_xact_lock(hashtextextended(p->>'request_id',0));
 if exists(select 1 from public.parchis where request_id=(p->>'request_id')::uuid) then
  select pp.id into rid from public.parchis pp join public.vehicles vv on vv.id=pp.vehicle_id where pp.request_id=(p->>'request_id')::uuid and pp.workspace_id=m.workspace_id and pp.station_id=sid and pp.created_by=m.user_id and pp.nozzle_id=(p->>'nozzle_id')::uuid and pp.liters=private.finite_numeric(p->>'liters') and pp.evidence_id=(p->>'evidence_id')::uuid and vv.token=(p->>'token')::uuid;
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
 volume=private.finite_numeric(p->>'liters');
 if volume is null or volume<=0 or volume>v.max_liters then raise exception 'Fuel exceeds the vehicle allowance';end if;
 select private.finite_numeric(value->>'price') into rate from jsonb_array_elements(s.opening->'prices') where value->>'grade'=v.grade;
 cash=round(volume*rate,2);
 if a.balance+cash>a.credit_limit then raise exception 'Corporate credit limit exceeded';end if;
 perform private.check_evidence((p->>'evidence_id')::uuid,sid);
 insert into public.parchis(workspace_id,station_id,account_id,vehicle_id,shift_id,nozzle_id,liters,price,amount,evidence_id,created_by,request_id) values(m.workspace_id,sid,a.id,v.id,s.id,n.id,volume,rate,cash,(p->>'evidence_id')::uuid,auth.uid(),(p->>'request_id')::uuid) returning id into rid;
 update public.accounts set balance=balance+cash where id=a.id;
 else raise exception 'Unknown operation';
 end if;
 insert into public.audit_events(workspace_id,actor_id,action,subject_id) values(m.workspace_id,auth.uid(),op,rid);
 return jsonb_build_object('id',rid);
end $function$;
