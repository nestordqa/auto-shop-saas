-- Payment methods the owner offers to clients, one row per kind and garage.
-- `details` holds the data the client needs to pay (phone, e-mail, bank accounts...), see src/lib/payments.ts.
create table public.garage_payment_methods (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  kind text not null check (kind in ('pago_movil', 'transferencia', 'binance', 'zelle', 'paypal')),
  enabled boolean not null default true,
  discount_percent numeric(5, 2) check (discount_percent > 0 and discount_percent < 100),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garage_id, kind)
);

create trigger garage_payment_methods_set_updated_at before update on public.garage_payment_methods
for each row execute function public.set_updated_at();

alter table public.garage_payment_methods enable row level security;

-- A client's payment of an approved budget.
--   reported      -> client paid online and uploaded the proof; the owner confirms or rejects it
--   confirmed     -> owner verified the online payment
--   rejected      -> owner could not verify it; the client may report again
--   pay_at_garage -> client will pay in person
--   received      -> owner received the in-person payment
create table public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null check (status in ('reported', 'confirmed', 'rejected', 'pay_at_garage', 'received')),
  method_kind text check (method_kind in ('pago_movil', 'transferencia', 'binance', 'zelle', 'paypal')),
  discount_percent numeric(5, 2),
  base_amount numeric(12, 2) not null check (base_amount >= 0),
  amount numeric(12, 2) not null check (amount >= 0),
  reference text check (char_length(reference) <= 120),
  proof_path text check (char_length(proof_path) <= 300),
  note text check (char_length(note) <= 300),
  reported_by uuid references public.profiles (id) on delete set null,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (status in ('pay_at_garage', 'received') or method_kind is not null)
);

-- Only one live payment per order; rejected ones stay as history.
create unique index order_payments_one_active_idx on public.order_payments (order_id) where status <> 'rejected';
create index order_payments_order_idx on public.order_payments (order_id, created_at desc);

alter table public.order_payments enable row level security;

-- Private bucket for payment proofs (images or PDF), used only through signed URLs from the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
