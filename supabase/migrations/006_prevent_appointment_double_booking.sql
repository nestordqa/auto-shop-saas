do $$
begin
  if exists (
    select 1
    from public.orders
    group by garage_id, appointment_date
    having count(*) > 1
  ) then
    raise exception 'Resolve duplicate garage appointment slots before applying this migration';
  end if;
end;
$$;

create unique index orders_garage_appointment_unique_idx
on public.orders (garage_id, appointment_date);