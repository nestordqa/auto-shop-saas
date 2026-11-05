-- 042: Sellers / promoters / influencers. Run after 041.
-- Only the server (service key) reads or writes these tables; sellers reach their own data through
-- API routes that always filter by their seller id.

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 80),
  phone text check (char_length(phone) <= 30),
  instagram text check (char_length(instagram) <= 200),
  -- commission: earns commission_percent of every confirmed plan payment of their garages.
  -- coupon: earns coupon_reward (USD) once per garage that registered with their coupon and paid its first period.
  compensation_type text not null default 'commission' check (compensation_type in ('commission', 'coupon')),
  commission_percent numeric(5, 2) not null default 0 check (commission_percent between 0 and 100),
  coupon_code text unique check (coupon_code is null or coupon_code ~ '^[A-Z0-9-]{3,30}$'),
  coupon_reward numeric(12, 2) not null default 0 check (coupon_reward >= 0),
  is_active boolean not null default true,
  notes text check (char_length(notes) <= 2000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (compensation_type <> 'coupon' or coupon_code is not null)
);

drop trigger if exists sellers_set_updated_at on public.sellers;
create trigger sellers_set_updated_at before update on public.sellers
for each row execute function public.set_updated_at();

alter table public.sellers enable row level security;

-- What TorkeOS has paid each seller (their commissions are computed by the app).
create table if not exists public.seller_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  reference text check (char_length(reference) <= 200),
  note text check (char_length(note) <= 500),
  paid_on date not null default current_date,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists seller_payouts_seller_idx on public.seller_payouts (seller_id);
alter table public.seller_payouts enable row level security;

-- Which seller brought each garage and how it signed up (admin, seller dashboard, or self sign-up).
alter table public.garages add column if not exists seller_id uuid references public.sellers (id) on delete set null;
alter table public.garages add column if not exists signup_source text not null default 'admin' check (signup_source in ('admin', 'seller', 'self'));
alter table public.garages add column if not exists coupon_code text check (char_length(coupon_code) <= 30);
create index if not exists garages_seller_idx on public.garages (seller_id);

-- A prospect belongs to TorkeOS (seller_id null) or to one seller; each side only lists its own.
alter table public.garage_prospects add column if not exists seller_id uuid references public.sellers (id) on delete cascade;
create index if not exists garage_prospects_seller_idx on public.garage_prospects (seller_id);
