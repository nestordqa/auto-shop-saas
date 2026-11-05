import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getStaffGarage, staffCanAccessOrder } from "@/lib/auth/garage-staff";
import { getGarageBillingStatus } from "@/lib/billing-status";

/** The order an owner, manager or assigned mechanic may work on; none while the garage's access is suspended for arrears. */
export async function getAuthorizedDiagnosticOrder(supabase: SupabaseClient, user: User, orderId: string) {
  const { data: order } = await supabase.from("orders").select("id, garage_id, branch_id, mechanic_id, status").eq("id", orderId).maybeSingle();
  if (!order) return null;

  let allowed = false;
  if (user.app_metadata.role === "garage_owner" || user.app_metadata.role === "garage_manager") {
    allowed = staffCanAccessOrder(await getStaffGarage(supabase, user), order);
  } else if (user.app_metadata.role === "mechanic") {
    const { data: mechanic } = await supabase.from("mechanics").select("id").eq("id", order.mechanic_id).eq("profile_id", user.id).eq("is_active", true).maybeSingle();
    allowed = Boolean(mechanic);
  }

  return allowed && !(await getGarageBillingStatus(order.garage_id)).locked ? order : null;
}

/** Active mechanic of this user allowed to receive vehicles (recepción), or null. */
export async function getReceptionMechanic(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("mechanics").select("id, garage_id, branch_id").eq("profile_id", userId).eq("is_active", true).eq("can_receive", true).maybeSingle();
  return data as { id: string; garage_id: string; branch_id: string } | null;
}

/**
 * The order whose vehicle intake this user may do: owner/manager of the order's garage (branch), or a
 * reception mechanic of the order's branch. Regular mechanics never do intakes.
 */
export async function getAuthorizedIntakeOrder(supabase: SupabaseClient, user: User, orderId: string) {
  const { data: order } = await supabase.from("orders").select("id, garage_id, branch_id, mechanic_id, status").eq("id", orderId).maybeSingle();
  if (!order) return null;
  let allowed = false;
  if (user.app_metadata.role === "garage_owner" || user.app_metadata.role === "garage_manager") {
    allowed = staffCanAccessOrder(await getStaffGarage(supabase, user), order);
  } else if (user.app_metadata.role === "mechanic") {
    const reception = await getReceptionMechanic(supabase, user.id);
    allowed = Boolean(reception && reception.garage_id === order.garage_id && reception.branch_id === order.branch_id);
  }
  return allowed && !(await getGarageBillingStatus(order.garage_id)).locked ? order : null;
}
