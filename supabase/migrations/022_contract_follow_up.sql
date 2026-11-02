-- Follow-up of an expired trial: the admin contacts the owner and records whether they continue.
alter table public.contracts
  add column follow_up text check (follow_up in ('contacted', 'interested', 'declined')),
  add column follow_up_at timestamptz;
