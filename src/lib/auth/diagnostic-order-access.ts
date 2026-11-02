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
