-- Managers only reach their own branch at the database level too.
-- Child tables (diagnostics, budgets, intakes, status history) check access through a subquery on
-- orders, which is itself filtered by these policies, so restricting orders covers them as well.
create or replace function public.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_app_role()
    when 'garage_manager' then (select branch_id from public.garage_managers where profile_id = auth.uid() and is_active)
    else null
  end;
$$;

grant execute on function public.current_branch_id() to authenticated;

drop policy orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated using (
  public.current_app_role() = 'admin' or
  (garage_id = public.current_garage_id() and (public.current_branch_id() is null or branch_id = public.current_branch_id())) or
  exists (select 1 from public.vehicles v where v.id = orders.vehicle_id and v.user_id = auth.uid())
);

drop policy orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated with check (
  public.current_app_role() = 'admin' or
  (garage_id = public.current_garage_id() and (public.current_branch_id() is null or branch_id = public.current_branch_id())) or
  (status = 'por_ingresar' and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = auth.uid()))
);

drop policy orders_update_staff on public.orders;
create policy orders_update_staff on public.orders for update to authenticated
using (public.current_app_role() = 'admin' or (garage_id = public.current_garage_id() and (public.current_branch_id() is null or branch_id = public.current_branch_id())))
with check (public.current_app_role() = 'admin' or (garage_id = public.current_garage_id() and (public.current_branch_id() is null or branch_id = public.current_branch_id())));

-- Managers manage only the mechanics of their branch (moving between branches is for the owner).
drop policy mechanics_insert on public.mechanics;
create policy mechanics_insert on public.mechanics for insert to authenticated with check (
  public.current_app_role() = 'admin' or
  (public.current_app_role() = 'garage_owner' and garage_id = public.current_garage_id()) or
  (public.current_app_role() = 'garage_manager' and garage_id = public.current_garage_id() and branch_id = public.current_branch_id())
);

drop policy mechanics_update on public.mechanics;
-- Mechanics keep the access to their own garage row they had before.
create policy mechanics_update on public.mechanics for update to authenticated
using (
  public.current_app_role() = 'admin' or
  (public.current_app_role() in ('garage_owner', 'mechanic') and garage_id = public.current_garage_id()) or
  (public.current_app_role() = 'garage_manager' and garage_id = public.current_garage_id() and branch_id = public.current_branch_id())
)
with check (
  public.current_app_role() = 'admin' or
  (public.current_app_role() in ('garage_owner', 'mechanic') and garage_id = public.current_garage_id()) or
  (public.current_app_role() = 'garage_manager' and garage_id = public.current_garage_id() and branch_id = public.current_branch_id())
);

drop policy mechanics_delete on public.mechanics;
create policy mechanics_delete on public.mechanics for delete to authenticated using (
  public.current_app_role() = 'admin' or
  (public.current_app_role() = 'garage_owner' and garage_id = public.current_garage_id()) or
  (public.current_app_role() = 'garage_manager' and garage_id = public.current_garage_id() and branch_id = public.current_branch_id())
);

-- Billing history: when a branch was deactivated, so past periods keep charging it correctly.
alter table public.garage_branches add column if not exists deactivated_at timestamptz;
update public.garage_branches set deactivated_at = updated_at where not is_active and deactivated_at is null;
