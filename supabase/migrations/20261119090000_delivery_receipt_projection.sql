create or replace function private.ops_snapshot(sid uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  member public.memberships;
  result jsonb;
begin
  member := private.member();
  if member.user_id is null then raise exception 'Workspace access required'; end if;
  if not exists (
    select 1 from public.stations
    where id = sid and workspace_id = member.workspace_id
      and (member.role = 'owner' or id = member.station_id)
  ) then
    raise exception 'Station access denied';
  end if;

  with items as (
    select * from public.station_work_items
    where station_id = sid and workspace_id = member.workspace_id
      and (member.role = 'owner' or kind <> 'exception')
    order by updated_at desc limit 500
  ), recent_deliveries as (
    select id from public.deliveries
    where station_id = sid and workspace_id = member.workspace_id
    order by (status = 'decanted'), created_at desc limit 200
  ), delivery_ids as (
    select id from recent_deliveries
    union
    select delivery_id from items where delivery_id is not null
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.updated_at desc) from items i), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('id', user_id, 'name', name, 'role', role))
      from public.memberships
      where workspace_id = member.workspace_id and active and (role = 'owner' or station_id = sid)
    ), '[]'::jsonb),
    'delivery_links', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id, 'reference', d.reference, 'status', d.status, 'grade', t.grade,
          'linked_work_id', linked.id
        ) order by (d.status = 'decanted'), d.created_at desc
      )
      from delivery_ids ids
      join public.deliveries d on d.id = ids.id
      join public.tanks t on t.id = d.tank_id
      left join public.station_work_items linked
        on linked.delivery_id = d.id and linked.kind = 'indent' and linked.status <> 'cancelled'
        and linked.station_id = sid and linked.workspace_id = member.workspace_id
      where d.station_id = sid and d.workspace_id = member.workspace_id
    ), '[]'::jsonb)
  ) into result;
  return result;
end $$;
