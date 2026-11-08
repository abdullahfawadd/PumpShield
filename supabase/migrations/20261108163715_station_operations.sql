-- Durable station workflows. No inventory or financial postings occur in these tables.
create table public.station_work_items (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id), station_id uuid not null references public.stations(id),
 kind text not null check(kind in ('exception','indent','maintenance','handover')),
 title text not null check(length(title) between 3 and 140), description text not null default '' check(length(description)<=4000),
 priority text not null default 'normal' check(priority in ('normal','high','urgent')),
 status text not null, due_at timestamptz, assigned_to uuid references public.memberships(user_id),
 supplier text check(length(supplier)<=140), grade text check(grade in ('MS','HSD')), liters numeric check(liters>0 and liters<=1000000),
 equipment text check(length(equipment)<=140), delivery_id uuid references public.deliveries(id), shift_id uuid references public.shifts(id),
 created_by uuid not null references public.memberships(user_id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz,
 check((kind='exception' and status in ('open','investigating','resolved','cancelled')) or (kind='indent' and status in ('requested','approved','dispatched','received','cancelled')) or (kind='maintenance' and status in ('scheduled','in_progress','completed','cancelled')) or (kind='handover' and status in ('pending','accepted','cancelled'))),
 check(kind<>'indent' or (supplier is not null and length(supplier)>1 and grade is not null and liters is not null)),
 check(kind<>'handover' or (assigned_to is not null and assigned_to<>created_by))
);
create table public.work_item_events (
 id bigint generated always as identity primary key, item_id uuid not null references public.station_work_items(id), actor_id uuid not null references public.memberships(user_id),
 action text not null, note text not null default '' check(length(note)<=4000), created_at timestamptz not null default now()
);
create index work_items_station on public.station_work_items(workspace_id,station_id,updated_at desc);
create index work_items_assignee on public.station_work_items(assigned_to);
create index work_items_creator on public.station_work_items(created_by);
create index work_items_delivery on public.station_work_items(delivery_id);
create index work_items_shift on public.station_work_items(shift_id);
create index work_events_item on public.work_item_events(item_id,created_at);
create index work_events_actor on public.work_item_events(actor_id);
alter table public.station_work_items enable row level security;
alter table public.work_item_events enable row level security;
revoke all on public.station_work_items,public.work_item_events from anon,authenticated;
grant select on public.station_work_items,public.work_item_events to authenticated;
create policy work_items_read on public.station_work_items for select to authenticated using (
 workspace_id=(select (private.member()).workspace_id) and ((select (private.member()).role)='owner' or (station_id=(select (private.member()).station_id) and kind<>'exception'))
);
create policy work_events_read on public.work_item_events for select to authenticated using (exists(select 1 from public.station_work_items i where i.id=item_id));

