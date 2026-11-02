-- Opening hours per branch: 7 entries, Sunday (0) to Saturday (6); each is {"open":"HH:MM","close":"HH:MM"}
-- in garage time, or null when the branch is closed that day. Appointments are offered every 30 minutes
-- from `open` until before `close`. Default: every day 8:00 AM - 6:00 PM, like the previous fixed agenda.
alter table public.garage_branches add column if not exists schedule jsonb not null default
  '[{"open":"08:00","close":"18:00"},{"open":"08:00","close":"18:00"},{"open":"08:00","close":"18:00"},{"open":"08:00","close":"18:00"},{"open":"08:00","close":"18:00"},{"open":"08:00","close":"18:00"},{"open":"08:00","close":"18:00"}]'::jsonb;

alter table public.garage_branches add constraint garage_branches_schedule_check
  check (jsonb_typeof(schedule) = 'array' and jsonb_array_length(schedule) = 7);
