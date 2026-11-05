import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { cityKey, DEFAULT_COUNTRY, OTHER_CITY, type LocationFields, type StateOption } from "@/lib/locations";

/** States of the default country with their cities, alphabetically. */
export async function getLocationOptions(client: SupabaseClient | null): Promise<StateOption[]> {
  if (!client) return [];
  const { data: states } = await client.from("states").select("id, name").eq("country_code", DEFAULT_COUNTRY.code).order("name");
  const stateIds = (states ?? []).map((state) => state.id as string);
  const { data: cities } = stateIds.length ? await client.from("cities").select("id, state_id, name").in("state_id", stateIds).order("name") : { data: [] };
  return (states ?? []).map((state) => ({
    id: state.id as string,
    name: state.name as string,
    cities: (cities ?? []).filter((city) => city.state_id === state.id).map((city) => ({ id: city.id as string, name: city.name as string })),
  }));
}

export type ResolvedLocation = { country_code: string; state_id: string; city_id: string };

/**
 * Validates a submitted location and returns the columns to store. "Otra ciudad…" reuses a city with the same
 * name in that state or creates it (unverified), so the next person can pick it from the list.
 */
export async function resolveLocation(admin: SupabaseClient, input: LocationFields, createdBy?: string | null): Promise<ResolvedLocation | { error: string }> {
  const { data: state } = await admin.from("states").select("id").eq("id", input.stateId).eq("country_code", DEFAULT_COUNTRY.code).maybeSingle();
  if (!state) return { error: "Selecciona un estado válido." };

  if (input.cityId !== OTHER_CITY) {
    const { data: city } = await admin.from("cities").select("id").eq("id", input.cityId).eq("state_id", state.id).maybeSingle();
    if (!city) return { error: "La ciudad no pertenece al estado seleccionado." };
    return { country_code: DEFAULT_COUNTRY.code, state_id: state.id, city_id: city.id };
  }

  const name = (input.otherCity ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2) return { error: "Escribe el nombre de la ciudad." };
  const key = cityKey(name);
  const find = () => admin.from("cities").select("id").eq("state_id", state.id).eq("name_key", key).maybeSingle();
  const { data: existing } = await find();
  if (existing) return { country_code: DEFAULT_COUNTRY.code, state_id: state.id, city_id: existing.id };
  const { data: created, error } = await admin.from("cities").insert({ state_id: state.id, name, is_verified: false, created_by: createdBy ?? null }).select("id").single();
  // Someone added the same city at the same time: use theirs.
  const city = created ?? (error?.code === "23505" ? (await find()).data : null);
  if (!city) return { error: "No se pudo registrar la ciudad." };
  return { country_code: DEFAULT_COUNTRY.code, state_id: state.id, city_id: city.id };
}

type ClientRow = { id: string; full_name: string; document_id: string | null; phone: string | null };

/**
 * Clients a garage can pick when creating an order: those of the garage's state, those without a location yet
 * (older accounts) and the garage's own customers wherever they live now.
 */
export async function getGarageClients(client: SupabaseClient, garageId: string): Promise<ClientRow[]> {
  const columns = "id, full_name, document_id, phone";
  const { data: garage } = await client.from("garages").select("state_id").eq("id", garageId).maybeSingle();
  if (!garage?.state_id) {
    const { data } = await client.from("profiles").select(columns).eq("role", "client").order("full_name");
    return (data ?? []) as ClientRow[];
  }
  const [{ data: local }, { data: orderRows }] = await Promise.all([
    client.from("profiles").select(columns).eq("role", "client").or(`state_id.eq.${garage.state_id},state_id.is.null`),
    client.from("orders").select("vehicle_id").eq("garage_id", garageId),
  ]);
  const vehicleIds = [...new Set((orderRows ?? []).map((row) => row.vehicle_id as string))];
  const { data: vehicles } = vehicleIds.length ? await client.from("vehicles").select("user_id").in("id", vehicleIds) : { data: [] };
  const known = new Set((local ?? []).map((row) => row.id as string));
  const customerIds = [...new Set((vehicles ?? []).map((row) => row.user_id as string))].filter((id) => !known.has(id));
  const { data: customers } = customerIds.length ? await client.from("profiles").select(columns).eq("role", "client").in("id", customerIds) : { data: [] };
  return ([...(local ?? []), ...(customers ?? [])] as ClientRow[]).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "es"));
}
