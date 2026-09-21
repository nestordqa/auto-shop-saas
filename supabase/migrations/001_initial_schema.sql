create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'garage_owner', 'mechanic', 'client');
create type public.mechanic_specialty as enum (
  'tren_delantero_frenos',
  'electroauto',
  'mecanica_ligera',
  'motores',
  'transmisiones',
  'general'
);
create type public.order_status as enum (
  'por_ingresar',
  'ingresado',
  'diagnosticado',
  'en_reparacion',
  'presupuesto_rechazado',
  'listo_para_entregar',
  'entregado'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  phone text,
  phone_2 text,
  document_id text,
  role public.app_role not null default 'client',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  address text not null,
  map_location text,
  owner_id uuid not null unique references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mechanics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  garage_id uuid not null references public.garages (id) on delete cascade,
  specialty public.mechanic_specialty not null default 'general',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  brand text not null,
  model text not null,
  year integer not null check (year between 1900 and 2100),
  color text not null,
  plate text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plate)
);

create unique index vehicles_plate_normalized_idx on public.vehicles (upper(plate));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete restrict,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  mechanic_id uuid references public.mechanics (id) on delete set null,
  status public.order_status not null default 'por_ingresar',
  appointment_date timestamptz not null,
  received_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  description text not null check (char_length(trim(description)) >= 3),
  price numeric(12, 2) check (price is null or price >= 0),
  is_completed boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  includes_parts boolean not null default false,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  approved boolean,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_garage_status_idx on public.orders (garage_id, status);
create index orders_vehicle_idx on public.orders (vehicle_id);
create index orders_mechanic_idx on public.orders (mechanic_id);
create index diagnostics_order_idx on public.diagnostics (order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger garages_set_updated_at before update on public.garages
for each row execute function public.set_updated_at();
create trigger mechanics_set_updated_at before update on public.mechanics
for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger diagnostics_set_updated_at before update on public.diagnostics
for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets
for each row execute function public.set_updated_at();

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
    when new.raw_app_meta_data ->> 'role' in ('admin', 'garage_owner', 'mechanic', 'client')
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
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
    when 'mechanic' then (select garage_id from public.mechanics where profile_id = auth.uid() and is_active)
    else null
  end;
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and coalesce(public.current_app_role() = 'admin', false) is false
    and current_user not in ('postgres', 'service_role', 'supabase_auth_admin') then
    raise exception 'Only an admin service may change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.validate_mechanic_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.profile_id and role = 'mechanic'
  ) then
    raise exception 'A mechanic record requires a profile with mechanic role';
  end if;
  return new;
end;
$$;

create trigger mechanics_validate_profile
before insert or update of profile_id on public.mechanics
for each row execute function public.validate_mechanic_profile();

create or replace function public.validate_tenant_relations()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.mechanic_id is not null and not exists (
    select 1 from public.mechanics
    where id = new.mechanic_id and garage_id = new.garage_id and is_active
  ) then
    raise exception 'The mechanic must be active and belong to the order garage';
  end if;
  return new;
end;
$$;

create trigger orders_validate_tenant
before insert or update of garage_id, mechanic_id on public.orders
for each row execute function public.validate_tenant_relations();

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
    (old.status = 'diagnosticado' and new.status in ('en_reparacion', 'presupuesto_rechazado')) or
    (old.status = 'presupuesto_rechazado' and new.status = 'diagnosticado') or
    (old.status = 'en_reparacion' and new.status = 'listo_para_entregar') or
    (old.status = 'listo_para_entregar' and new.status = 'entregado')
  ) then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status;
  end if;

  if new.status = 'ingresado' and new.received_at is null then
    new.received_at = now();
  elsif new.status = 'entregado' and new.delivered_at is null then
    new.delivered_at = now();
  end if;
  return new;
end;
$$;

create trigger orders_validate_status
before update of status on public.orders
for each row execute function public.validate_order_transition();

