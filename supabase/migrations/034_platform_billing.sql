-- TorkeOS's own payment methods (where garages pay their plan), edited by admins. Same shape as garage_payment_methods.
create table public.platform_payment_methods (
  kind text primary key check (kind in ('pago_movil', 'transferencia', 'binance', 'zelle', 'paypal')),
  enabled boolean not null default true,
  discount_percent numeric(5, 2) check (discount_percent > 0 and discount_percent < 100),
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_payment_methods enable row level security;

-- An owner reports the payment of a contract period (proof uploaded); an admin checks it.
--   reported -> waiting for the admin; confirmed -> checked (a contract_payments row is created); rejected -> owner may report again
create table public.contract_payment_reports (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  method_kind text not null check (method_kind in ('pago_movil', 'transferencia', 'binance', 'zelle', 'paypal')),
  reference text check (char_length(reference) <= 120),
  proof_path text not null check (char_length(proof_path) <= 300),
  status text not null default 'reported' check (status in ('reported', 'confirmed', 'rejected')),
  note text check (char_length(note) <= 300),
  reported_by uuid references public.profiles (id) on delete set null,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index contract_payment_reports_one_active_idx on public.contract_payment_reports (contract_id, period_start) where status <> 'rejected';

alter table public.contract_payment_reports enable row level security;

-- Once-per-day (or once-ever) billing notifications to owners: trial ended, payment overdue, access suspended.
create table public.billing_notification_log (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  kind text not null check (kind in ('trial_ended', 'payment_overdue', 'access_suspended')),
  sent_on date not null,
  created_at timestamptz not null default now(),
  unique (garage_id, kind, sent_on)
);

alter table public.billing_notification_log enable row level security;
