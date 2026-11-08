-- Order link issuance by actual issue time after the delivery lock.
alter table public.tracking_sessions alter column created_at set default clock_timestamp();
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
 if op<>'read' then select * into d from public.deliveries where id=d.id for update;end if;
 if op='read' then
 select * into session from public.tracking_sessions where delivery_id=d.id order by created_at desc limit 1;
 return jsonb_build_object('session',case when session.id is null then null else to_jsonb(session)-'token_hash' end,'reports',coalesce((select jsonb_agg(r order by received_at) from (select latitude,longitude,accuracy,received_at,stationary_since,review_stop,heading,speed_ms from public.location_reports where session_id=session.id order by received_at desc limit 120)r),'[]'));
 elsif op='revoke' then update public.tracking_sessions set revoked=true where delivery_id=d.id;return '{"ok":true}';end if;
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
