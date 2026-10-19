-- Requires 008_add_garage_manager_role.sql to be applied first.

-- ---------------------------------------------------------------------------
-- 1. Encargados de taller (garage_manager)
-- ---------------------------------------------------------------------------

create table public.garage_managers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  garage_id uuid not null references public.garages (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index garage_managers_garage_idx on public.garage_managers (garage_id);

create trigger garage_managers_set_updated_at before update on public.garage_managers
for each row execute function public.set_updated_at();

create or replace function public.validate_manager_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.profile_id and role = 'garage_manager'
  ) then
    raise exception 'A manager record requires a profile with garage_manager role';
  end if;
  return new;
end;
$$;

create trigger garage_managers_validate_profile
before insert or update of profile_id on public.garage_managers
for each row execute function public.validate_manager_profile();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.app_role;
begin
  requested_role := case
    when new.raw_app_meta_data ->> 'role' in ('admin', 'garage_owner', 'garage_manager', 'mechanic', 'client')
      then (new.raw_app_meta_data ->> 'role')::public.app_role
    else 'client'::public.app_role
  end;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    requested_role
  );
  return new;
end;
$$;

create or replace function public.current_garage_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_app_role()
    when 'garage_owner' then (select id from public.garages where owner_id = auth.uid())
    when 'garage_manager' then (select garage_id from public.garage_managers where profile_id = auth.uid() and is_active)
    when 'mechanic' then (select garage_id from public.mechanics where profile_id = auth.uid() and is_active)
    else null
  end;
$$;

alter table public.garage_managers enable row level security;

create policy garage_managers_select on public.garage_managers for select to authenticated using (
  public.current_app_role() = 'admin' or garage_id = public.current_garage_id()
);
create policy garage_managers_insert on public.garage_managers for insert to authenticated with check (
  public.current_app_role() = 'admin' or
  (public.current_app_role() = 'garage_owner' and garage_id = public.current_garage_id())
);
create policy garage_managers_update on public.garage_managers for update to authenticated
using (public.current_app_role() = 'admin' or (public.current_app_role() = 'garage_owner' and garage_id = public.current_garage_id()))
with check (public.current_app_role() = 'admin' or (public.current_app_role() = 'garage_owner' and garage_id = public.current_garage_id()));

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.current_app_role() = 'admin' or
  exists (select 1 from public.garages g where g.owner_id = profiles.id and g.id = public.current_garage_id()) or
  exists (select 1 from public.mechanics m where m.profile_id = profiles.id and m.garage_id = public.current_garage_id()) or
  exists (select 1 from public.garage_managers gm where gm.profile_id = profiles.id and gm.garage_id = public.current_garage_id()) or
  exists (
    select 1 from public.vehicles v join public.orders o on o.vehicle_id = v.id
    where v.user_id = profiles.id and o.garage_id = public.current_garage_id()
  )
);

drop policy mechanics_insert on public.mechanics;
create policy mechanics_insert on public.mechanics for insert to authenticated with check (
  public.current_app_role() = 'admin' or
  (public.current_app_role() in ('garage_owner', 'garage_manager') and garage_id = public.current_garage_id())
);

drop policy mechanics_delete on public.mechanics;
create policy mechanics_delete on public.mechanics for delete to authenticated using (
  public.current_app_role() = 'admin' or
  (public.current_app_role() in ('garage_owner', 'garage_manager') and garage_id = public.current_garage_id())
);

drop policy budgets_insert on public.budgets;
create policy budgets_insert on public.budgets for insert to authenticated with check (
  public.current_app_role() in ('admin', 'garage_owner', 'garage_manager') and
  exists (select 1 from public.orders o where o.id = budgets.order_id and (public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id()))
);

drop policy budgets_update_owner on public.budgets;
create policy budgets_update_owner on public.budgets for update to authenticated
using (
  public.current_app_role() in ('admin', 'garage_owner', 'garage_manager') and
  exists (select 1 from public.orders o where o.id = budgets.order_id and (public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id()))
)
with check (
  public.current_app_role() in ('admin', 'garage_owner', 'garage_manager') and
  exists (select 1 from public.orders o where o.id = budgets.order_id and (public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id()))
);

