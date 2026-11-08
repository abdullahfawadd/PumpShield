create index work_items_station_fk on public.station_work_items(station_id);
create unique index indent_delivery_once on public.station_work_items(delivery_id) where kind='indent' and status<>'cancelled';
