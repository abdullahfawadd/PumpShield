create or replace function private.ops_snapshot(sid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.memberships; result jsonb;
begin
 m=private.member();
 if m.user_id is null then raise exception 'Workspace access required'; end if;
 if not exists(select 1 from public.stations where id=sid and workspace_id=m.workspace_id and (m.role='owner' or id=m.station_id)) then raise exception 'Station access denied'; end if;
 select jsonb_build_object(
 'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.updated_at desc) from (select * from public.station_work_items where station_id=sid and workspace_id=m.workspace_id and (m.role='owner' or kind<>'exception') order by updated_at desc limit 500) i),'[]'::jsonb),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',user_id,'name',name,'role',role)) from public.memberships where workspace_id=m.workspace_id and active and (role='owner' or station_id=sid)),'[]'::jsonb)) into result;
 return result;
end $$;