-- ---------------------------------------------------------------------------
-- 2. Historia clínica: componente, tipo de intervención y marca del repuesto
-- ---------------------------------------------------------------------------

alter table public.diagnostics
  add column component text check (component is null or component ~ '^[a-z0-9_]+$'),
  add column intervention_type text check (
    intervention_type is null or intervention_type in ('reemplazo', 'reparacion', 'limpieza', 'ajuste', 'revision')
  ),
  add column part_brand text check (part_brand is null or char_length(trim(part_brand)) between 1 and 80);

create index diagnostics_component_idx on public.diagnostics (component) where component is not null;

-- ---------------------------------------------------------------------------
-- 3. Formato de ingreso del vehículo
-- ---------------------------------------------------------------------------

create table public.vehicle_intakes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  mileage integer not null check (mileage between 0 and 5000000),
  fuel_level smallint not null check (fuel_level between 0 and 8),
  vin text check (vin is null or char_length(vin) <= 40),
  engine_number text check (engine_number is null or char_length(engine_number) <= 40),
  has_registration boolean not null default false,
  has_insurance boolean not null default false,
  accessories jsonb not null default '[]'::jsonb check (jsonb_typeof(accessories) = 'array'),
  damages jsonb not null default '[]'::jsonb check (jsonb_typeof(damages) = 'array'),
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
  reported_issue text not null check (char_length(trim(reported_issue)) between 3 and 1000),
  observations text check (observations is null or char_length(observations) <= 2000),
  delivered_by_name text not null check (char_length(trim(delivered_by_name)) between 2 and 120),
  customer_signature text check (customer_signature is null or (customer_signature like 'data:image/png;base64,%' and char_length(customer_signature) <= 300000)),
  received_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vehicle_intakes_set_updated_at before update on public.vehicle_intakes
for each row execute function public.set_updated_at();

alter table public.vehicle_intakes enable row level security;

create policy vehicle_intakes_select on public.vehicle_intakes for select to authenticated using (
  exists (select 1 from public.orders o where o.id = vehicle_intakes.order_id and (
    public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id() or
    exists (select 1 from public.vehicles v where v.id = o.vehicle_id and v.user_id = auth.uid())
  ))
);
create policy vehicle_intakes_insert on public.vehicle_intakes for insert to authenticated with check (
  exists (select 1 from public.orders o where o.id = vehicle_intakes.order_id and o.garage_id = public.current_garage_id())
);
create policy vehicle_intakes_update on public.vehicle_intakes for update to authenticated
using (exists (select 1 from public.orders o where o.id = vehicle_intakes.order_id and o.garage_id = public.current_garage_id()))
with check (exists (select 1 from public.orders o where o.id = vehicle_intakes.order_id and o.garage_id = public.current_garage_id()));

-- The vehicle can only be checked in once its intake form exists.
create or replace function public.validate_order_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if public.current_app_role() = 'mechanic' and not (
    (old.status = 'por_ingresar' and new.status = 'ingresado') or
    (old.status = 'ingresado' and new.status = 'diagnosticado')
  ) then
    raise exception 'Mechanics cannot perform this status transition';
  end if;

  if not (
    (old.status = 'por_ingresar' and new.status = 'ingresado') or
    (old.status = 'ingresado' and new.status = 'diagnosticado') or
    (old.status = 'diagnosticado' and new.status = 'presupuestado') or
    (old.status = 'presupuestado' and new.status in ('en_reparacion', 'presupuesto_rechazado')) or
    (old.status = 'presupuesto_rechazado' and new.status in ('diagnosticado', 'presupuestado')) or
    (old.status = 'en_reparacion' and new.status = 'listo_para_entregar') or
    (old.status = 'listo_para_entregar' and new.status = 'entregado')
  ) then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status;
  end if;

  if new.status = 'ingresado' and not exists (
    select 1 from public.vehicle_intakes where order_id = new.id
  ) then
    raise exception 'The vehicle intake form is required before check-in';
  end if;

  if new.status = 'ingresado' and new.received_at is null then
    new.received_at = now();
  elsif new.status = 'entregado' and new.delivered_at is null then
    new.delivered_at = now();
  end if;
  return new;
end;
$$;
