-- Prospects in Mérida (we can visit them) vs. outside (everything happens remotely).
alter table public.garage_prospects add column if not exists is_local boolean not null default true;

-- Editable message templates of the admin dashboard (e.g. the prospect pitch).
-- Only the server (service key) reads or writes them; a missing row means "use the built-in text".
create table if not exists public.admin_message_templates (
  key text primary key check (char_length(key) <= 60),
  body text not null check (char_length(body) between 1 and 4000),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_message_templates enable row level security;
