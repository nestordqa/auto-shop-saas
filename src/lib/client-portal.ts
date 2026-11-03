import type { VehicleIntake } from "@/lib/intake";
import { branchLabel, getBranchesByGarage } from "@/lib/branches";
import { resolveClientGarage } from "@/lib/client-garage";
import { getOrderIntakes } from "@/lib/intake-data";
import { canPayOrder, type OrderPayment, type PaymentMethod } from "@/lib/payments";
import { getOrderPayments, getPaymentMethods } from "@/lib/payments-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { diagnosticDetail } from "@/lib/vehicle-systems";
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
  /** Latest payment, and the garage methods when the order can be paid (budget approved, in repair or later). */
  payment: OrderPayment | null;
  paymentMethods: PaymentMethod[] | null;
  budget: {
    includesParts: boolean;
    totalAmount: number;
    approved: boolean | null;
    diagnostics: { description: string; detail: string; price: number; done: boolean }[];
  } | null;
};

/** Everything the client portal pages show, loaded with one round of queries. */
export async function loadClientPortal(userId: string) {
  const admin = createAdminClient();
  const dataClient = admin ?? await createClient();
  const { data: vehicles } = await dataClient.from("vehicles").select("id, brand, model, year, plate").eq("user_id", userId);
  const vehicleIds = (vehicles ?? []).map(({ id }) => id);
  const { data: orderRows } = vehicleIds.length
    ? await dataClient.from("orders").select("id, vehicle_id, garage_id, branch_id, status, appointment_date").in("vehicle_id", vehicleIds).order("created_at", { ascending: false })
    : { data: [] };
  const orderIds = (orderRows ?? []).map(({ id }) => id);
  const [{ data: budgets }, { data: diagnostics }, { data: history }, { data: garages }, intakes, homeGarage] = await Promise.all([
    orderIds.length ? dataClient.from("budgets").select("order_id, includes_parts, total_amount, approved").in("order_id", orderIds) : Promise.resolve({ data: [] }),
    orderIds.length ? dataClient.from("diagnostics").select("order_id, description, price, is_completed, component, component_label, intervention_type, part_brand").in("order_id", orderIds).order("created_at") : Promise.resolve({ data: [] }),
    orderIds.length ? dataClient.from("order_status_history").select("order_id, status, changed_at").in("order_id", orderIds).order("changed_at") : Promise.resolve({ data: [] }),
    dataClient.from("garages").select("id, name, address, specialty").order("name"),
    getOrderIntakes(dataClient, orderIds),
    admin ? resolveClientGarage(admin) : Promise.resolve(null),
  ]);

  // All branches (inactive too: past orders may point to one); booking only offers the active ones.
  const branchesByGarage = await getBranchesByGarage(dataClient, (garages ?? []).map((garage) => garage.id));
  // Payments: only for orders that can be paid; methods are loaded once per garage.
  const payable = (orderRows ?? []).filter((order) => canPayOrder(order.status as OrderStatus, budgets?.find((item) => item.order_id === order.id)?.approved));
  const [payments, methodsByGarage] = admin ? await Promise.all([
    getOrderPayments(admin, payable.map((order) => order.id)),
    Promise.all([...new Set(payable.map((order) => order.garage_id as string))].map(async (garageId) => [garageId, await getPaymentMethods(admin, garageId, { enabledOnly: true })] as const)).then((entries) => new Map(entries)),
  ]) : [new Map<string, OrderPayment>(), new Map<string, PaymentMethod[]>()];
  const vehicleLabel = (vehicle: { brand: string; model: string; year: number; plate: string }) => `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}`;

  const orders: ClientOrder[] = (orderRows ?? []).flatMap((order) => {
    const vehicle = vehicles?.find((item) => item.id === order.vehicle_id);
    if (!vehicle) return [];
    const garage = garages?.find((item) => item.id === order.garage_id);
    const garageBranches = branchesByGarage.get(order.garage_id) ?? [];
    const branch = garageBranches.find((item) => item.id === order.branch_id);
    const budget = budgets?.find((item) => item.order_id === order.id);
    return [{
      orderId: order.id,
      vehicleId: order.vehicle_id,
      status: order.status as OrderStatus,
      appointmentDate: order.appointment_date,
      vehicle: vehicleLabel(vehicle),
      garageName: branchLabel(garage?.name ?? "Taller", branch, garageBranches.length > 1),
      garageAddress: branch?.address ?? garage?.address ?? "",
      history: (history ?? []).filter((item) => item.order_id === order.id).map((item) => ({ status: item.status as OrderStatus, at: item.changed_at })),
      intake: intakes.get(order.id) ?? null,
      payment: payments.get(order.id) ?? null,
      paymentMethods: methodsByGarage.get(order.garage_id) ?? null,
      budget: budget ? {
        includesParts: budget.includes_parts,
        totalAmount: Number(budget.total_amount),
        approved: budget.approved,
        diagnostics: (diagnostics ?? []).filter((item) => item.order_id === order.id).map((item) => ({ description: item.description, detail: diagnosticDetail({ component: item.component, componentLabel: item.component_label, interventionType: item.intervention_type, partBrand: item.part_brand }), price: Number(item.price ?? 0), done: item.is_completed })),
      } : null,
    }];
  });

  return {
    orders,
    vehicles: (vehicles ?? []).map((vehicle) => {
      const openStatus = orders.find((order) => order.vehicleId === vehicle.id && order.status !== "entregado")?.status;
      return { id: vehicle.id, label: vehicleLabel(vehicle), openOrderLabel: openStatus ? ORDER_STATUS_LABELS[openStatus] : null };
    }),
    garages: (garages ?? []).map((garage) => ({ id: garage.id, label: garage.name, address: garage.address, specialty: garage.specialty, branches: (branchesByGarage.get(garage.id) ?? []).filter((branch) => branch.is_active).map((branch) => ({ id: branch.id, name: branch.name, address: branch.address })) })),
    defaultGarageId: homeGarage?.id,
  };
}
