-- Run against disposable fixture data. All changes roll back.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  wid uuid;
  sid uuid;
  other_sid uuid;
  existing_tank uuid;
  new_tank uuid;
  shift_id uuid;
  certified_chart jsonb := '[{"mm":100,"liters":250},{"mm":200,"liters":900}]';
  args jsonb;
  attachment jsonb;
  file_path text;
  other_path text;
  rejected boolean;
begin
  insert into auth.users(id,email,email_confirmed_at,aud,role)
  values(owner_id,owner_id||'@example.invalid',now(),'authenticated','authenticated'),
        (staff_id,staff_id||'@example.invalid',now(),'authenticated','authenticated');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  execute 'set local role authenticated';
  wid := (public.command('join','{"intent":"create_workspace","name":"Tank setup QA"}')->>'id')::uuid;
  sid := (public.command('station','{"name":"Receiving station","omc":"QA","city":"Karachi"}')->>'id')::uuid;
  other_sid := (public.command('station','{"name":"Other station","omc":"QA","city":"Karachi"}')->>'id')::uuid;

  args := jsonb_build_object('station_id',sid,'name','Petrol','grade','MS','capacity',1000,'chart',certified_chart);
  existing_tank := (public.command('tank',args)->>'id')::uuid;
  assert (select stock=0 and chart=certified_chart and calibration_document is null
    from public.tanks where id=existing_tank), 'Configuring a chart without a dip failed';

  file_path := wid||'/'||owner_id||'/'||sid||'/'||gen_random_uuid()||'.pdf';
  other_path := wid||'/'||owner_id||'/'||other_sid||'/'||gen_random_uuid()||'.pdf';
  attachment := jsonb_build_object('path',file_path,'name','Certified calibration.pdf');
  rejected := false;
  begin
    perform public.command('tank',args||jsonb_build_object('calibration_document',attachment));
  exception when raise_exception then
    rejected := sqlerrm = 'Upload the calibration document before saving the tank';
  end;
  assert rejected, 'Tank attached a missing storage object';

  execute 'reset role';
  update public.tanks set stock=350 where id=existing_tank;
  execute 'set local role authenticated';
  insert into storage.objects(bucket_id,name,owner_id)
  values('tank-calibrations',file_path,owner_id::text),('tank-calibrations',other_path,owner_id::text);

  rejected := false;
  begin
    perform public.command('tank',args||jsonb_build_object(
      'calibration_document',jsonb_build_object('path',other_path,'name','Other station.pdf')));
  exception when raise_exception then
    rejected := sqlerrm = 'Invalid calibration document';
  end;
  assert rejected, 'Tank attached a document from a different station';

  rejected := false;
  begin
    perform public.command('tank',args||'{"capacity":500}');
  exception when raise_exception then
    rejected := sqlerrm = 'Calibration exceeds capacity';
  end;
  assert rejected, 'Tank accepted a calibration exceeding capacity';

  rejected := false;
  begin
    perform public.command('tank',args||'{"chart":[{"mm":100,"liters":250},{"mm":90,"liters":900}]}');
  exception when raise_exception then
    rejected := sqlerrm = 'Calibration points must be strictly increasing';
  end;
  assert rejected, 'Tank accepted non-increasing calibration points';

  -- A legacy client may send either field alongside a valid chart.
  new_tank := (public.command('tank',args||jsonb_build_object(
    'name','Another petrol tank','dip',150,'stock',900,'calibration_document',attachment))->>'id')::uuid;
  assert (select stock=0 and chart=certified_chart and calibration_document=attachment
    from public.tanks where id=new_tank), 'Configured tank did not save a zero balance and the selected document';
  assert (select stock=350 from public.tanks where id=existing_tank),
    'Configuring another tank changed existing inventory';
  assert (select count(*) from public.tanks where station_id=sid)=2,
    'A rejected calibration wrote a tank';
  assert exists(select 1 from jsonb_array_elements(public.dashboard()->'tanks') t
    where t->>'id'=new_tank::text and t->'calibration_document'=attachment),
    'Owner dashboard omitted the attached calibration document';
  delete from storage.objects where bucket_id='tank-calibrations' and name in (file_path, other_path);
  assert exists(select 1 from storage.objects where bucket_id='tank-calibrations' and name=file_path),
    'Linked calibration could be removed by cleanup';
  assert not exists(select 1 from storage.objects where bucket_id='tank-calibrations' and name=other_path),
    'Unlinked calibration could not be discarded';

  perform public.command('nozzle',jsonb_build_object('station_id',sid,'tank_id',new_tank,'name','N1','totalizer',1000));
  perform public.command('price',jsonb_build_object('station_id',sid,'grade','MS','price',300,'beta',0.001,
    'margin',10,'effective_at',now(),'source','Synthetic rate'));
  shift_id := (public.command('open_shift',jsonb_build_object('station_id',sid,'name','QA shift'))->>'id')::uuid;
  assert not exists(select 1 from public.shifts s, jsonb_array_elements(s.opening->'tanks') t
    where s.id=shift_id and t ? 'calibration_document'),
    'Shift opening exposed calibration attachment metadata';
  rejected := false;
  begin
    perform public.command('tank',args);
  exception when raise_exception then
    rejected := sqlerrm = 'Close the current shift before changing equipment';
  end;
  assert rejected, 'Equipment changed during an open shift';

  perform public.command('invite',jsonb_build_object('station_id',sid,'email',staff_id||'@example.invalid','name','QA staff'));
  perform set_config('request.jwt.claim.sub',staff_id::text,true);
  perform public.command('accept_invite',jsonb_build_object('invitation_id',public.onboarding()->'invitations'->0->>'id'));
  assert not exists(select 1 from jsonb_array_elements(public.dashboard()->'tanks') t where t ? 'calibration_document'),
    'Munshi dashboard exposed the calibration attachment';
  assert not exists(select 1 from public.tanks where id=new_tank),
    'Munshi could read the private tank record';
  assert not exists(select 1 from storage.objects where bucket_id='tank-calibrations' and name=file_path),
    'Munshi could read the calibration source';
  rejected := false;
  begin
    perform public.command('tank',args);
  exception when raise_exception then
    rejected := sqlerrm = 'Owner access required';
  end;
  assert rejected, 'Munshi could create a tank';
  execute 'reset role';
end $$;
select 'PASS: zero starting stock, certified calibration, private attachment binding, preserved inventory and role boundaries' as result;
rollback;
