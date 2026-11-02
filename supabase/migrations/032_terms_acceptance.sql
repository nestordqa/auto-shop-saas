-- Acceptance of the Terms and Conditions. Every user (also accounts created by an admin or a garage)
-- must accept them; a new terms version asks again. Written only by the server (service key).
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists terms_version text check (char_length(terms_version) <= 20);
