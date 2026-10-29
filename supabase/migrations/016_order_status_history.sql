-- Every status an order goes through, with its timestamp, so the client can follow the order timeline.
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  changed_at timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, changed_at);

create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$;

create trigger orders_log_status
after insert or update of status on public.orders
for each row execute function public.log_order_status();

-- Backfill existing orders with the timestamps we already know.
insert into public.order_status_history (order_id, status, changed_at)
select id, 'por_ingresar'::public.order_status, created_at from public.orders
union all
select id, 'ingresado'::public.order_status, received_at from public.orders where received_at is not null
union all
select id, status, updated_at from public.orders where status not in ('por_ingresar', 'ingresado', 'entregado')
union all
select id, 'entregado'::public.order_status, coalesce(delivered_at, updated_at) from public.orders where status = 'entregado';

alter table public.order_status_history enable row level security;

create policy order_status_history_select on public.order_status_history for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_status_history.order_id and (
    public.current_app_role() = 'admin' or o.garage_id = public.current_garage_id() or
    exists (select 1 from public.vehicles v where v.id = o.vehicle_id and v.user_id = auth.uid())
  ))
);

grant select on public.order_status_history to authenticated;
