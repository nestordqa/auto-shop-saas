-- Contracts between TorkeOS and each garage: a free 30-day trial, then a paid contract whose
-- fee is a commission over the budgets the garage's customers accept, billed weekly, biweekly or monthly.
-- Pending/overdue amounts are computed by the app from the contract periods; only payments are stored.

create type public.contract_kind as enum ('trial', 'paid');
create type public.contract_billing_cycle as enum ('weekly', 'biweekly', 'monthly');
create type public.contract_status as enum ('active', 'ended', 'cancelled');

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  number integer generated always as identity unique,
  garage_id uuid not null references public.garages (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  kind public.contract_kind not null,
  billing_cycle public.contract_billing_cycle,
  commission_percent numeric(5, 2) not null check (commission_percent between 0 and 100),
  start_date date not null,
  end_date date,
  status public.contract_status not null default 'active',
  notes text check (char_length(notes) <= 2000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (
    (kind = 'trial' and billing_cycle is null and end_date is not null)
    or (kind = 'paid' and billing_cycle is not null)
  )
);

-- A garage has at most one contract in force.
create unique index contracts_one_active_per_garage on public.contracts (garage_id) where status = 'active';
create index contracts_owner_id_idx on public.contracts (owner_id);

create table public.contract_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  base_amount numeric(12, 2) not null check (base_amount >= 0),
  amount numeric(12, 2) not null check (amount >= 0),
  reference text check (char_length(reference) <= 200),
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id) on delete set null,
  unique (contract_id, period_start)
);

alter table public.contracts enable row level security;
alter table public.contract_payments enable row level security;

create policy "Admins manage contracts" on public.contracts
for all using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "Owners read their contracts" on public.contracts
for select using (owner_id = auth.uid());

create policy "Admins manage contract payments" on public.contract_payments
for all using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "Owners read their contract payments" on public.contract_payments
for select using (exists (select 1 from public.contracts c where c.id = contract_id and c.owner_id = auth.uid()));
