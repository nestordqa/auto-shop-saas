import type { SupabaseClient } from "@supabase/supabase-js";

export type Branch = {
  id: string;
  garage_id: string;
  name: string;
  slug: string;
  address: string;
  map_location: string | null;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  /** Raw opening hours; read it with `parseSchedule`. */
  schedule: unknown;
};

export const BRANCH_COLUMNS = "id, garage_id, name, slug, address, map_location, phone, is_main, is_active, schedule";

/** Branches of a garage, main first. `activeOnly` hides deactivated ones (booking, selectors). */
export async function getGarageBranches(dataClient: SupabaseClient, garageId: string, { activeOnly = false } = {}): Promise<Branch[]> {
  let query = dataClient.from("garage_branches").select(BRANCH_COLUMNS).eq("garage_id", garageId);
  if (activeOnly) query = query.eq("is_active", true);
  const { data } = await query.order("is_main", { ascending: false }).order("name");
  return (data ?? []) as Branch[];
}

/** Branches of many garages at once, grouped by garage (main first). */
export async function getBranchesByGarage(dataClient: SupabaseClient, garageIds: string[], { activeOnly = false } = {}) {
  const byGarage = new Map<string, Branch[]>();
  if (!garageIds.length) return byGarage;
  let query = dataClient.from("garage_branches").select(BRANCH_COLUMNS).in("garage_id", garageIds);
  if (activeOnly) query = query.eq("is_active", true);
  const { data } = await query.order("is_main", { ascending: false }).order("name");
  for (const branch of (data ?? []) as Branch[]) byGarage.set(branch.garage_id, [...(byGarage.get(branch.garage_id) ?? []), branch]);
  return byGarage;
}

/** "Taller · Sucursal" only when the garage really has several branches. */
export function branchLabel(garageName: string, branch: { name: string } | undefined, multiBranch: boolean) {
  return multiBranch && branch ? `${garageName} · ${branch.name}` : garageName;
}
