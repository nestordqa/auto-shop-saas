import type { SupabaseClient } from "@supabase/supabase-js";

import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

/** A vehicle can only have one order that is not delivered yet (enforced by migration 013). */
export async function getOpenOrderForVehicle(dataClient: SupabaseClient, vehicleId: string) {
  const { data } = await dataClient.from("orders").select("id, status").eq("vehicle_id", vehicleId).neq("status", "entregado").limit(1).maybeSingle();
  return data as { id: string; status: OrderStatus } | null;
}

/** vehicle_id → status of its open order, for every vehicle that has one. */
export async function getOpenOrdersByVehicle(dataClient: SupabaseClient, vehicleIds?: string[]) {
  if (vehicleIds && !vehicleIds.length) return new Map<string, OrderStatus>();
  let query = dataClient.from("orders").select("vehicle_id, status").neq("status", "entregado");
  if (vehicleIds) query = query.in("vehicle_id", vehicleIds);
  const { data } = await query;
  return new Map((data ?? []).map((order) => [order.vehicle_id as string, order.status as OrderStatus]));
}

export function openOrderMessage(status: OrderStatus) {
  return `Este vehículo ya tiene una orden abierta (${ORDER_STATUS_LABELS[status]}). Podrás crear otra cuando se entregue.`;
}

/** Badge colors per status: cool tones while the car is being worked, warm when someone must act, gray when closed. */
export const ORDER_STATUS_TONES: Record<OrderStatus, { badge: string; dot: string }> = {
  por_ingresar: { badge: "border-sky-200 bg-sky-50 text-sky-800", dot: "bg-sky-500" },
  ingresado: { badge: "border-indigo-200 bg-indigo-50 text-indigo-800", dot: "bg-indigo-500" },
  diagnosticado: { badge: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  presupuestado: { badge: "border-violet-200 bg-violet-50 text-violet-800", dot: "bg-violet-500" },
  en_reparacion: { badge: "border-orange-200 bg-orange-50 text-orange-800", dot: "bg-orange-500" },
  presupuesto_rechazado: { badge: "border-red-200 bg-red-50 text-red-800", dot: "bg-red-500" },
  listo_para_entregar: { badge: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  entregado: { badge: "border-stone-200 bg-stone-100 text-stone-500", dot: "bg-stone-400" },
};

type SortableOrder = { status: OrderStatus; appointmentDate: string };

/**
 * Work-queue order: open orders first, oldest appointment first;
 * delivered orders always last, most recent delivery first.
 */
export function compareOrdersForWork(a: SortableOrder, b: SortableOrder) {
  const aDone = a.status === "entregado";
  const bDone = b.status === "entregado";
  if (aDone !== bDone) return aDone ? 1 : -1;
  const diff = new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
  return aDone ? -diff : diff;
}
