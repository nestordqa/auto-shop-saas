-- Sales pipeline: garages we are talking to before they join TorkeOS.
-- Only the server (service key) reads or writes it, from the admin dashboard.
create table public.garage_prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  contact_name text check (char_length(contact_name) <= 120),
  phone text check (char_length(phone) <= 30),
  email text check (char_length(email) <= 200),
  instagram text check (char_length(instagram) <= 200),
  facebook text check (char_length(facebook) <= 200),
  tiktok text check (char_length(tiktok) <= 200),
  website text check (char_length(website) <= 300),
  city text check (char_length(city) <= 120),
  address text check (char_length(address) <= 300),
  map_location text check (char_length(map_location) <= 500),
  specialty text check (char_length(specialty) <= 120),
  source text check (char_length(source) <= 60),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'interested', 'requirements_sent', 'negotiating', 'won', 'lost')),
  lost_reason text check (char_length(lost_reason) <= 300),
  next_follow_up date,
  notes text check (char_length(notes) <= 2000),
  garage_id uuid references public.garages (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index garage_prospects_status_idx on public.garage_prospects (status);

create trigger garage_prospects_set_updated_at before update on public.garage_prospects
for each row execute function public.set_updated_at();

alter table public.garage_prospects enable row level security;
