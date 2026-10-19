import type { SupabaseClient } from "@supabase/supabase-js";

import { COMPONENTS } from "@/lib/vehicle-systems";
import type { OrderStatus } from "@/types/domain";

export type HistoryItem = {
  description: string;
  component: string | null;
  interventionType: string | null;
  partBrand: string | null;
  price: number | null;
};

export type HistoryVisit = {
  orderId: string;
  date: string;
  garageName: string;
  ownGarage: boolean;
  status: OrderStatus;
  mileage: number | null;
  reportedIssue: string | null;
  approved: boolean | null;
  items: HistoryItem[];
};

export type ComponentRecord = {
  component: string;
  date: string;
  mileage: number | null;
  interventionType: string | null;
  partBrand: string | null;
};

export type VehicleHistory = {
  visits: HistoryVisit[];
  /** Latest performed intervention per component (approved budgets only). */
  lastByComponent: Map<string, ComponentRecord>;
};

type Viewer = { garageId: string } | { client: true };

/**
 * Clinical history of a vehicle across every TorkeOS garage. Garages see other
 * garages' work without prices or names; clients see everything of their own.
 */
export async function getVehicleHistory(
  dataClient: SupabaseClient,
  vehicleId: string,
  viewer: Viewer,
  { excludeOrderId }: { excludeOrderId?: string } = {},
): Promise<VehicleHistory> {
  const { data: orders } = await dataClient
    .from("orders")
    .select("id, garage_id, status, appointment_date, received_at")
    .eq("vehicle_id", vehicleId)
    .neq("status", "por_ingresar")
    .order("appointment_date", { ascending: false });
  const relevant = (orders ?? []).filter((order) => order.id !== excludeOrderId);
  if (!relevant.length) return { visits: [], lastByComponent: new Map() };

  const orderIds = relevant.map((order) => order.id);
  const garageIds = [...new Set(relevant.map((order) => order.garage_id))];
  const [{ data: intakes }, { data: diagnostics }, { data: budgets }, { data: garages }] = await Promise.all([
    dataClient.from("vehicle_intakes").select("order_id, mileage, reported_issue").in("order_id", orderIds),
    dataClient.from("diagnostics").select("order_id, description, price, component, intervention_type, part_brand").in("order_id", orderIds).order("created_at"),
    dataClient.from("budgets").select("order_id, approved").in("order_id", orderIds),
    dataClient.from("garages").select("id, name").in("id", garageIds),
  ]);

  const visits: HistoryVisit[] = relevant.map((order) => {
    const ownGarage = "client" in viewer || order.garage_id === viewer.garageId;
    const intake = intakes?.find((item) => item.order_id === order.id);
    return {
      orderId: order.id,
      date: order.received_at ?? order.appointment_date,
      garageName: ownGarage ? garages?.find((garage) => garage.id === order.garage_id)?.name ?? "Taller" : "Otro taller TorkeOS",
      ownGarage,
      status: order.status as OrderStatus,
      mileage: intake?.mileage ?? null,
      reportedIssue: intake?.reported_issue ?? null,
      approved: budgets?.find((budget) => budget.order_id === order.id)?.approved ?? null,
      items: (diagnostics ?? []).filter((item) => item.order_id === order.id).map((item) => ({
        description: item.description,
        component: item.component,
        interventionType: item.intervention_type,
        partBrand: item.part_brand,
        price: ownGarage && item.price !== null ? Number(item.price) : null,
      })),
    };
  });

  const lastByComponent = new Map<string, ComponentRecord>();
  for (const visit of visits) {
    if (visit.approved !== true) continue;
    for (const item of visit.items) {
      if (!item.component || !COMPONENTS.has(item.component) || lastByComponent.has(item.component)) continue;
      lastByComponent.set(item.component, {
        component: item.component,
        date: visit.date,
        mileage: visit.mileage,
        interventionType: item.interventionType,
        partBrand: item.partBrand,
      });
    }
  }

  return { visits, lastByComponent };
}

export function monthsBetween(from: string | Date, to: string | Date = new Date()) {
  const start = new Date(from);
  const end = new Date(to);
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() - (end.getDate() < start.getDate() ? 1 : 0));
}

