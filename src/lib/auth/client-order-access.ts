import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrderStatus } from "@/types/domain";

/** The client's own order with what payments need (garage, status, approved budget total), or null. */
export async function getClientPayableOrder(admin: SupabaseClient, userId: string, orderId: string) {
  const { data: order } = await admin.from("orders").select("id, garage_id, vehicle_id, status").eq("id", orderId).maybeSingle();
  if (!order) return null;
  const [{ data: vehicle }, { data: budget }] = await Promise.all([
    admin.from("vehicles").select("id").eq("id", order.vehicle_id).eq("user_id", userId).maybeSingle(),
    admin.from("budgets").select("total_amount, approved").eq("order_id", order.id).maybeSingle(),
  ]);
  if (!vehicle) return null;
  return { id: order.id as string, garageId: order.garage_id as string, status: order.status as OrderStatus, budgetApproved: (budget?.approved ?? null) as boolean | null, total: Number(budget?.total_amount ?? 0) };
}
