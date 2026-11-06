-- PumpShield: tenant-isolated records and transactional, server-calculated operations.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.workspaces(id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100), created_at timestamptz not null default now());
create table public.memberships(user_id uuid primary key references auth.users(id), workspace_id uuid not null references public.workspaces(id), role text not null check(role in ('owner','munshi')), name text not null, active boolean not null default true);
create table public.invitations(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), email text not null, name text not null, station_id uuid, accepted_at timestamptz, unique(workspace_id,email));
create table public.stations(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), name text not null, omc text not null, city text not null, tolerance numeric not null default 15 check(tolerance between 0 and 100), created_at timestamptz not null default now());
alter table public.memberships add column station_id uuid references public.stations(id);
alter table public.invitations add foreign key(station_id) references public.stations(id);
create table public.tanks(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), station_id uuid not null references public.stations(id), name text not null, grade text not null check(grade in('MS','HSD')), capacity numeric not null check(capacity>0), stock numeric not null check(stock>=0 and stock<=capacity), chart jsonb not null, updated_at timestamptz not null default now());
create table public.nozzles(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), station_id uuid not null references public.stations(id), tank_id uuid not null references public.tanks(id), name text not null, totalizer numeric not null check(totalizer>=0), unique(station_id,name));
create table public.prices(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), station_id uuid not null references public.stations(id), grade text not null check(grade in('MS','HSD')), price numeric not null check(price>0), beta numeric not null check(beta between 0 and 0.01), margin numeric not null check(margin>0), effective_at timestamptz not null, source text not null, created_at timestamptz not null default now(), unique(station_id,grade,effective_at));
create table public.deliveries(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), station_id uuid not null references public.stations(id), tank_id uuid not null references public.tanks(id), reference text not null, vehicle text not null, depot text not null, invoice numeric not null check(invoice>0), loading_temp numeric not null check(loading_temp between -20 and 80), price numeric not null check(price>0), beta numeric not null, chambers jsonb not null, status text not null default 'dispatched' check(status in('dispatched','submitted','approved','decanted')), measurement jsonb, measured numeric, allowance numeric, shortage numeric, claim numeric, created_at timestamptz not null default now(), submitted_at timestamptz, approved_at timestamptz, approved_by uuid references auth.users(id), decanted_at timestamptz, unique(workspace_id,reference));
create table public.shifts(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), station_id uuid not null references public.stations(id), name text not null, opened_by uuid not null references auth.users(id), opened_at timestamptz not null default now(), due_at timestamptz not null, closed_at timestamptz, status text not null default 'open' check(status in('open','review','verified')), opening jsonb not null, submission jsonb, result jsonb, reviewed_by uuid references auth.users(id), reviewed_at timestamptz, review_note text);
create unique index one_open_shift on public.shifts(station_id) where status='open';
create table public.accounts(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), station_id uuid not null references public.stations(id), name text not null, credit_limit numeric not null check(credit_limit>0), balance numeric not null default 0 check(balance>=0), created_at timestamptz not null default now());
create table public.vehicles(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), account_id uuid not null references public.accounts(id), registration text not null, grade text not null check(grade in('MS','HSD')), max_liters numeric not null check(max_liters>0), token uuid not null default gen_random_uuid() unique, active boolean not null default true, unique(account_id,registration));
create table public.parchis(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), station_id uuid not null references public.stations(id), account_id uuid not null references public.accounts(id), vehicle_id uuid not null references public.vehicles(id), shift_id uuid not null references public.shifts(id), nozzle_id uuid not null references public.nozzles(id), liters numeric not null check(liters>0), price numeric not null, amount numeric not null, evidence_id uuid not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), request_id uuid not null unique);
create table public.payments(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), account_id uuid not null references public.accounts(id), amount numeric not null check(amount>0), reference text not null, created_at timestamptz not null default now(), unique(account_id,reference));
create table public.evidence(id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), station_id uuid not null references public.stations(id), uploaded_by uuid not null references auth.users(id), path text not null unique, captured_at timestamptz not null, received_at timestamptz not null default now(), latitude numeric check(latitude between -90 and 90), longitude numeric check(longitude between -180 and 180), accuracy numeric check(accuracy>=0), sha256 text not null check(length(sha256)=64));
alter table public.parchis add foreign key(evidence_id) references public.evidence(id);
create table public.audit_events(id bigint generated always as identity primary key, workspace_id uuid not null references public.workspaces(id), actor_id uuid not null references auth.users(id), action text not null, subject_id uuid, created_at timestamptz not null default now());

