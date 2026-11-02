-- Branches (sucursales): every garage has at least one, its main branch.
-- Orders, appointments, managers and mechanics belong to a branch; a garage with a single
-- branch keeps working exactly as before because everything defaults to the main one.
create table public.garage_branches (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  address text not null check (char_length(trim(address)) between 5 and 300),
  map_location text check (char_length(map_location) <= 500),
  phone text check (char_length(phone) <= 30),
  is_main boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garage_id, slug),
  -- Lets child tables check that a branch belongs to their garage.
  unique (id, garage_id)
);

create unique index garage_branches_one_main_idx on public.garage_branches (garage_id) where is_main;

create trigger garage_branches_set_updated_at before update on public.garage_branches
for each row execute function public.set_updated_at();

-- The main branch can be edited but never deactivated.
alter table public.garage_branches add constraint garage_branches_main_active_check check (not is_main or is_active);

alter table public.garage_branches enable row level security;
-- Branch name and address are public, like the garage itself (booking page).
create policy garage_branches_select on public.garage_branches for select to anon, authenticated using (true);

-- Main branch for every existing garage, copied from the garage.
insert into public.garage_branches (garage_id, name, slug, address, map_location, is_main)
select id, 'Principal', 'principal', address, map_location, true from public.garages
on conflict do nothing;

-- New garages get their main branch automatically.
create or replace function public.create_main_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.garage_branches (garage_id, name, slug, address, map_location, is_main)
  values (new.id, 'Principal', 'principal', new.address, new.map_location, true);
  return new;
end;
$$;

create trigger garages_create_main_branch after insert on public.garages
for each row execute function public.create_main_branch();

-- Fills branch_id with the main branch when a row arrives without one (old code paths).
create or replace function public.default_main_branch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.branch_id is null then
    select id into new.branch_id from public.garage_branches where garage_id = new.garage_id and is_main;
  end if;
  return new;
end;
$$;

-- Orders: branch is required; the composite FK guarantees it belongs to the order's garage.
-- FKs are NO ACTION (checked at statement end) so deleting a whole garage still cascades cleanly.
alter table public.orders add column branch_id uuid;
update public.orders o set branch_id = b.id from public.garage_branches b where b.garage_id = o.garage_id and b.is_main;
alter table public.orders alter column branch_id set not null;
alter table public.orders add constraint orders_branch_fk foreign key (branch_id, garage_id) references public.garage_branches (id, garage_id);
create trigger orders_default_branch before insert on public.orders for each row execute function public.default_main_branch();
create index orders_branch_idx on public.orders (branch_id, appointment_date);

-- One appointment per time slot now applies per branch.
drop index if exists public.orders_garage_appointment_unique_idx;
create unique index orders_branch_appointment_unique_idx on public.orders (branch_id, appointment_date);

-- Managers belong to exactly one branch.
alter table public.garage_managers add column branch_id uuid;
update public.garage_managers m set branch_id = b.id from public.garage_branches b where b.garage_id = m.garage_id and b.is_main;
alter table public.garage_managers alter column branch_id set not null;
alter table public.garage_managers add constraint garage_managers_branch_fk foreign key (branch_id, garage_id) references public.garage_branches (id, garage_id);
create trigger garage_managers_default_branch before insert on public.garage_managers for each row execute function public.default_main_branch();

-- Mechanics work at one branch; the owner can move them.
alter table public.mechanics add column branch_id uuid;
update public.mechanics m set branch_id = b.id from public.garage_branches b where b.garage_id = m.garage_id and b.is_main;
alter table public.mechanics alter column branch_id set not null;
alter table public.mechanics add constraint mechanics_branch_fk foreign key (branch_id, garage_id) references public.garage_branches (id, garage_id);
create trigger mechanics_default_branch before insert on public.mechanics for each row execute function public.default_main_branch();

-- Unavailability: null branch = the whole garage, otherwise only that branch.
alter table public.garage_unavailability add column branch_id uuid;
alter table public.garage_unavailability add constraint garage_unavailability_branch_fk foreign key (branch_id, garage_id) references public.garage_branches (id, garage_id) on delete cascade;
