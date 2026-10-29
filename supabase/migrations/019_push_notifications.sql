-- Web Push: one row per browser/device. Only the server (service key) reads or writes these tables,
-- so RLS is enabled without policies: no client can list or alter anyone's subscriptions.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

-- Scheduled reminders already sent, so a reminder goes out at most once per order, kind and day.
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('appointment_reminder', 'budget_pending', 'pickup_pending')),
  sent_on date not null,
  created_at timestamptz not null default now(),
  unique (order_id, kind, sent_on)
);

alter table public.notification_log enable row level security;