create function private.member() returns public.memberships language sql stable security definer set search_path='' as $$ select m from public.memberships m where m.user_id=auth.uid() and m.active $$;
revoke all on function private.member() from public;
grant execute on function private.member() to authenticated;

do $$ declare t text; begin
 foreach t in array array['workspaces','memberships','invitations','stations','tanks','nozzles','prices','deliveries','shifts','accounts','vehicles','parchis','payments','evidence','audit_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 if t='workspaces' then
 execute format('create policy owner_read on public.%I for select to authenticated using (id=(select (private.member()).workspace_id) and (select (private.member()).role)=''owner'')',t);
 elsif t='memberships' then
 execute format('create policy owner_read on public.%I for select to authenticated using (user_id=(select auth.uid()) or (workspace_id=(select (private.member()).workspace_id) and (select (private.member()).role)=''owner''))',t);
 else
 execute format('create policy owner_read on public.%I for select to authenticated using (workspace_id=(select (private.member()).workspace_id) and (select (private.member()).role)=''owner'')',t);
 end if;
 end loop;
end $$;

create function private.calibrate(dip numeric, chart jsonb) returns numeric language plpgsql immutable set search_path='' as $$
declare p jsonb; prev_mm numeric; prev_l numeric; mm numeric; vol numeric; result numeric;
begin
 if jsonb_typeof(chart)<>'array' or jsonb_array_length(chart)<2 or dip is null then raise exception 'A calibration chart with at least two points is required'; end if;
 for p in select value from jsonb_array_elements(chart) loop
 mm=(p->>'mm')::numeric; vol=(p->>'liters')::numeric;
 if mm is null or vol is null or mm<0 or vol<0 or mm::text='NaN' or vol::text='NaN' or (prev_mm is not null and (mm<=prev_mm or vol<=prev_l)) then raise exception 'Calibration points must be strictly increasing';end if;
 if dip=mm then result=vol; elsif dip>prev_mm and dip<mm then result=prev_l+(dip-prev_mm)*(vol-prev_l)/(mm-prev_mm);end if;
 prev_mm=mm;prev_l=vol;
 end loop;
 if result is null then raise exception 'Dip is outside the calibrated range';end if;
 return result;
end $$;
revoke all on function private.calibrate(numeric,jsonb) from public;

create function private.check_evidence(eid uuid,sid uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.evidence e where e.id=eid and e.station_id=sid and e.uploaded_by=auth.uid() and e.received_at>now()-interval '2 hours') then raise exception 'Fresh camera evidence is required';end if;
end $$;
revoke all on function private.check_evidence(uuid,uuid) from public;

create function private.command(op text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
end $$;
revoke all on function private.command(text,jsonb) from public;
grant execute on function private.command(text,jsonb) to authenticated;
create function public.command(op text,p jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.command(op,p)$$;
revoke all on function public.command(text,jsonb) from public,anon;
grant execute on function public.command(text,jsonb) to authenticated;

create function private.dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.memberships; result jsonb; sid uuid;
begin
 m=private.member();if m.user_id is null then return jsonb_build_object('member',null);end if;
 sid=m.station_id;
 result=jsonb_build_object('member',to_jsonb(m),'workspace',(select name from public.workspaces where id=m.workspace_id));
 if m.role='owner' then
 return result||jsonb_build_object(
 'stations',coalesce((select jsonb_agg(s order by s.created_at) from public.stations s where workspace_id=m.workspace_id),'[]'),
 'tanks',coalesce((select jsonb_agg(t) from public.tanks t where workspace_id=m.workspace_id),'[]'),
 'nozzles',coalesce((select jsonb_agg(n) from public.nozzles n where workspace_id=m.workspace_id),'[]'),
 'prices',coalesce((select jsonb_agg(p order by effective_at desc) from public.prices p where workspace_id=m.workspace_id),'[]'),
 'deliveries',coalesce((select jsonb_agg(d order by created_at desc) from (select * from public.deliveries where workspace_id=m.workspace_id order by created_at desc limit 200)d),'[]'),
 'shifts',coalesce((select jsonb_agg(s order by opened_at desc) from (select * from public.shifts where workspace_id=m.workspace_id order by opened_at desc limit 200)s),'[]'),
 'accounts',coalesce((select jsonb_agg(a) from public.accounts a where workspace_id=m.workspace_id),'[]'),
 'vehicles',coalesce((select jsonb_agg(v) from public.vehicles v where workspace_id=m.workspace_id),'[]'),
 'parchis',coalesce((select jsonb_agg(p order by created_at desc) from (select * from public.parchis where workspace_id=m.workspace_id order by created_at desc limit 200)p),'[]'),
 'members',coalesce((select jsonb_agg(mb) from public.memberships mb where workspace_id=m.workspace_id),'[]'),
 'invitations',coalesce((select jsonb_agg(i) from public.invitations i where workspace_id=m.workspace_id and accepted_at is null),'[]'),
 'events',coalesce((select jsonb_agg(e order by created_at desc) from(select * from public.audit_events where workspace_id=m.workspace_id order by created_at desc limit 50)e),'[]'));
 end if;
 -- Only operational fields are returned to the kiosk. No financial or calibration data.
 return result||jsonb_build_object(
 'stations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'omc',omc,'city',city)) from public.stations where id=sid),'[]'),
 'tanks',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'grade',grade,'station_id',station_id)) from public.tanks where station_id=sid),'[]'),
 'nozzles',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'tank_id',tank_id,'station_id',station_id,'totalizer',totalizer)) from public.nozzles where station_id=sid),'[]'),
 'deliveries',coalesce((select jsonb_agg(jsonb_build_object('id',id,'station_id',station_id,'tank_id',tank_id,'reference',reference,'vehicle',vehicle,'depot',depot,'status',status,'chamber_count',jsonb_array_length(chambers),'created_at',created_at)) from public.deliveries where station_id=sid and status<>'decanted'),'[]'),
 'shifts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'station_id',station_id,'name',name,'status',status,'opened_at',opened_at,'due_at',due_at,'opening',jsonb_build_object('nozzles',opening->'nozzles'))) from public.shifts where station_id=sid and status='open'),'[]'));
