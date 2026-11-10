-- Three-grade integration regression on disposable fixtures. Nothing survives.
-- All rates/coefficient values below are synthetic test inputs, not market data.
begin;
do $$
declare
  owner_id uuid=gen_random_uuid(); staff_id uuid=gen_random_uuid();
  wid uuid; sid uuid; shift_id uuid; delivery_id uuid; qa_account uuid;
  hobc_vehicle uuid; petrol_vehicle uuid; hobc_token uuid; petrol_token uuid;
  indent_id uuid; wrong_indent uuid; petrol_delivery uuid;
  grades text[]=array['MS','HSD','HOBC'];
  rates numeric[]=array[300,280,330];
  qa_tanks uuid[]='{}'; qa_nozzles uuid[]='{}'; evidence uuid[]='{}';
  i integer; record_id uuid; failed boolean; snapshot jsonb; result jsonb;
  request_id uuid=gen_random_uuid(); payload jsonb; fill jsonb; receipt jsonb;
  initial_balance numeric; initial_parchis bigint;
begin
  insert into auth.users(id,email,email_confirmed_at,aud,role)
  values(owner_id,owner_id||'@example.invalid',now(),'authenticated','authenticated'),
        (staff_id,staff_id||'@example.invalid',now(),'authenticated','authenticated');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  execute 'set local role authenticated';
  wid=(public.command('join','{"intent":"create_workspace","name":"Three grade QA","person":"Owner QA"}')->>'id')::uuid;
  sid=(public.command('station','{"name":"Three grade sample","omc":"QA","city":"Karachi"}')->>'id')::uuid;
  for i in 1..3 loop
    qa_tanks=array_append(qa_tanks,(public.command('tank',jsonb_build_object(
      'station_id',sid,'name',grades[i]||' tank','grade',grades[i],
      'capacity',20000,'dip',500,
      'chart','[{"mm":0,"liters":0},{"mm":2000,"liters":20000}]'::jsonb))->>'id')::uuid);
    qa_nozzles=array_append(qa_nozzles,(public.command('nozzle',jsonb_build_object(
      'station_id',sid,'tank_id',qa_tanks[i],'name',grades[i]||' nozzle','totalizer',1000))->>'id')::uuid);
    if i<3 then
      perform public.command('price',jsonb_build_object('station_id',sid,'grade',grades[i],
        'price',rates[i],'beta',0.001,'margin',10,'effective_at',now(),'source','Synthetic rate fixture'));
    end if;
  end loop;
  failed=false;
  begin perform public.command('open_shift',jsonb_build_object('station_id',sid,'name','Missing High Octane rate'));
  exception when others then failed=true;end;
  assert failed,'Shift opened without a High Octane rate';
  assert not exists(select 1 from public.shifts where station_id=sid),'Missing-rate rejection wrote a shift';
  perform public.command('price',jsonb_build_object('station_id',sid,'grade','HOBC',
    'price',330,'beta',0.00117,'margin',12,'effective_at',now(),'source','Synthetic High Octane rate fixture'));
  failed=false;
  begin perform public.command('tank',jsonb_build_object('station_id',sid,'name','Unknown fuel',
    'grade','UNKNOWN','capacity',20000,'dip',500,'chart','[{"mm":0,"liters":0},{"mm":2000,"liters":20000}]'::jsonb));
  exception when check_violation then failed=true;end;
  assert failed,'Unknown fuel grade accepted';
  assert (select count(*) from public.tanks where station_id=sid)=3,'Unknown grade rejection wrote a tank';
  qa_account=(public.command('account',jsonb_build_object('station_id',sid,'name','Three grade customer','credit_limit',100000))->>'id')::uuid;
  hobc_vehicle=(public.command('vehicle',jsonb_build_object('station_id',sid,'account_id',qa_account,
    'registration','HOBC-QA','grade','HOBC','max_liters',200))->>'id')::uuid;
  petrol_vehicle=(public.command('vehicle',jsonb_build_object('station_id',sid,'account_id',qa_account,
    'registration','MS-QA','grade','MS','max_liters',200))->>'id')::uuid;
  select token into hobc_token from public.vehicles where id=hobc_vehicle;
  select token into petrol_token from public.vehicles where id=petrol_vehicle;
  perform public.command('invite',jsonb_build_object('station_id',sid,'name','Three grade Munshi','email',staff_id||'@example.invalid'));
  perform set_config('request.jwt.claim.sub',staff_id::text,true);
  perform public.command('accept_invite',jsonb_build_object('invitation_id',public.onboarding()->'invitations'->0->>'id'));
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  shift_id=(public.command('open_shift',jsonb_build_object('station_id',sid,'name','Three grade shift'))->>'id')::uuid;
  select opening into snapshot from public.shifts where id=shift_id;
  assert jsonb_array_length(snapshot->'prices')=3,'Opening snapshot omitted a grade';
  assert exists(select 1 from jsonb_array_elements(snapshot->'prices') p where p->>'grade'='HOBC' and (p->>'price')::numeric=330),'High Octane rate not isolated in snapshot';
  delivery_id=(public.command('delivery',jsonb_build_object('station_id',sid,'tank_id',qa_tanks[3],
    'reference','HOBC-'||gen_random_uuid(),'vehicle','TANKER-QA','depot','Synthetic depot','invoice',5000,
    'loading_temp',30,'chambers','[[{"mm":0,"liters":0},{"mm":1000,"liters":10000}]]'::jsonb))->>'id')::uuid;
  assert (select price from public.deliveries where id=delivery_id)=330,'Delivery used another grade rate';
  assert (select beta from public.deliveries where id=delivery_id)=0.00117,'Delivery used another grade coefficient';
  indent_id=(public.ops_command('create',jsonb_build_object('station_id',sid,'kind','indent',
    'title','Request High Octane','supplier','QA supplier','grade','HOBC','liters',5000,'assigned_to',staff_id))->>'id')::uuid;
  perform public.ops_command('transition',jsonb_build_object('id',indent_id,'expected_status','requested','status','approved'));
  perform public.ops_command('transition',jsonb_build_object('id',indent_id,'expected_status','approved','status','dispatched','delivery_id',delivery_id));
  wrong_indent=(public.ops_command('create',jsonb_build_object('station_id',sid,'kind','indent',
    'title','Petrol order must stay Petrol','supplier','QA supplier','grade','MS','liters',5000))->>'id')::uuid;
  perform public.ops_command('transition',jsonb_build_object('id',wrong_indent,'expected_status','requested','status','approved'));
  failed=false;begin perform public.ops_command('transition',jsonb_build_object('id',wrong_indent,
    'expected_status','approved','status','dispatched','delivery_id',delivery_id));exception when others then failed=true;end;
  assert failed,'Petrol indent linked to a High Octane load';
  assert (select status from public.station_work_items where id=wrong_indent)='approved','Rejected grade mismatch changed indent';

  perform set_config('request.jwt.claim.sub',staff_id::text,true);

  snapshot=public.dashboard();
  assert exists(select 1 from jsonb_array_elements(snapshot->'tanks') t where t->>'grade'='HOBC'),'Kiosk omitted High Octane';
  assert not(snapshot ? 'prices') and not(snapshot ? 'accounts'),'Kiosk exposed financial data';
  snapshot=public.field('context',jsonb_build_object('station_id',sid));
  assert exists(select 1 from jsonb_array_elements(snapshot->'tanks') t where t->>'grade'='HOBC'),'Offline context omitted High Octane tank';
  assert exists(select 1 from jsonb_array_elements(snapshot->'nozzles') n where n->>'grade'='HOBC'),'Offline context omitted High Octane nozzle';
  assert not(snapshot ? 'prices'),'Offline context exposed prices';
  assert public.field('vehicle_lookup',jsonb_build_object('station_id',sid,'token',hobc_token))->>'grade'='HOBC','Pass lookup lost High Octane grade';
  execute 'reset role';
  for i in 1..12 loop
    insert into public.evidence(workspace_id,station_id,uploaded_by,path,captured_at,sha256,offline)
    values(wid,sid,staff_id,'qa/'||gen_random_uuid(),now(),encode(extensions.digest(i::text,'sha256'),'hex'),i=4)
    returning id into record_id;
    evidence=array_append(evidence,record_id);
  end loop;
  execute 'set local role authenticated';
  perform public.command('submit_delivery',jsonb_build_object('station_id',sid,'id',delivery_id,
    'arrival_temp',30,'dips','[500]'::jsonb,'evidence_id',evidence[1]));
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.command('approve_delivery',jsonb_build_object('station_id',sid,'id',delivery_id));
  perform set_config('request.jwt.claim.sub',staff_id::text,true);
  perform public.command('decant',jsonb_build_object('station_id',sid,'id',delivery_id));
  perform public.ops_command('transition',jsonb_build_object('id',indent_id,'expected_status','dispatched','status','received'));
  -- Both directions of misfuel prevention remain atomic. Rejected attempts do
  -- not consume evidence or alter balances/counters; the valid fill follows.
  failed=false;begin perform public.command('parchi',jsonb_build_object('station_id',sid,'token',hobc_token,
    'nozzle_id',qa_nozzles[1],'liters',10,'evidence_id',evidence[2],'request_id',gen_random_uuid()));exception when others then failed=true;end;
  assert failed,'High Octane vehicle dispensed from Petrol nozzle';
  failed=false;begin perform public.command('parchi',jsonb_build_object('station_id',sid,'token',petrol_token,
    'nozzle_id',qa_nozzles[3],'liters',10,'evidence_id',evidence[2],'request_id',gen_random_uuid()));exception when others then failed=true;end;
  assert failed,'Petrol vehicle dispensed from High Octane nozzle';
  perform public.command('parchi',jsonb_build_object('station_id',sid,'token',hobc_token,
    'nozzle_id',qa_nozzles[3],'liters',100,'evidence_id',evidence[2],'request_id',gen_random_uuid()));
  fill=jsonb_build_object('token',hobc_token,'nozzle_id',qa_nozzles[3],'liters',10,'evidence_id',evidence[4]);
  payload=jsonb_build_object('station_id',sid,'user_id',staff_id,'workspace_id',wid,'shift_id',shift_id,
    'request_id',request_id,'kind','parchi','captured_at',now(),'payload',fill);
  receipt=public.field('sync',payload);
  assert public.field('sync',payload)->>'replayed'='true','High Octane offline replay not idempotent';
  perform public.command('close_shift',jsonb_build_object('station_id',sid,'id',shift_id,
    'nozzles',jsonb_build_array(
      jsonb_build_object('id',qa_nozzles[1],'closing',1000,'testing',0,'evidence_id',evidence[5]),
      jsonb_build_object('id',qa_nozzles[2],'closing',1000,'testing',0,'evidence_id',evidence[6]),
      jsonb_build_object('id',qa_nozzles[3],'closing',1200,'testing',0,'evidence_id',evidence[7])),
    'tanks',jsonb_build_array(
      jsonb_build_object('id',qa_tanks[1],'dip',500,'evidence_id',evidence[8]),
      jsonb_build_object('id',qa_tanks[2],'dip',500,'evidence_id',evidence[9]),
      jsonb_build_object('id',qa_tanks[3],'dip',980,'evidence_id',evidence[10])),
    'cash',29700,'pos',0));
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  select s.result into result from public.shifts s where id=shift_id;
  assert (result->>'liters')::numeric=200,'Three grade shift volume incorrect';
  assert (result->>'revenue')::numeric=66000,'High Octane shift used wrong rate';
  assert (result->>'credit')::numeric=36300,'High Octane online/offline credit incorrect';
  assert (result->>'cash_variance')::numeric=0,'High Octane cash reconciliation incorrect';
  assert jsonb_array_length(result->'tanks')=3,'Reconciliation omitted a grade';
  assert not exists(select 1 from jsonb_array_elements(result->'tanks') t where (t->>'variance')::numeric<>0),'Three grade stock reconciliation incorrect';
  assert (select stock from public.tanks where id=qa_tanks[3])=9800,'High Octane stock incorrect';
  assert (select stock from public.tanks where id=qa_tanks[1])=5000 and (select stock from public.tanks where id=qa_tanks[2])=5000,'High Octane flow changed Petrol/Diesel stock';
  assert (select totalizer from public.nozzles where id=qa_nozzles[3])=1200,'High Octane counter incorrect';
  assert (select count(*) from public.parchis where account_id=qa_account)=2,'Rejected or replayed fills wrote extra parchis';
  assert (select balance from public.accounts where id=qa_account)=36300,'High Octane credit balance incorrect';
  assert (select offline_request_id from public.parchis where id=(receipt->>'id')::uuid)=request_id,'High Octane offline provenance missing';
  perform public.command('review_shift',jsonb_build_object('station_id',sid,'id',shift_id,'note','Three grade measurements verified'));
  perform public.command('payment',jsonb_build_object('station_id',sid,'account_id',qa_account,'amount',1000,'reference','Synthetic settlement'));
  assert (select balance from public.accounts where id=qa_account)=35300,'High Octane account settlement incorrect';
  assert (select status from public.shifts where id=shift_id)='verified','High Octane review not saved';
  execute 'reset role';
end $$;
select 'PASS: HOBC setup, independent rate/coefficient, delivery/indent/decant, kiosk/offline projection, vehicle matching, credit/replay, three-grade stock/cash reconciliation and settlement; fixtures rolled back' as result;
rollback;
