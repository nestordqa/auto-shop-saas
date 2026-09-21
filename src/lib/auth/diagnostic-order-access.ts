import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function getAuthorizedDiagnosticOrder(supabase: SupabaseClient, user: User, orderId: string) {
  const { data: order } = await supabase.from("orders").select("id, garage_id, mechanic_id, status").eq("id", orderId).maybeSingle();
  if (!order) return null;

  if (user.app_metadata.role === "garage_owner") {
    const { data: garage } = await supabase.from("garages").select("id").eq("id", order.garage_id).eq("owner_id", user.id).maybeSingle();
    return garage ? order : null;
  }

  if (user.app_metadata.role === "mechanic") {
    const { data: mechanic } = await supabase.from("mechanics").select("id").eq("id", order.mechanic_id).eq("profile_id", user.id).eq("is_active", true).maybeSingle();
    return mechanic ? order : null;
  }

  return null;
}