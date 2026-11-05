-- 044: Locations. Country (only Venezuela for now, fixed), state and city for garages and profiles (clients).
-- Clients see the garages of their city first, then their state, then a custom search; garages search clients
-- of their own state. A city that is not listed ("Otra ciudad…") is added by the app with is_verified = false.
-- Run after 043.

create table if not exists public.countries (
  code char(2) primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.states (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  name text not null check (char_length(trim(name)) between 2 and 80),
  created_at timestamptz not null default now(),
  unique (country_code, name)
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.states(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  -- Accent / case insensitive key, so "Merida" and "Mérida" are the same city.
  name_key text generated always as (lower(translate(name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))) stored,
  is_verified boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (state_id, name_key)
);

alter table public.countries enable row level security;
alter table public.states enable row level security;
alter table public.cities enable row level security;
drop policy if exists countries_read on public.countries;
create policy countries_read on public.countries for select using (true);
drop policy if exists states_read on public.states;
create policy states_read on public.states for select using (true);
drop policy if exists cities_read on public.cities;
create policy cities_read on public.cities for select using (true);

insert into public.countries (code, name) values ('VE', 'Venezuela') on conflict (code) do nothing;

insert into public.states (country_code, name) values
  ('VE', 'Amazonas'), ('VE', 'Anzoátegui'), ('VE', 'Apure'), ('VE', 'Aragua'), ('VE', 'Barinas'), ('VE', 'Bolívar'),
  ('VE', 'Carabobo'), ('VE', 'Cojedes'), ('VE', 'Delta Amacuro'), ('VE', 'Distrito Capital'), ('VE', 'Falcón'),
  ('VE', 'Guárico'), ('VE', 'La Guaira'), ('VE', 'Lara'), ('VE', 'Mérida'), ('VE', 'Miranda'), ('VE', 'Monagas'),
  ('VE', 'Nueva Esparta'), ('VE', 'Portuguesa'), ('VE', 'Sucre'), ('VE', 'Táchira'), ('VE', 'Trujillo'),
  ('VE', 'Yaracuy'), ('VE', 'Zulia')
on conflict (country_code, name) do nothing;

insert into public.cities (state_id, name)
select s.id, c.city
from (values
  ('Amazonas', 'Puerto Ayacucho'),
  ('Anzoátegui', 'Barcelona'), ('Anzoátegui', 'Puerto La Cruz'), ('Anzoátegui', 'Lechería'), ('Anzoátegui', 'El Tigre'), ('Anzoátegui', 'Anaco'), ('Anzoátegui', 'Cantaura'), ('Anzoátegui', 'Guanta'), ('Anzoátegui', 'Puerto Píritu'),
  ('Apure', 'San Fernando de Apure'), ('Apure', 'Guasdualito'), ('Apure', 'Achaguas'), ('Apure', 'Biruaca'),
  ('Aragua', 'Maracay'), ('Aragua', 'Turmero'), ('Aragua', 'La Victoria'), ('Aragua', 'Cagua'), ('Aragua', 'Villa de Cura'), ('Aragua', 'El Limón'), ('Aragua', 'Palo Negro'), ('Aragua', 'Santa Rita'), ('Aragua', 'San Mateo'), ('Aragua', 'Las Tejerías'),
  ('Barinas', 'Barinas'), ('Barinas', 'Socopó'), ('Barinas', 'Santa Bárbara de Barinas'), ('Barinas', 'Barinitas'), ('Barinas', 'Sabaneta'),
  ('Bolívar', 'Ciudad Bolívar'), ('Bolívar', 'Puerto Ordaz'), ('Bolívar', 'San Félix'), ('Bolívar', 'Upata'), ('Bolívar', 'Caicara del Orinoco'), ('Bolívar', 'Guasipati'), ('Bolívar', 'El Callao'), ('Bolívar', 'Tumeremo'), ('Bolívar', 'Santa Elena de Uairén'),
  ('Carabobo', 'Valencia'), ('Carabobo', 'Naguanagua'), ('Carabobo', 'San Diego'), ('Carabobo', 'Los Guayos'), ('Carabobo', 'Guacara'), ('Carabobo', 'Puerto Cabello'), ('Carabobo', 'Tocuyito'), ('Carabobo', 'Mariara'), ('Carabobo', 'Güigüe'), ('Carabobo', 'Morón'), ('Carabobo', 'Bejuma'), ('Carabobo', 'San Joaquín'),
  ('Cojedes', 'San Carlos'), ('Cojedes', 'Tinaquillo'), ('Cojedes', 'Tinaco'), ('Cojedes', 'El Pao'),
  ('Delta Amacuro', 'Tucupita'),
  ('Distrito Capital', 'Caracas'),
  ('Falcón', 'Coro'), ('Falcón', 'Punto Fijo'), ('Falcón', 'Tucacas'), ('Falcón', 'Chichiriviche'), ('Falcón', 'Dabajuro'), ('Falcón', 'Churuguara'), ('Falcón', 'Puerto Cumarebo'),
  ('Guárico', 'San Juan de los Morros'), ('Guárico', 'Calabozo'), ('Guárico', 'Valle de la Pascua'), ('Guárico', 'Zaraza'), ('Guárico', 'Altagracia de Orituco'), ('Guárico', 'Tucupido'),
  ('La Guaira', 'La Guaira'), ('La Guaira', 'Maiquetía'), ('La Guaira', 'Catia La Mar'), ('La Guaira', 'Macuto'), ('La Guaira', 'Caraballeda'), ('La Guaira', 'Naiguatá'),
  ('Lara', 'Barquisimeto'), ('Lara', 'Cabudare'), ('Lara', 'Carora'), ('Lara', 'El Tocuyo'), ('Lara', 'Quíbor'), ('Lara', 'Duaca'), ('Lara', 'Siquisique'), ('Lara', 'Sanare'),
  ('Mérida', 'Mérida'), ('Mérida', 'El Vigía'), ('Mérida', 'Ejido'), ('Mérida', 'Tovar'), ('Mérida', 'Lagunillas'), ('Mérida', 'Mucuchíes'), ('Mérida', 'Santa Cruz de Mora'), ('Mérida', 'Timotes'),
  ('Miranda', 'Los Teques'), ('Miranda', 'Petare'), ('Miranda', 'Baruta'), ('Miranda', 'Chacao'), ('Miranda', 'El Hatillo'), ('Miranda', 'Guarenas'), ('Miranda', 'Guatire'), ('Miranda', 'Charallave'), ('Miranda', 'Cúa'), ('Miranda', 'Ocumare del Tuy'), ('Miranda', 'Santa Teresa del Tuy'), ('Miranda', 'San Antonio de los Altos'), ('Miranda', 'Carrizal'), ('Miranda', 'Higuerote'), ('Miranda', 'Río Chico'),
  ('Monagas', 'Maturín'), ('Monagas', 'Punta de Mata'), ('Monagas', 'Caripito'), ('Monagas', 'Temblador'), ('Monagas', 'Caicara de Maturín'),
  ('Nueva Esparta', 'Porlamar'), ('Nueva Esparta', 'Pampatar'), ('Nueva Esparta', 'La Asunción'), ('Nueva Esparta', 'Juan Griego'), ('Nueva Esparta', 'El Valle del Espíritu Santo'), ('Nueva Esparta', 'Santa Ana'),
  ('Portuguesa', 'Guanare'), ('Portuguesa', 'Acarigua'), ('Portuguesa', 'Araure'), ('Portuguesa', 'Turén'), ('Portuguesa', 'Guanarito'), ('Portuguesa', 'Ospino'), ('Portuguesa', 'Biscucuy'),
  ('Sucre', 'Cumaná'), ('Sucre', 'Carúpano'), ('Sucre', 'Güiria'), ('Sucre', 'Cumanacoa'), ('Sucre', 'Araya'), ('Sucre', 'Río Caribe'),
  ('Táchira', 'San Cristóbal'), ('Táchira', 'Táriba'), ('Táchira', 'Palmira'), ('Táchira', 'Rubio'), ('Táchira', 'San Antonio del Táchira'), ('Táchira', 'Ureña'), ('Táchira', 'La Fría'), ('Táchira', 'Capacho'), ('Táchira', 'Colón'), ('Táchira', 'La Grita'),
  ('Trujillo', 'Valera'), ('Trujillo', 'Trujillo'), ('Trujillo', 'Boconó'), ('Trujillo', 'Carvajal'), ('Trujillo', 'Sabana de Mendoza'), ('Trujillo', 'Pampán'), ('Trujillo', 'Escuque'),
  ('Yaracuy', 'San Felipe'), ('Yaracuy', 'Yaritagua'), ('Yaracuy', 'Chivacoa'), ('Yaracuy', 'Nirgua'), ('Yaracuy', 'Aroa'), ('Yaracuy', 'Cocorote'), ('Yaracuy', 'Independencia'),
  ('Zulia', 'Maracaibo'), ('Zulia', 'San Francisco'), ('Zulia', 'Cabimas'), ('Zulia', 'Ciudad Ojeda'), ('Zulia', 'Santa Rita'), ('Zulia', 'Los Puertos de Altagracia'), ('Zulia', 'La Concepción'), ('Zulia', 'Villa del Rosario'), ('Zulia', 'Machiques'), ('Zulia', 'Santa Bárbara del Zulia'), ('Zulia', 'San Carlos del Zulia'), ('Zulia', 'Bachaquero'), ('Zulia', 'Mene Grande')
) as c(state, city)
join public.states s on s.country_code = 'VE' and s.name = c.state
on conflict (state_id, name_key) do nothing;

-- Garages and profiles (clients) get their location. Country is always Venezuela for now.
alter table public.garages add column if not exists country_code char(2) not null default 'VE' references public.countries(code);
alter table public.garages add column if not exists state_id uuid references public.states(id);
alter table public.garages add column if not exists city_id uuid references public.cities(id);
alter table public.profiles add column if not exists country_code char(2) not null default 'VE' references public.countries(code);
alter table public.profiles add column if not exists state_id uuid references public.states(id);
alter table public.profiles add column if not exists city_id uuid references public.cities(id);
create index if not exists garages_state_city_idx on public.garages (state_id, city_id);
create index if not exists profiles_state_idx on public.profiles (state_id) where role = 'client';

-- Best effort for existing garages: the longest city name found in their address. Owners can fix it in Configuración.
update public.garages g
set city_id = m.city_id, state_id = m.state_id
from (
  select distinct on (g2.id) g2.id as garage_id, c.id as city_id, c.state_id
  from public.garages g2
  join public.cities c on lower(translate(g2.address, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) like '%' || c.name_key || '%'
  where g2.city_id is null
  order by g2.id, char_length(c.name_key) desc
) m
where g.id = m.garage_id;
