import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getGarageBranches } from "@/lib/branches";
import { getGarageClients } from "@/lib/locations-data";
import { specialtyLabel } from "@/lib/mechanics";
import { getOpenOrdersByVehicle } from "@/lib/order-status";
import { ORDER_STATUS_LABELS } from "@/types/domain";

/** Everything the "new order" modal needs, limited to one branch (reception mechanics). */
export async function loadOrderCreateOptions(dataClient: SupabaseClient, garageId: string, branchId: string) {
  const [branches, { data: vehicles }, { data: mechanicRows }, clients, { data: brands }, { data: models }, openOrders] = await Promise.all([
    getGarageBranches(dataClient, garageId, { activeOnly: true }),
    dataClient.from("vehicles").select("id, user_id, brand, model, year, plate").order("plate"),
    dataClient.from("mechanics").select("id, profile_id, specialty, branch_id").eq("garage_id", garageId).eq("branch_id", branchId).eq("is_active", true),
    getGarageClients(dataClient, garageId),
    dataClient.from("vehicle_brands").select("id, name").eq("is_active", true),
    dataClient.from("vehicle_models").select("id, brand_id, name").eq("is_active", true),
    getOpenOrdersByVehicle(dataClient),
  ]);
  const profileIds = [...new Set((mechanicRows ?? []).map((mechanic) => mechanic.profile_id as string))];
  const { data: profiles } = profileIds.length ? await dataClient.from("profiles").select("id, full_name").in("id", profileIds) : { data: [] };
  const nameById = new Map((profiles ?? []).map((profile) => [profile.id as string, profile.full_name as string]));
  return {
    branches: branches.filter((branch) => branch.id === branchId).map((branch) => ({ id: branch.id, name: branch.name, schedule: branch.schedule })),
    clients: clients.map((client) => ({ id: client.id, name: client.full_name, documentId: client.document_id, phone: client.phone })),
    vehicles: (vehicles ?? []).map((vehicle) => {
      const openStatus = openOrders.get(vehicle.id);
      return { id: vehicle.id, clientId: vehicle.user_id, label: `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}`, openOrderLabel: openStatus ? ORDER_STATUS_LABELS[openStatus] : null };
    }),
    mechanics: (mechanicRows ?? []).map((mechanic) => ({ id: mechanic.id as string, name: nameById.get(mechanic.profile_id as string) ?? "Mecánico", specialty: specialtyLabel(mechanic.specialty as string), branchId: mechanic.branch_id as string })),
    brands: (brands ?? []).map((brand) => ({ id: brand.id, name: String(brand.name) })),
    models: (models ?? []).map((model) => ({ id: model.id, brandId: model.brand_id, name: String(model.name) })),
  };
}
