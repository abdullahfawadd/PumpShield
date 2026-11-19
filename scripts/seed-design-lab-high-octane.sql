-- Add a runnable receiving and credit scenario to the existing synthetic lab.
-- Run explicitly as an administrator. This file is not a production migration.
begin;
do $lab$
declare
  station_row public.stations%rowtype;
  tank_id constant uuid := 'a721e280-a419-47a9-a402-52557441d001';
  account_id constant uuid := 'a721e280-a419-47a9-a402-52557441d003';
  chambers constant jsonb := '[[{"mm":0,"liters":0},{"mm":1000,"liters":3000}],[{"mm":0,"liters":0},{"mm":1000,"liters":3000}]]';
begin
  select s.* into strict station_row
    from public.stations s
    join public.workspaces w on w.id = s.workspace_id
   where w.name = 'PumpShield - Design Lab'
     and s.name = 'Clifton Petroleum - Sample'
     and exists (
       select 1 from public.memberships m join auth.users u on u.id = m.user_id
       where m.workspace_id = w.id and m.role = 'owner'
         and u.email = 'owner.design@pumpshield.example'
     )
     and exists (
       select 1 from public.memberships m join auth.users u on u.id = m.user_id
       where m.workspace_id = w.id and m.role = 'munshi' and m.station_id = s.id
         and u.email = 'munshi.design@pumpshield.example'
     );

  if exists (select 1 from public.shifts s where s.station_id = station_row.id and s.status = 'open') then
    raise exception 'Close the synthetic lab shift before adding equipment';
  end if;

  insert into public.tanks (id, workspace_id, station_id, name, grade, capacity, stock, chart)
  values (tank_id, station_row.workspace_id, station_row.id, 'SAMPLE · High Octane', 'HOBC', 30000, 15000,
          '[{"mm":0,"liters":0},{"mm":1000,"liters":15000},{"mm":2000,"liters":30000}]')
  on conflict (id) do nothing;

  insert into public.nozzles (id, workspace_id, station_id, tank_id, name, totalizer)
  values ('a721e280-a419-47a9-a402-52557441d002', station_row.workspace_id, station_row.id, tank_id, 'SAMPLE · High Octane nozzle', 24000)
  on conflict (id) do nothing;

  insert into public.prices (id, workspace_id, station_id, grade, price, beta, margin, effective_at, source)
  values ('a721e280-a419-47a9-a402-52557441d004', station_row.workspace_id, station_row.id, 'HOBC', 330, 0.00115, 10, now() - interval '1 day', 'SYNTHETIC DESIGN-LAB RATE')
  on conflict (id) do nothing;

  insert into public.accounts (id, workspace_id, station_id, name, credit_limit)
  values (account_id, station_row.workspace_id, station_row.id, 'SAMPLE · Capital Fleet', 250000)
  on conflict (id) do nothing;

  insert into public.vehicles (id, workspace_id, account_id, registration, grade, max_liters)
  values ('a721e280-a419-47a9-a402-52557441d005', station_row.workspace_id, account_id, 'SAMPLE-HOBC-388', 'HOBC', 100)
  on conflict (id) do nothing;

  insert into public.deliveries (id, workspace_id, station_id, tank_id, reference, vehicle, depot, invoice, loading_temp, price, beta, chambers)
  values ('a721e280-a419-47a9-a402-52557441d006', station_row.workspace_id, station_row.id, tank_id,
          'SAMPLE-HOBC-6000', 'SAMPLE-KHI-388', 'Design Lab depot', 6000, 32, 330, 0.00115, chambers)
  on conflict (id) do nothing;
end;
$lab$;
commit;
