-- Specialty shown to clients when choosing a garage.
alter table public.garages add column if not exists specialty text check (char_length(specialty) <= 120);