create or replace function public.recalculate_budget_total(target_order_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.budgets
  set total_amount = (
    select coalesce(sum(d.price), 0)
    from public.diagnostics d
    where d.order_id = target_order_id
  )
  where order_id = target_order_id;
$$;

create or replace function public.sync_budget_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recalculate_budget_total(coalesce(new.order_id, old.order_id));
  if tg_op = 'UPDATE' and new.order_id is distinct from old.order_id then
    perform public.recalculate_budget_total(old.order_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger diagnostics_sync_budget
after insert or update of price, order_id or delete on public.diagnostics
for each row execute function public.sync_budget_total();

create or replace function public.protect_diagnostic_price()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.price is distinct from old.price and public.current_app_role() = 'mechanic' then
    raise exception 'Only a garage owner or admin may set diagnostic prices';
  end if;
  return new;
end;
$$;

create trigger diagnostics_protect_price
before update of price on public.diagnostics
for each row execute function public.protect_diagnostic_price();

create or replace function public.initialize_budget_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(sum(price), 0) into new.total_amount
  from public.diagnostics where order_id = new.order_id;
  return new;
end;
$$;

create trigger budgets_initialize_total
before insert on public.budgets
for each row execute function public.initialize_budget_total();

create or replace function public.protect_budget_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.total_amount is distinct from old.total_amount
    and current_user not in ('postgres', 'service_role') then
    raise exception 'Budget total is calculated automatically';
  end if;

  if public.current_app_role() = 'client' and (
    new.order_id is distinct from old.order_id or
    new.includes_parts is distinct from old.includes_parts or
    new.total_amount is distinct from old.total_amount
  ) then
    raise exception 'Clients may only approve or reject their budget';
  end if;
  return new;
end;
$$;

create trigger budgets_protect_fields
before update on public.budgets
for each row execute function public.protect_budget_fields();

create or replace function public.apply_budget_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.approved is distinct from old.approved and new.approved is not null then
    new.decided_at = now();
    update public.orders
    set status = case when new.approved then 'en_reparacion'::public.order_status else 'presupuesto_rechazado'::public.order_status end
    where id = new.order_id and status = 'diagnosticado';

    if not found then
      raise exception 'Budget decisions require an order in diagnosticado status';
    end if;
  end if;
  return new;
end;
$$;

create trigger budgets_apply_decision
before update of approved on public.budgets
for each row execute function public.apply_budget_decision();

alter table public.profiles enable row level security;
alter table public.garages enable row level security;
alter table public.mechanics enable row level security;
alter table public.vehicles enable row level security;
alter table public.orders enable row level security;
alter table public.diagnostics enable row level security;
alter table public.budgets enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.current_app_role() = 'admin' or
  exists (select 1 from public.garages g where g.owner_id = auth.uid() and g.owner_id = profiles.id) or
  exists (select 1 from public.mechanics m where m.profile_id = profiles.id and m.garage_id = public.current_garage_id()) or
  exists (
    select 1 from public.vehicles v join public.orders o on o.vehicle_id = v.id
    where v.user_id = profiles.id and o.garage_id = public.current_garage_id()
  )
);
create policy profiles_update on public.profiles for update to authenticated
using (id = auth.uid() or public.current_app_role() = 'admin')
with check (id = auth.uid() or public.current_app_role() = 'admin');

create policy garages_select on public.garages for select to authenticated using (
  public.current_app_role() = 'admin' or id = public.current_garage_id() or
  exists (select 1 from public.orders o join public.vehicles v on v.id = o.vehicle_id where o.garage_id = garages.id and v.user_id = auth.uid())
);
create policy garages_insert on public.garages for insert to authenticated
with check (public.current_app_role() = 'admin');
create policy garages_update on public.garages for update to authenticated
using (public.current_app_role() = 'admin' or owner_id = auth.uid())
with check (public.current_app_role() = 'admin' or owner_id = auth.uid());

create policy mechanics_select on public.mechanics for select to authenticated using (
  public.current_app_role() = 'admin' or garage_id = public.current_garage_id()
);
create policy mechanics_insert on public.mechanics for insert to authenticated with check (
  public.current_app_role() = 'admin' or
  (public.current_app_role() = 'garage_owner' and garage_id = public.current_garage_id())
);
create policy mechanics_update on public.mechanics for update to authenticated
using (public.current_app_role() = 'admin' or garage_id = public.current_garage_id())
with check (public.current_app_role() = 'admin' or garage_id = public.current_garage_id());
create policy mechanics_delete on public.mechanics for delete to authenticated using (
  public.current_app_role() = 'admin' or
  (public.current_app_role() = 'garage_owner' and garage_id = public.current_garage_id())
);

create policy vehicles_select on public.vehicles for select to authenticated using (
  user_id = auth.uid() or public.current_app_role() = 'admin' or
  exists (select 1 from public.orders o where o.vehicle_id = vehicles.id and o.garage_id = public.current_garage_id())
);
create policy vehicles_insert on public.vehicles for insert to authenticated
with check (user_id = auth.uid() and public.current_app_role() = 'client');
create policy vehicles_update on public.vehicles for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy vehicles_delete on public.vehicles for delete to authenticated using (
  user_id = auth.uid() and not exists (select 1 from public.orders o where o.vehicle_id = vehicles.id)
);

create policy orders_select on public.orders for select to authenticated using (
  public.current_app_role() = 'admin' or garage_id = public.current_garage_id() or
  exists (select 1 from public.vehicles v where v.id = orders.vehicle_id and v.user_id = auth.uid())
);
create policy orders_insert on public.orders for insert to authenticated with check (
  public.current_app_role() = 'admin' or garage_id = public.current_garage_id() or
  (status = 'por_ingresar' and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()))
);
create policy orders_update_staff on public.orders for update to authenticated
using (public.current_app_role() = 'admin' or garage_id = public.current_garage_id())
with check (public.current_app_role() = 'admin' or garage_id = public.current_garage_id());