create function private.ops_snapshot(sid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.memberships; result jsonb;
begin
 m=private.member();
 if m.user_id is null then raise exception 'Workspace access required'; end if;
 if not exists(select 1 from public.stations where id=sid and workspace_id=m.workspace_id and (m.role='owner' or id=m.station_id)) then raise exception 'Station access denied'; end if;
 select jsonb_build_object(
 'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.updated_at desc) from (select * from public.station_work_items where station_id=sid and workspace_id=m.workspace_id and (m.role='owner' or kind<>'exception') order by updated_at desc limit 500) i),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.work_item_events e where e.item_id in (select id from public.station_work_items where station_id=sid and workspace_id=m.workspace_id and (m.role='owner' or kind<>'exception') order by updated_at desc limit 500)),'[]'::jsonb),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',user_id,'name',name,'role',role)) from public.memberships where workspace_id=m.workspace_id and active and (role='owner' or station_id=sid)),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.ops_snapshot(sid uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.ops_snapshot(sid)$$;

create function private.ops_command(op text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.memberships; i public.station_work_items; sid uuid; rid uuid; aid uuid; next_status text; note text; k text; did uuid; shid uuid;
begin
 m=private.member(); if m.user_id is null then raise exception 'Workspace access required'; end if;
 note=btrim(coalesce(p->>'note','')); if length(note)>4000 then raise exception 'Note is too long'; end if;
 if op='create' then
  sid=(p->>'station_id')::uuid; k=p->>'kind'; aid=nullif(p->>'assigned_to','')::uuid;
  if not exists(select 1 from public.stations where id=sid and workspace_id=m.workspace_id and (m.role='owner' or id=m.station_id)) then raise exception 'Station access denied'; end if;
  if k not in ('exception','indent','maintenance','handover') or k is null then raise exception 'Choose a workflow'; end if;
  if m.role<>'owner' and k in ('exception','indent') then raise exception 'Owner access required'; end if;
  if aid is not null and not exists(select 1 from public.memberships where user_id=aid and workspace_id=m.workspace_id and active and (role='owner' or station_id=sid)) then raise exception 'Choose an active station team member'; end if;
  if k='handover' and (aid is null or aid=m.user_id) then raise exception 'Choose someone else to receive this handover'; end if;
  if length(btrim(coalesce(p->>'title',''))) not between 3 and 140 or length(coalesce(p->>'description',''))>4000 then raise exception 'Enter a title of 3 to 140 characters and a description under 4000'; end if;
  did=nullif(p->>'delivery_id','')::uuid; shid=nullif(p->>'shift_id','')::uuid;
  if did is not null and not exists(select 1 from public.deliveries where id=did and workspace_id=m.workspace_id and station_id=sid) then raise exception 'Delivery must belong to this station'; end if;
  if shid is not null and not exists(select 1 from public.shifts where id=shid and workspace_id=m.workspace_id and station_id=sid and status<>'open') then raise exception 'Select a closed shift from this station'; end if;
  insert into public.station_work_items(workspace_id,station_id,kind,title,description,priority,status,due_at,assigned_to,supplier,grade,liters,equipment,delivery_id,shift_id,created_by)
  values(m.workspace_id,sid,k,btrim(p->>'title'),coalesce(p->>'description',''),coalesce(p->>'priority','normal'),case k when 'exception' then 'open' when 'indent' then 'requested' when 'maintenance' then 'scheduled' else 'pending' end,nullif(p->>'due_at','')::timestamptz,aid,nullif(btrim(p->>'supplier'),''),nullif(p->>'grade',''),nullif(p->>'liters','')::numeric,nullif(p->>'equipment',''),did,shid,m.user_id) returning id into rid;
  insert into public.work_item_events(item_id,actor_id,action) values(rid,m.user_id,'created');
 else
  select * into i from public.station_work_items where id=(p->>'id')::uuid and workspace_id=m.workspace_id for update;
  if i.id is null or (m.role<>'owner' and (i.station_id is distinct from m.station_id or i.kind='exception')) then raise exception 'Work item not found'; end if;
  rid=i.id;
  if op='comment' then
   if length(note)<2 then raise exception 'Enter a note'; end if;
   insert into public.work_item_events(item_id,actor_id,action,note) values(rid,m.user_id,'comment',note);
  elsif op='transition' then
   next_status=p->>'status';
   if p->>'expected_status' is distinct from i.status then raise exception 'This item changed. Refresh before continuing'; end if;
   if i.status in ('resolved','received','completed','accepted','cancelled') then raise exception 'This item is already closed'; end if;
   if m.role<>'owner' and i.assigned_to is distinct from m.user_id then raise exception 'Only the assigned person or owner can advance this item'; end if;
   if next_status='cancelled' then
    if m.role<>'owner' or length(note)<5 then raise exception 'Owner access and a cancellation reason are required'; end if;
   elsif i.kind='exception' then
    if not ((i.status='open' and next_status='investigating') or (i.status='investigating' and next_status='resolved' and length(note)>=5)) then raise exception 'Investigate first, then record a resolution of at least 5 characters'; end if;
   elsif i.kind='indent' then
    if not ((i.status='requested' and next_status='approved' and m.role='owner') or (i.status='approved' and next_status='dispatched') or (i.status='dispatched' and next_status='received')) then raise exception 'Indents must be approved by the owner, dispatched, then received'; end if;
    if next_status in ('dispatched','received') then
     did=coalesce(nullif(p->>'delivery_id','')::uuid,i.delivery_id);
     if not exists(select 1 from public.deliveries d join public.tanks t on t.id=d.tank_id where d.id=did and d.workspace_id=m.workspace_id and d.station_id=i.station_id and t.grade=i.grade and (next_status<>'received' or d.status='decanted')) then raise exception 'Link a delivery of the same fuel grade; receipt requires a posted decant'; end if;
     if exists(select 1 from public.station_work_items where delivery_id=did and kind='indent' and status<>'cancelled' and id<>i.id) then raise exception 'This delivery is already linked to another indent'; end if;
     update public.station_work_items set delivery_id=did where id=rid;
    end if;
   elsif i.kind='maintenance' then
    if not ((i.status='scheduled' and next_status='in_progress') or (i.status='in_progress' and next_status='completed' and length(note)>=5)) then raise exception 'Start the job, then record the completed work in at least 5 characters'; end if;
   elsif i.kind='handover' then
    if next_status is distinct from 'accepted' or i.assigned_to is distinct from m.user_id then raise exception 'Only the named recipient can accept a handover'; end if;
   end if;
   update public.station_work_items set status=next_status,completed_at=case when next_status in ('resolved','received','completed','accepted','cancelled') then now() else null end where id=rid;
   insert into public.work_item_events(item_id,actor_id,action,note) values(rid,m.user_id,next_status,note);
  else raise exception 'Unknown operation'; end if;
  update public.station_work_items set updated_at=now() where id=rid;
 end if;
 insert into public.audit_events(workspace_id,actor_id,action,subject_id) values(m.workspace_id,m.user_id,'work_item_'||op,rid);
 return jsonb_build_object('id',rid);
end $$;
create function public.ops_command(op text,p jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.ops_command(op,p)$$;
revoke all on function private.ops_snapshot(uuid),public.ops_snapshot(uuid),private.ops_command(text,jsonb),public.ops_command(text,jsonb) from public,anon;
grant execute on function private.ops_snapshot(uuid),public.ops_snapshot(uuid),private.ops_command(text,jsonb),public.ops_command(text,jsonb) to authenticated;
