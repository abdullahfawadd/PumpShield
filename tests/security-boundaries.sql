-- Real Postgres regression suite; all synthetic fixtures are rolled back.
begin;
do $$
declare
 owner_a uuid=gen_random_uuid();owner_b uuid=gen_random_uuid();worker uuid=gen_random_uuid();future_owner uuid=gen_random_uuid();outsider uuid=gen_random_uuid();expired_user uuid=gen_random_uuid();
 wa uuid;wb uuid;sid uuid;sb uuid;tank uuid;nozzle uuid;shift uuid;delivery uuid;ia uuid;ib uuid;ifuture uuid;iexpired uuid;
 e1 uuid=gen_random_uuid();e2 uuid=gen_random_uuid();choice jsonb;answer jsonb;args jsonb;bad text;field_name text;failed boolean;
begin
 insert into auth.users(id,email,email_confirmed_at,aud,role)
 select uid,uid||'@example.invalid',now(),'authenticated','authenticated' from unnest(array[owner_a,owner_b,worker,future_owner,outsider,expired_user])uid;
 perform set_config('request.jwt.claim.sub',owner_a::text,true);execute 'set local role authenticated';
 wa=(public.command('join','{"intent":"create_workspace","name":"Security QA A","person":"Owner A"}')->>'id')::uuid;
 sid=(public.command('station','{"name":"QA A","omc":"QA","city":"Karachi"}')->>'id')::uuid;
 tank=(public.command('tank',jsonb_build_object('station_id',sid,'name','Petrol','grade','MS','capacity',50000,'dip',1000,'chart','[{"mm":0,"liters":0},{"mm":5000,"liters":50000}]'::jsonb))->>'id')::uuid;
 nozzle=(public.command('nozzle',jsonb_build_object('station_id',sid,'tank_id',tank,'name','N1','totalizer',1000))->>'id')::uuid;
 perform public.command('price',jsonb_build_object('station_id',sid,'grade','MS','price',300,'beta',0.00115,'margin',10,'effective_at',now(),'source','Synthetic QA'));
 ia=(public.command('invite',jsonb_build_object('station_id',sid,'email',worker||'@example.invalid','name','Worker'))->>'id')::uuid;
 ifuture=(public.command('invite',jsonb_build_object('station_id',sid,'email',future_owner||'@example.invalid','name','Future owner'))->>'id')::uuid;
 iexpired=(public.command('invite',jsonb_build_object('station_id',sid,'email',expired_user||'@example.invalid','name','Expired user'))->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',owner_b::text,true);
 wb=(public.command('join','{"intent":"create_workspace","name":"Security QA B","person":"Owner B"}')->>'id')::uuid;
 sb=(public.command('station','{"name":"QA B","omc":"QA","city":"Karachi"}')->>'id')::uuid;
 ib=(public.command('invite',jsonb_build_object('station_id',sb,'email',worker||'@example.invalid','name','Worker B'))->>'id')::uuid;

 perform set_config('request.jwt.claim.sub',outsider::text,true);
 failed=false;begin perform public.command('decline_invite',jsonb_build_object('invitation_id',ia));exception when others then failed=true;end;assert failed,'Another recipient declined an invitation';
 failed=false;begin perform public.command('accept_invite',jsonb_build_object('invitation_id',ia));exception when others then failed=true;end;assert failed,'Another recipient accepted an invitation';
 perform set_config('request.jwt.claim.sub',worker::text,true);
 choice=public.onboarding();assert jsonb_array_length(choice->'invitations')=2,'Recipient choices missing';
 assert not exists(select 1 from public.memberships where user_id=worker),'Read-only onboarding created membership';
 failed=false;begin perform public.command('join','{"intent":"create_workspace",}');exception when others then failed=true;end;assert failed,'Empty join auto-accepted an invitation';
 assert not exists(select 1 from public.memberships where user_id=worker),'Failed join created membership';
 perform public.command('decline_invite',jsonb_build_object('invitation_id',ib));
 assert jsonb_array_length(public.onboarding()->'invitations')=1,'Declined invitation remains selectable';
 answer=public.command('accept_invite',jsonb_build_object('invitation_id',ia));
 assert answer->>'id'=wa::text,'Recipient joined the wrong workspace';
 answer=public.command('accept_invite',jsonb_build_object('invitation_id',ia));assert answer->>'id'=wa::text,'Accepted invitation replay was not idempotent';
 assert (select workspace_id=wa and station_id=sid and role='munshi' from public.memberships where user_id=worker),'Wrong role/station assigned';

 perform set_config('request.jwt.claim.sub',future_owner::text,true);
 perform public.command('decline_invite',jsonb_build_object('invitation_id',ifuture));
 answer=public.command('join','{"intent":"create_workspace","name":"Independent business","person":"Independent owner"}');
 assert answer->>'id'<>wa::text,'Declined invitation captured owner onboarding';
 assert (select role='owner' from public.memberships where user_id=future_owner),'Independent owner creation failed';

 execute 'reset role';update public.invitations set expires_at=now()-interval '1 minute' where id=iexpired;
 perform set_config('request.jwt.claim.sub',expired_user::text,true);execute 'set local role authenticated';
 assert jsonb_array_length(public.onboarding()->'invitations')=0,'Expired invitation exposed as pending';
 failed=false;begin perform public.command('accept_invite',jsonb_build_object('invitation_id',iexpired));exception when others then failed=true;end;assert failed,'Expired invitation accepted';

 perform set_config('request.jwt.claim.sub',owner_a::text,true);
 shift=(public.command('open_shift',jsonb_build_object('station_id',sid,'name','Security QA shift'))->>'id')::uuid;
 delivery=(public.command('delivery',jsonb_build_object('station_id',sid,'tank_id',tank,'reference',gen_random_uuid(),'vehicle','QA-TRUCK','depot','QA depot','invoice',10000,'loading_temp',38,'chambers','[[{"mm":0,"liters":0},{"mm":1000,"liters":10000}]]'::jsonb))->>'id')::uuid;
 execute 'reset role';
 insert into public.evidence(id,workspace_id,station_id,uploaded_by,path,captured_at,sha256) values(e1,wa,sid,worker,wa||'/'||worker||'/'||e1,now(),repeat('a',64)),(e2,wa,sid,worker,wa||'/'||worker||'/'||e2,now(),repeat('b',64));
 failed=false;begin update public.nozzles set totalizer='NaN'::numeric where id=nozzle;exception when check_violation then failed=true;end;assert failed,'Storage constraint admitted NaN';
 failed=false;begin update public.tanks set chart='[{"mm":0,"liters":0},{"mm":"Infinity","liters":50000}]' where id=tank;exception when check_violation then failed=true;end;assert failed,'Certified chart storage admitted Infinity';
 assert private.finite_json_values('{"note":"NaN is the subject of this synthetic test","cash":"10.25"}'),'Finite JSON rejected a harmless note';
 assert not private.finite_json_values('{"nozzles":[{"closing":"nAn"}]}'),'Finite JSON accepted a poisoned snapshot';
 perform set_config('request.jwt.claim.sub',worker::text,true);execute 'set local role authenticated';
 foreach bad in array array['nan','nAn',' NaN ','Infinity','-Infinity',' +Infinity ','1e999999'] loop
  failed=false;begin perform private.finite_numeric(bad);exception when others then failed=true;end;assert failed,'Numeric parser admitted '||bad;
  foreach field_name in array array['closing','testing','dip','cash','pos'] loop
   args=jsonb_build_object('station_id',sid,'id',shift,'nozzles',jsonb_build_array(jsonb_build_object('id',nozzle,'closing',1100,'testing',0,'evidence_id',e1)),'tanks',jsonb_build_array(jsonb_build_object('id',tank,'dip',990,'evidence_id',e2)),'cash',30000,'pos',0);
   if field_name in('closing','testing')then args=jsonb_set(args,array['nozzles','0',field_name],to_jsonb(bad));
   elsif field_name='dip'then args=jsonb_set(args,array['tanks','0','dip'],to_jsonb(bad));
   else args=jsonb_set(args,array[field_name],to_jsonb(bad));end if;
   failed=false;begin perform public.command('close_shift',args);exception when others then failed=true;end;assert failed,'close_shift admitted '||field_name||'='||bad;
  end loop;
 end loop;
 execute 'reset role';
 assert (select status='open' from public.shifts where id=shift),'Rejected close changed shift';
 assert (select totalizer=1000 from public.nozzles where id=nozzle),'Rejected close poisoned baseline';
 assert (select stock=10000 from public.tanks where id=tank),'Rejected close changed stock';
 execute 'set local role authenticated';
 args=jsonb_build_object('station_id',sid,'id',shift,'nozzles',jsonb_build_array(jsonb_build_object('id',nozzle,'closing',1100,'testing',0,'evidence_id',e1)),'tanks',jsonb_build_array(jsonb_build_object('id',tank,'dip',990,'evidence_id',e2)),'cash',30000,'pos',0);
 perform public.command('close_shift',args);
 perform set_config('request.jwt.claim.sub',owner_a::text,true);
 assert (select (result->>'revenue')::numeric=30000 and status='review' from public.shifts where id=shift),'Finite closure did not remain functional';
 failed=false;begin perform public.tracking('create',jsonb_build_object('delivery_id',delivery,'depot_lat','nan','depot_lon',67,'station_lat',25,'station_lon',68));exception when others then failed=true;end;assert failed,'Tracking admitted non-finite coordinate';
 failed=false;begin perform public.field('station_position',jsonb_build_object('station_id',sid,'latitude',24,'longitude',67,'radius_m','nAn'));exception when others then failed=true;end;assert failed,'Field position admitted non-finite radius';
 failed=false;begin perform public.ops_command('create',jsonb_build_object('station_id',sid,'kind','indent','title','Synthetic indent','supplier','QA','grade','MS','liters','nan'));exception when others then failed=true;end;assert failed,'Indent admitted non-finite quantity';
 execute 'reset role';
 assert private.calibrate(100,'[{"mm":0,"liters":0},{"mm":1000,"liters":10000}]')=1000,'Finite calibration baseline failed';
 failed=false;begin perform private.calibrate('NaN'::numeric,'[{"mm":0,"liters":0},{"mm":1000,"liters":10000}]');exception when raise_exception then failed=true;end;assert failed,'Calibrate admitted non-finite dip';
 failed=false;begin perform private.calibrate(100,'[{"mm":0,"liters":0},{"mm":"Infinity","liters":10000}]');exception when raise_exception then failed=true;end;assert failed,'Calibrate admitted non-finite chart point';
 execute 'set local role authenticated';
 perform public.command('revoke',jsonb_build_object('id',worker));
 perform set_config('request.jwt.claim.sub',worker::text,true);
 assert (public.onboarding()->>'revoked')::boolean,'Revoked access not disclosed';
 failed=false;begin perform public.command('join','{"intent":"create_workspace","name":"Revocation escape","person":"Worker"}');exception when others then failed=true;end;assert failed,'Revoked staff escaped into a new workspace';
 execute 'reset role';
end $$;
select 'PASS: explicit recipient consent, tenant selection, decline, expiry, revoked access, finite SQL parsing/storage and failed-shift atomicity; fixtures rolled back' as result;
rollback;
