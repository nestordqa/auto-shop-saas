-- 043: Trusted mechanics who receive vehicles (recepción).
-- A mechanic with can_receive does the intakes of their branch, assigns mechanics to the repair (themselves
-- included) and gets the same appointment / check-in notifications as the garage staff, plus a reminder
-- 30 minutes before each appointment of their branch.
alter table public.mechanics add column if not exists can_receive boolean not null default false;

alter table public.notification_log drop constraint if exists notification_log_kind_check;
alter table public.notification_log add constraint notification_log_kind_check
  check (kind in ('appointment_reminder', 'mechanic_appointment_reminder', 'budget_pending', 'pickup_pending'));
