begin;

set local lock_timeout = '30s';
select pg_advisory_xact_lock(hashtextextended('auto-shop-saas:003_vehicle_catalog', 0));
lock table public.vehicles in access exclusive mode;

create extension if not exists citext;

create table public.vehicle_brands (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique check (char_length(trim(name::text)) >= 2),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.vehicle_brands (id) on delete cascade,
  name citext not null check (char_length(trim(name::text)) >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, name)
);

create table public.vehicle_model_years (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models (id) on delete cascade,
  year integer not null check (year between 1900 and 2100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (model_id, year)
);

create index vehicle_models_brand_idx on public.vehicle_models (brand_id);
create index vehicle_model_years_model_idx on public.vehicle_model_years (model_id);

create trigger vehicle_brands_set_updated_at before update on public.vehicle_brands
for each row execute function public.set_updated_at();
create trigger vehicle_models_set_updated_at before update on public.vehicle_models
for each row execute function public.set_updated_at();
create trigger vehicle_model_years_set_updated_at before update on public.vehicle_model_years
for each row execute function public.set_updated_at();

insert into public.vehicle_brands (name)
select distinct trim(brand)::citext
from public.vehicles
where nullif(trim(brand), '') is not null
on conflict (name) do nothing;

insert into public.vehicle_models (brand_id, name)
select distinct brands.id, trim(vehicles.model)::citext
from public.vehicles as vehicles
join public.vehicle_brands as brands on brands.name = trim(vehicles.brand)::citext
where nullif(trim(vehicles.model), '') is not null
on conflict (brand_id, name) do nothing;

insert into public.vehicle_model_years (model_id, year)
select distinct models.id, vehicles.year
from public.vehicles as vehicles
join public.vehicle_brands as brands on brands.name = trim(vehicles.brand)::citext
join public.vehicle_models as models
  on models.brand_id = brands.id
  and models.name = trim(vehicles.model)::citext
on conflict (model_id, year) do nothing;

alter table public.vehicles
add column model_year_id uuid references public.vehicle_model_years (id) on delete restrict;

update public.vehicles as vehicles
set model_year_id = model_years.id
from public.vehicle_brands as brands
join public.vehicle_models as models on models.brand_id = brands.id
join public.vehicle_model_years as model_years on model_years.model_id = models.id
where brands.name = trim(vehicles.brand)::citext
  and models.name = trim(vehicles.model)::citext
  and model_years.year = vehicles.year;

do $$
begin
  if exists (select 1 from public.vehicles where model_year_id is null) then
    raise exception 'Vehicle catalog backfill failed: model_year_id cannot be resolved';
  end if;
end;
$$;

alter table public.vehicles alter column model_year_id set not null;
create index vehicles_model_year_idx on public.vehicles (model_year_id);

create or replace function public.sync_vehicle_catalog_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select brands.name::text, models.name::text, model_years.year
  into new.brand, new.model, new.year
  from public.vehicle_model_years as model_years
  join public.vehicle_models as models on models.id = model_years.model_id
  join public.vehicle_brands as brands on brands.id = models.brand_id
  where model_years.id = new.model_year_id
    and model_years.is_active
    and models.is_active
    and brands.is_active;

  if not found then
    raise exception 'The selected brand, model, and year combination is not active';
  end if;

  return new;
end;
$$;

create trigger vehicles_sync_catalog_snapshot
before insert or update of model_year_id on public.vehicles
for each row execute function public.sync_vehicle_catalog_snapshot();

alter table public.vehicle_brands enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicle_model_years enable row level security;

create policy vehicle_brands_select on public.vehicle_brands
for select to authenticated using (true);
create policy vehicle_brands_admin_insert on public.vehicle_brands
for insert to authenticated with check (public.current_app_role() = 'admin');
create policy vehicle_brands_admin_update on public.vehicle_brands
for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');
create policy vehicle_brands_admin_delete on public.vehicle_brands
for delete to authenticated using (public.current_app_role() = 'admin');

create policy vehicle_models_select on public.vehicle_models
for select to authenticated using (true);
create policy vehicle_models_admin_insert on public.vehicle_models
for insert to authenticated with check (public.current_app_role() = 'admin');
create policy vehicle_models_admin_update on public.vehicle_models
for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');
create policy vehicle_models_admin_delete on public.vehicle_models
for delete to authenticated using (public.current_app_role() = 'admin');

create policy vehicle_model_years_select on public.vehicle_model_years
for select to authenticated using (true);
create policy vehicle_model_years_admin_insert on public.vehicle_model_years
for insert to authenticated with check (public.current_app_role() = 'admin');
create policy vehicle_model_years_admin_update on public.vehicle_model_years
for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');
create policy vehicle_model_years_admin_delete on public.vehicle_model_years
for delete to authenticated using (public.current_app_role() = 'admin');

grant select, insert, update, delete on public.vehicle_brands to authenticated;
grant select, insert, update, delete on public.vehicle_models to authenticated;
grant select, insert, update, delete on public.vehicle_model_years to authenticated;

commit;