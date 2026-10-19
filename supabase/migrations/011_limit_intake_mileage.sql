-- Mileage is at most 7 digits (9,999,999 km).
alter table public.vehicle_intakes drop constraint if exists vehicle_intakes_mileage_check;
alter table public.vehicle_intakes add constraint vehicle_intakes_mileage_check check (mileage between 0 and 9999999);
