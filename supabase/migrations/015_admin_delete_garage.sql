-- Deletes a garage and everything that only makes sense inside it, in one transaction:
-- its orders (diagnostics, budgets and intakes cascade), mechanics and managers.
-- Clients and their vehicles are kept; the owner profile is kept so it can be reassigned.
-- Returns the profile ids of the mechanics and managers, so the server can remove their auth accounts.
create or replace function public.admin_delete_garage(target_garage_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_ids uuid[];
begin
  if not exists (select 1 from public.garages where id = target_garage_id) then
    raise exception 'Garage not found';
  end if;

  select coalesce(array_agg(profile_id), '{}') into staff_ids
  from (
    select profile_id from public.mechanics where garage_id = target_garage_id
    union
    select profile_id from public.garage_managers where garage_id = target_garage_id
  ) staff;

  delete from public.orders where garage_id = target_garage_id;
  delete from public.garages where id = target_garage_id;

  return staff_ids;
end;
$$;

-- Only the server (service role) may call it.
revoke all on function public.admin_delete_garage(uuid) from public, anon, authenticated;