export function formatElapsed(months: number) {
  if (months < 1) return "hace menos de un mes";
  if (months < 12) return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `hace ${years} ${years === 1 ? "año" : "años"}${rest ? ` y ${rest} ${rest === 1 ? "mes" : "meses"}` : ""}`;
}

export type DurabilityRow = {
  component: string;
  partBrand: string | null;
  replacements: number;
  measured: number;
  avgMonths: number | null;
  avgKm: number | null;
  earlyFailures: number;
};

/**
 * Durability per component and part brand from this garage's approved work:
 * the time and distance between two replacements of the same component on the same vehicle.
 */
export async function getDurabilityStats(dataClient: SupabaseClient, garageId: string) {
  const { data: orders } = await dataClient.from("orders").select("id, vehicle_id, appointment_date, received_at").eq("garage_id", garageId);
  if (!orders?.length) return { rows: [] as DurabilityRow[], topComponents: [] as { component: string; count: number }[], totalInterventions: 0 };

  const orderIds = orders.map((order) => order.id);
  const [{ data: budgets }, { data: diagnostics }, { data: intakes }] = await Promise.all([
    dataClient.from("budgets").select("order_id").in("order_id", orderIds).eq("approved", true),
    dataClient.from("diagnostics").select("order_id, component, intervention_type, part_brand").in("order_id", orderIds).not("component", "is", null),
    dataClient.from("vehicle_intakes").select("order_id, mileage").in("order_id", orderIds),
  ]);
  const approved = new Set((budgets ?? []).map((budget) => budget.order_id));
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const mileageByOrder = new Map((intakes ?? []).map((intake) => [intake.order_id, intake.mileage as number]));

  const performed = (diagnostics ?? []).filter((item) => approved.has(item.order_id) && item.component && COMPONENTS.has(item.component));
  const counts = new Map<string, number>();
  for (const item of performed) counts.set(item.component!, (counts.get(item.component!) ?? 0) + 1);

  const replacements = performed
    .filter((item) => item.intervention_type === "reemplazo")
    .map((item) => {
      const order = orderById.get(item.order_id)!;
      return {
        vehicleId: order.vehicle_id,
        component: item.component!,
        partBrand: item.part_brand?.trim() || null,
        date: new Date(order.received_at ?? order.appointment_date),
        mileage: mileageByOrder.get(item.order_id) ?? null,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  type Acc = { replacements: number; months: number[]; km: number[]; early: number };
  const groups = new Map<string, Acc & { component: string; partBrand: string | null }>();
  const lastSeen = new Map<string, (typeof replacements)[number]>();
  const groupFor = (component: string, partBrand: string | null) => {
    const key = `${component}|${partBrand?.toLocaleLowerCase("es") ?? ""}`;
    if (!groups.has(key)) groups.set(key, { component, partBrand, replacements: 0, months: [], km: [], early: 0 });
    return groups.get(key)!;
  };

  for (const record of replacements) {
    groupFor(record.component, record.partBrand).replacements += 1;
    const vehicleKey = `${record.vehicleId}|${record.component}`;
    const previous = lastSeen.get(vehicleKey);
    if (previous) {
      const group = groupFor(previous.component, previous.partBrand);
      const days = (record.date.getTime() - previous.date.getTime()) / 86_400_000;
      group.months.push(days / 30.44);
      if (days < 90) group.early += 1;
      if (previous.mileage !== null && record.mileage !== null && record.mileage >= previous.mileage) group.km.push(record.mileage - previous.mileage);
    }
    lastSeen.set(vehicleKey, record);
  }

  const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
  const rows: DurabilityRow[] = [...groups.values()]
    .map((group) => ({
      component: group.component,
      partBrand: group.partBrand,
      replacements: group.replacements,
      measured: group.months.length,
      avgMonths: average(group.months),
      avgKm: average(group.km),
      earlyFailures: group.early,
    }))
    .sort((a, b) => b.measured - a.measured || b.replacements - a.replacements);

  const topComponents = [...counts.entries()]
    .map(([component, count]) => ({ component, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return { rows, topComponents, totalInterventions: performed.length };
}
