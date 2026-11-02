-- Time ranges in which a garage takes no appointments (vacations, holidays, closures).
-- Only the server (service key) reads or writes it: owners/managers through the API, clients via availability.
create table public.garage_unavailability (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (char_length(reason) <= 120),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index garage_unavailability_garage_range_idx on public.garage_unavailability (garage_id, ends_at);

alter table public.garage_unavailability enable row level security;
