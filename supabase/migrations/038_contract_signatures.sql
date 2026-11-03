-- 038: contract signatures. Each admin keeps ONE signature (image + name + position); one of them is the
-- default printed on every new contract. Owners sign their contract from the app.
-- Only the server (service key) reads or writes these tables.

create table if not exists public.admin_signatures (
  admin_id uuid primary key references public.profiles (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  position text not null check (char_length(trim(position)) between 2 and 120),
  image text not null check (image like 'data:image/png;base64,%' and char_length(image) <= 300000),
  updated_at timestamptz not null default now()
);
alter table public.admin_signatures enable row level security;

-- Platform-wide settings (e.g. which admin signature is the default).
create table if not exists public.app_settings (
  key text primary key check (char_length(key) <= 60),
  value text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- TorkeOS signer copied onto the contract when it is issued (later changes to signatures do not alter it),
-- and the owner's signature once they sign.
alter table public.contracts
  add column if not exists provider_signer_name text check (provider_signer_name is null or char_length(provider_signer_name) <= 120),
  add column if not exists provider_signer_position text check (provider_signer_position is null or char_length(provider_signer_position) <= 120),
  add column if not exists provider_signature text check (provider_signature is null or (provider_signature like 'data:image/png;base64,%' and char_length(provider_signature) <= 300000)),
  add column if not exists owner_signature text check (owner_signature is null or (owner_signature like 'data:image/png;base64,%' and char_length(owner_signature) <= 300000)),
  add column if not exists owner_signed_name text check (owner_signed_name is null or char_length(owner_signed_name) <= 120),
  add column if not exists signed_at timestamptz,
  add column if not exists signed_ip text check (signed_ip is null or char_length(signed_ip) <= 64);
