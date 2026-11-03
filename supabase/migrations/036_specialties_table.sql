-- 036: specialties become an admin-managed table (instead of a fixed enum), used by garages,
-- mechanics and the repair catalog. Run after 035.

create table if not exists public.service_specialties (
  key text primary key check (key ~ '^[a-z0-9_]+$' and char_length(key) <= 60),
  label text not null check (char_length(trim(label)) between 2 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.service_specialties enable row level security;
drop policy if exists service_specialties_read on public.service_specialties;
create policy service_specialties_read on public.service_specialties for select using (true);

insert into public.service_specialties (key, label, sort_order) values
  ('tren_delantero_frenos', 'Tren delantero y frenos', 10),
  ('electroauto', 'Electroauto', 20),
  ('mecanica_ligera', 'Mecánica ligera', 30),
  ('motores', 'Motores', 40),
  ('transmisiones', 'Transmisiones', 50),
  ('latoneria_pintura', 'Latonería y pintura', 60),
  ('papel_ahumado', 'Papel ahumado', 70),
  ('car_audio', 'Car audio', 80),
  ('alarmas', 'Alarmas', 90),
  ('general', 'Mecánica general', 1000)
on conflict (key) do nothing;

-- Repair catalog: specialty becomes a reference to the table.
alter table public.repair_catalog alter column specialty type text using specialty::text;
alter table public.repair_catalog drop constraint if exists repair_catalog_specialty_fk;
alter table public.repair_catalog add constraint repair_catalog_specialty_fk foreign key (specialty) references public.service_specialties (key) on update cascade;

-- Mechanics: same.
alter table public.mechanics alter column specialty drop default;
alter table public.mechanics alter column specialty type text using specialty::text;
alter table public.mechanics alter column specialty set default 'general';
alter table public.mechanics drop constraint if exists mechanics_specialty_fk;
alter table public.mechanics add constraint mechanics_specialty_fk foreign key (specialty) references public.service_specialties (key) on update cascade;
