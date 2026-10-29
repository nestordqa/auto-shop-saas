import { cookies } from "next/headers";

import type { VehicleIntake } from "@/lib/intake";
import { getOrderIntakes } from "@/lib/intake-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

export type StatusEvent = { status: OrderStatus; at: string };

export type ClientOrder = {
  orderId: string;
  vehicleId: string;
  status: OrderStatus;
  appointmentDate: string;
  vehicle: string;
  garageName: string;
  garageAddress: string;
  history: StatusEvent[];
  intake: VehicleIntake | null;
  budget: {
    includesParts: boolean;
    totalAmount: number;
    approved: boolean | null;
    diagnostics: { description: string; price: number }[];
  } | null;
};

/** Everything the client portal pages show, loaded with one round of queries. */
export async function loadClientPortal(userId: string) {
  const garageSlug = (await cookies()).get("garage_context")?.value;
  const dataClient = createAdminClient() ?? await createClient();
  const { data: vehicles } = await dataClient.from("vehicles").select("id, brand, model, year, plate").eq("user_id", userId);
  const vehicleIds = (vehicles ?? []).map(({ id }) => id);
  const { data: orderRows } = vehicleIds.length
    ? await dataClient.from("orders").select("id, vehicle_id, garage_id, status, appointment_date").in("vehicle_id", vehicleIds).order("created_at", { ascending: false })
    : { data: [] };
  const orderIds = (orderRows ?? []).map(({ id }) => id);
  const [{ data: budgets }, { data: diagnostics }, { data: history }, { data: garages }, intakes] = await Promise.all([
    orderIds.length ? dataClient.from("budgets").select("order_id, includes_parts, total_amount, approved").in("order_id", orderIds) : Promise.resolve({ data: [] }),
    orderIds.length ? dataClient.from("diagnostics").select("order_id, description, price").in("order_id", orderIds).order("created_at") : Promise.resolve({ data: [] }),
    orderIds.length ? dataClient.from("order_status_history").select("order_id, status, changed_at").in("order_id", orderIds).order("changed_at") : Promise.resolve({ data: [] }),
    dataClient.from("garages").select("id, name, address, slug").order("name"),
    getOrderIntakes(dataClient, orderIds),
  ]);

  const vehicleLabel = (vehicle: { brand: string; model: string; year: number; plate: string }) => `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}`;

  const orders: ClientOrder[] = (orderRows ?? []).flatMap((order) => {
    const vehicle = vehicles?.find((item) => item.id === order.vehicle_id);
    if (!vehicle) return [];
    const garage = garages?.find((item) => item.id === order.garage_id);
    const budget = budgets?.find((item) => item.order_id === order.id);
    return [{
      orderId: order.id,
      vehicleId: order.vehicle_id,
      status: order.status as OrderStatus,
      appointmentDate: order.appointment_date,
      vehicle: vehicleLabel(vehicle),
      garageName: garage?.name ?? "Taller",
      garageAddress: garage?.address ?? "",
      history: (history ?? []).filter((item) => item.order_id === order.id).map((item) => ({ status: item.status as OrderStatus, at: item.changed_at })),
      intake: intakes.get(order.id) ?? null,
      budget: budget ? {
        includesParts: budget.includes_parts,
        totalAmount: Number(budget.total_amount),
        approved: budget.approved,
        diagnostics: (diagnostics ?? []).filter((item) => item.order_id === order.id).map((item) => ({ description: item.description, price: Number(item.price ?? 0) })),
      } : null,
    }];
  });

  return {
    orders,
    vehicles: (vehicles ?? []).map((vehicle) => {
      const openStatus = orders.find((order) => order.vehicleId === vehicle.id && order.status !== "entregado")?.status;
      return { id: vehicle.id, label: vehicleLabel(vehicle), openOrderLabel: openStatus ? ORDER_STATUS_LABELS[openStatus] : null };
    }),
    garages: (garages ?? []).map((garage) => ({ id: garage.id, label: garage.name })),
    defaultGarageId: garages?.find((garage) => garage.slug === garageSlug)?.id,
  };
}
