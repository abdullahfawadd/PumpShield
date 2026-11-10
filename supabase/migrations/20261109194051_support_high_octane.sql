-- High Octane is a separate station fuel grade. Preserve existing Petrol (MS)
-- and Diesel (HSD) identifiers, recorded quantities and grade-specific prices.
-- No retail rate, thermal coefficient or octane rating is inferred here.
-- Existing commands join on the tank/vehicle grade and snapshot every active
-- grade; retaining those transaction boundaries also retains misfuel checks.

alter table public.tanks
  drop constraint tanks_grade_check,
  add constraint tanks_grade_check check (grade in ('MS', 'HSD', 'HOBC')) not valid;
alter table public.prices
  drop constraint prices_grade_check,
  add constraint prices_grade_check check (grade in ('MS', 'HSD', 'HOBC')) not valid;
alter table public.vehicles
  drop constraint vehicles_grade_check,
  add constraint vehicles_grade_check check (grade in ('MS', 'HSD', 'HOBC')) not valid;
alter table public.station_work_items
  drop constraint station_work_items_grade_check,
  add constraint station_work_items_grade_check check (grade in ('MS', 'HSD', 'HOBC')) not valid;

alter table public.tanks validate constraint tanks_grade_check;
alter table public.prices validate constraint prices_grade_check;
alter table public.vehicles validate constraint vehicles_grade_check;
alter table public.station_work_items validate constraint station_work_items_grade_check;

comment on column public.tanks.grade is
  'Station fuel grade: MS (Petrol), HSD (Diesel), HOBC (High Octane). Marketing names and octane ratings are not inferred.';
comment on column public.prices.grade is
  'Rate and thermal coefficient belong to this exact station fuel grade; owners verify each source independently.';
