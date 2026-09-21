import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function getAssignedMechanicOrder(supabase: SupabaseClient, user: User, orderId: string) {
  if (user.app_metadata.role !== "mechanic") return null;
  const { data: mechanic } = await supabase.from("mechanics").select("id").eq("profile_id", user.id).eq("is_active", true).maybeSingle();
  if (!mechanic) return null;
  const { data: order } = await supabase.from("orders").select("id, status").eq("id", orderId).eq("mechanic_id", mechanic.id).maybeSingle();
  return order;
}