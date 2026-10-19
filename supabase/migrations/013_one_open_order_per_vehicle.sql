-- A vehicle can only have one order that has not been delivered yet.
do $$
begin
  if exists (
    select 1
    from public.orders
    where status <> 'entregado'
    group by vehicle_id
    having count(*) > 1
  ) then
    raise exception 'Some vehicles have more than one open order. Close or delete the duplicates before applying this migration (see the query in the comment below).';
  end if;
end;
$$;

-- To find the duplicates:
-- select vehicle_id, array_agg(id || ' (' || status || ')' order by created_at) as open_orders
-- from public.orders where status <> 'entregado' group by vehicle_id having count(*) > 1;

create unique index orders_one_open_per_vehicle_idx
on public.orders (vehicle_id)
where status <> 'entregado';
