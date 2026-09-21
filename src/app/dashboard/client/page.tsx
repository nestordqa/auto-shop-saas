import { cookies } from "next/headers";

import { ClientVehicleDashboard } from "@/components/dashboard/client-vehicle-dashboard";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/domain";

export default async function ClientDashboardPage() {
  const user = await requireRole(["client"]);
  const garageSlug = (await cookies()).get("garage_context")?.value;
  const dataClient = createAdminClient() ?? await createClient();
  const { data: vehicles } = await dataClient.from("vehicles").select("id, brand, model, year, plate").eq("user_id", user.id);
  const vehicleIds = (vehicles ?? []).map(({ id }) => id);
  const { data: orders } = vehicleIds.length
    ? await dataClient.from("orders").select("id, vehicle_id, garage_id, status, appointment_date").in("vehicle_id", vehicleIds).order("created_at", { ascending: false })
    : { data: [] };
  const orderIds = (orders ?? []).map(({ id }) => id);
  const [{ data: budgets }, { data: diagnostics }, { data: garages }, { data: brands }, { data: models }] = await Promise.all([
    orderIds.length ? dataClient.from("budgets").select("order_id, includes_parts, total_amount, approved").in("order_id", orderIds) : Promise.resolve({ data: [] }),
    orderIds.length ? dataClient.from("diagnostics").select("order_id, description, price").in("order_id", orderIds).order("created_at") : Promise.resolve({ data: [] }),
    dataClient.from("garages").select("id, name, address, slug").order("name"),
    dataClient.from("vehicle_brands").select("id, name").eq("is_active", true).order("name"),
    dataClient.from("vehicle_models").select("id, brand_id, name").eq("is_active", true).order("name"),
  ]);
  const items = (orders ?? []).flatMap((order) => {
    const budget = budgets?.find((item) => item.order_id === order.id);
    const vehicle = vehicles?.find((item) => item.id === order.vehicle_id);
    if (!budget || !vehicle) return [];
    const garage = garages?.find((item) => item.id === order.garage_id);
    return [{
      orderId: order.id,
      status: order.status as OrderStatus,
      appointmentDate: order.appointment_date,
      vehicle: `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}`,
      garageName: garage?.name ?? "Taller",
      garageAddress: garage?.address ?? "",
      includesParts: budget.includes_parts,
      totalAmount: Number(budget.total_amount),
      approved: budget.approved,
      diagnostics: (diagnostics ?? []).filter((item) => item.order_id === order.id).map((item) => ({ description: item.description, price: Number(item.price ?? 0) })),
    }];
  });

  return <ClientVehicleDashboard customerName={user.fullName} budgets={items} garages={(garages ?? []).map((garage) => ({ id: garage.id, label: garage.name }))} vehicles={(vehicles ?? []).map((vehicle) => ({ id: vehicle.id, label: `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}` }))} brands={(brands ?? []).map((brand) => ({ id: brand.id, name: String(brand.name) }))} models={(models ?? []).map((model) => ({ id: model.id, brandId: model.brand_id, name: String(model.name) }))} defaultGarageId={garages?.find((garage) => garage.slug === garageSlug)?.id} />;
}