import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { VEHICLE_SYSTEMS } from "@/lib/vehicle-systems";

export type RepairOption = { key: string; label: string; system: string };

/** Value of the "Otro…" option: the mechanic writes the repair name. */
export const OTHER_REPAIR = "otro";

/**
 * Repairs offered when diagnosing, from `repair_catalog` (migration 035), limited to the garage's
 * specialties ("general" sees all). Falls back to the built-in systems if the table is not there yet.
 */
export async function getRepairOptions(admin: SupabaseClient, specialties: string[] | null): Promise<RepairOption[]> {
  let query = admin.from("repair_catalog").select("key, label, system").eq("is_active", true).order("sort_order");
  const list = specialties?.length ? specialties : ["general"];
  if (!list.includes("general")) query = query.in("specialty", list);
  const { data, error } = await query;
  if (error) return VEHICLE_SYSTEMS.flatMap((system) => system.components.map((component) => ({ key: component.key, label: component.label, system: system.label })));
  return data ?? [];
}

/** Label stored with a diagnosis: catalog item, built-in component or the mechanic's own text. */
export async function resolveRepairLabel(admin: SupabaseClient, key: string, custom?: string | null) {
  if (key === OTHER_REPAIR) return custom?.trim() || null;
  const { data } = await admin.from("repair_catalog").select("label").eq("key", key).maybeSingle();
  if (data) return data.label as string;
  return VEHICLE_SYSTEMS.flatMap((system) => system.components).find((component) => component.key === key)?.label ?? null;
}

/** Options for one garage, from its specialties (migration 035; before it, everything). */
export async function getGarageRepairOptions(admin: SupabaseClient, garageId: string) {
  const { data } = await admin.from("garages").select("specialties").eq("id", garageId).maybeSingle();
  return getRepairOptions(admin, (data?.specialties as string[] | undefined) ?? null);
}
