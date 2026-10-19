-- The garage can reopen a finished diagnosis (diagnosticado → ingresado) to add findings before quoting.
create or replace function public.validate_order_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if public.current_app_role() = 'mechanic' and not (
    (old.status = 'por_ingresar' and new.status = 'ingresado') or
    (old.status = 'ingresado' and new.status = 'diagnosticado')
  ) then
    raise exception 'Mechanics cannot perform this status transition';
  end if;

  if not (
    (old.status = 'por_ingresar' and new.status = 'ingresado') or
    (old.status = 'ingresado' and new.status = 'diagnosticado') or
    (old.status = 'diagnosticado' and new.status in ('presupuestado', 'ingresado')) or
    (old.status = 'presupuestado' and new.status in ('en_reparacion', 'presupuesto_rechazado')) or
    (old.status = 'presupuesto_rechazado' and new.status in ('diagnosticado', 'presupuestado')) or
    (old.status = 'en_reparacion' and new.status = 'listo_para_entregar') or
    (old.status = 'listo_para_entregar' and new.status = 'entregado')
  ) then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status;
  end if;

  if new.status = 'ingresado' and not exists (
    select 1 from public.vehicle_intakes where order_id = new.id
  ) then
    raise exception 'The vehicle intake form is required before check-in';
  end if;

  if new.status = 'ingresado' and new.received_at is null then
    new.received_at = now();
  elsif new.status = 'entregado' and new.delivered_at is null then
    new.delivered_at = now();
  end if;
  return new;
end;
$$;