end $$;
revoke all on function private.dashboard() from public;
grant execute on function private.dashboard() to authenticated;
create function public.dashboard() returns jsonb language sql stable security invoker set search_path='' as $$select private.dashboard()$$;
revoke all on function public.dashboard() from public,anon;
grant execute on function public.dashboard() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('evidence','evidence',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy evidence_upload on storage.objects for insert to authenticated with check(bucket_id='evidence' and (storage.foldername(name))[1]=(select (private.member()).workspace_id)::text and (storage.foldername(name))[2]=(select auth.uid())::text);
create policy evidence_read on storage.objects for select to authenticated using(bucket_id='evidence' and (storage.foldername(name))[1]=(select (private.member()).workspace_id)::text and ((select (private.member()).role)='owner' or (storage.foldername(name))[2]=(select auth.uid())::text));

create index memberships_workspace on public.memberships(workspace_id);
create index stations_workspace on public.stations(workspace_id);
create index tanks_station on public.tanks(station_id);
create index nozzles_station on public.nozzles(station_id);
create index shifts_workspace on public.shifts(workspace_id,opened_at desc);
create index deliveries_station on public.deliveries(station_id,created_at desc);
create index deliveries_tank on public.deliveries(tank_id,decanted_at);
create index accounts_station on public.accounts(station_id);
create index parchis_shift on public.parchis(shift_id);
create index events_workspace on public.audit_events(workspace_id,created_at desc);
create index evidence_uploader on public.evidence(uploaded_by,received_at);
