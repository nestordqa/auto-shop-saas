import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrderStatus } from "@/types/domain";

export type OwnerOrderRow = {
  id: string;
  status: OrderStatus;
  appointmentDate: string;
  createdAt: string;
  vehicle: string;
  plate: string;
  customer: string;
  customerPhone: string | null;
  mechanic: string;
};

export async function getOwnerOrders(dataClient: SupabaseClient, garageId: string) {
  const { data: orders, error } = await dataClient.from("orders").select("id, vehicle_id, mechanic_id, status, appointment_date, created_at").eq("garage_id", garageId).order("appointment_date", { ascending: false });
  if (error || !orders?.length) return { rows: [] as OwnerOrderRow[], error };

  const vehicleIds = [...new Set(orders.map((order) => order.vehicle_id))];
  const mechanicIds = [...new Set(orders.map((order) => order.mechanic_id).filter((id): id is string => Boolean(id)))];
  const [{ data: vehicles }, { data: mechanics }] = await Promise.all([
    dataClient.from("vehicles").select("id, user_id, brand, model, year, plate").in("id", vehicleIds),
    mechanicIds.length ? dataClient.from("mechanics").select("id, profile_id").in("id", mechanicIds) : Promise.resolve({ data: [] }),
  ]);
  const profileIds = [...new Set([...(vehicles ?? []).map((vehicle) => vehicle.user_id), ...(mechanics ?? []).map((mechanic) => mechanic.profile_id)])];
  const { data: profiles } = profileIds.length ? await dataClient.from("profiles").select("id, full_name, phone").in("id", profileIds) : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));
  const mechanicById = new Map((mechanics ?? []).map((mechanic) => [mechanic.id, mechanic]));

  return {
    error: null,
    rows: orders.map((order) => {
      const vehicle = vehicleById.get(order.vehicle_id);
      const customer = vehicle ? profileById.get(vehicle.user_id) : undefined;
      const mechanic = order.mechanic_id ? mechanicById.get(order.mechanic_id) : undefined;
      return {
        id: order.id,
        status: order.status as OrderStatus,
        appointmentDate: order.appointment_date,
        createdAt: order.created_at,
        vehicle: vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : "Vehículo",
        plate: vehicle?.plate ?? "—",
        customer: customer?.full_name ?? "Cliente",
        customerPhone: customer?.phone ?? null,
        mechanic: mechanic ? profileById.get(mechanic.profile_id)?.full_name ?? "Mecánico" : "Sin asignar",
      };
    }),
  };
}