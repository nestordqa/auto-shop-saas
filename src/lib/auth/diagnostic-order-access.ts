import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getStaffGarage } from "@/lib/auth/garage-staff";

export async function getAuthorizedDiagnosticOrder(supabase: SupabaseClient, user: User, orderId: string) {
  const { data: order } = await supabase.from("orders").select("id, garage_id, mechanic_id, status").eq("id", orderId).maybeSingle();
  if (!order) return null;

  if (user.app_metadata.role === "garage_owner" || user.app_metadata.role === "garage_manager") {
    const staff = await getStaffGarage(supabase, user);
    return staff?.garageId === order.garage_id ? order : null;
  }

  if (user.app_metadata.role === "mechanic") {
    const { data: mechanic } = await supabase.from("mechanics").select("id").eq("id", order.mechanic_id).eq("profile_id", user.id).eq("is_active", true).maybeSingle();
    return mechanic ? order : null;
  }

  return null;
}