create policy diagnostics_select on public.diagnostics for select to authenticated using (
  exists (select 1 from public.orders o where o.id = diagnostics.order_id and (
    public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id() or
    exists (select 1 from public.vehicles v where v.id = o.vehicle_id and v.user_id = auth.uid())
  ))
);
create policy diagnostics_insert on public.diagnostics for insert to authenticated with check (
  exists (select 1 from public.orders o where o.id = diagnostics.order_id and o.garage_id = public.current_garage_id())
);
create policy diagnostics_update on public.diagnostics for update to authenticated
using (exists (select 1 from public.orders o where o.id = diagnostics.order_id and o.garage_id = public.current_garage_id()))
with check (exists (select 1 from public.orders o where o.id = diagnostics.order_id and o.garage_id = public.current_garage_id()));
create policy diagnostics_delete on public.diagnostics for delete to authenticated using (
  exists (select 1 from public.orders o where o.id = diagnostics.order_id and o.garage_id = public.current_garage_id())
);

create policy budgets_select on public.budgets for select to authenticated using (
  exists (select 1 from public.orders o where o.id = budgets.order_id and (
    public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id() or
    exists (select 1 from public.vehicles v where v.id = o.vehicle_id and v.user_id = auth.uid())
  ))
);
create policy budgets_insert on public.budgets for insert to authenticated with check (
  public.current_app_role() in ('admin', 'garage_owner') and
  exists (select 1 from public.orders o where o.id = budgets.order_id and (public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id()))
);
create policy budgets_update_owner on public.budgets for update to authenticated
using (
  public.current_app_role() in ('admin', 'garage_owner') and
  exists (select 1 from public.orders o where o.id = budgets.order_id and (public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id()))
)
with check (
  public.current_app_role() in ('admin', 'garage_owner') and
  exists (select 1 from public.orders o where o.id = budgets.order_id and (public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id()))
);
create policy budgets_update_client_decision on public.budgets for update to authenticated
using (exists (
  select 1 from public.orders o join public.vehicles v on v.id = o.vehicle_id
  where o.id = budgets.order_id and v.user_id = auth.uid()
))
with check (exists (
  select 1 from public.orders o join public.vehicles v on v.id = o.vehicle_id
  where o.id = budgets.order_id and v.user_id = auth.uid()
));

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_garage_id() to authenticated;

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.diagnostics;
alter publication supabase_realtime add table public.budgets;