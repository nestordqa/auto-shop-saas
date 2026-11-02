-- Mass notifications sent by admins (push). Only the server (service key) reads or writes it.
create table public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 300),
  url text not null default '/dashboard',
  audience text not null check (audience in ('owners', 'admins', 'clients', 'all', 'selected')),
  recipient_count integer not null default 0,
  delivered_count integer not null default 0,
  sent_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.admin_broadcasts enable row level security;

-- Same rules as normalizePhone in src/lib/phone.ts: every phone as E.164 (+584121385416).
create or replace function public.normalize_phone(value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  digits text;
  international boolean;
begin
  if value is null or btrim(value) = '' then return value; end if;
  digits := regexp_replace(value, '\D', '', 'g');
  international := btrim(value) like '+%' or digits like '00%';
  digits := regexp_replace(digits, '^00', '');
  if digits = '' then return value; end if;
  if digits like '58%' and length(digits) = 12 then return '+' || digits; end if;
  if digits like '580%' and length(digits) = 13 then return '+58' || substr(digits, 4); end if;
  if international then return '+' || digits; end if;
  return '+58' || regexp_replace(digits, '^0+', '');
end;
$$;

-- Normalize the phones already stored.
update public.profiles set phone = public.normalize_phone(phone)
where phone is not null and phone is distinct from public.normalize_phone(phone);

update public.profiles set phone_2 = public.normalize_phone(phone_2)
where phone_2 is not null and phone_2 is distinct from public.normalize_phone(phone_2);
