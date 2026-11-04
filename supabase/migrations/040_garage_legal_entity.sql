-- 040: A garage can belong to a company: optional legal name (razón social) and RIF. Run after 039.

alter table public.garages add column if not exists legal_name text check (legal_name is null or char_length(trim(legal_name)) between 2 and 160);
alter table public.garages add column if not exists legal_id text check (legal_id is null or char_length(trim(legal_id)) between 4 and 30);
