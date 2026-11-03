import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_SPECIALTY_OPTIONS, type SpecialtyOption } from "@/lib/mechanics";

export type SpecialtyRow = SpecialtyOption & { sortOrder: number; isActive: boolean };

/** Admin-managed specialties (migration 036), active ones by default; the built-in list if the table is not there. */
export async function getSpecialties(admin: SupabaseClient | null, { includeInactive = false } = {}): Promise<SpecialtyRow[]> {
  const fallback = DEFAULT_SPECIALTY_OPTIONS.map((option, index) => ({ ...option, sortOrder: index * 10, isActive: true }));
  if (!admin) return fallback;
  let query = admin.from("service_specialties").select("key, label, sort_order, is_active").order("sort_order").order("label");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error || !data?.length) return fallback;
  return data.map((row) => ({ key: row.key, label: row.label, sortOrder: row.sort_order, isActive: row.is_active }));
}

/** Keys that exist, so APIs accept only real specialties. */
export async function validSpecialtyKeys(admin: SupabaseClient, keys: string[]) {
  const options = await getSpecialties(admin, { includeInactive: true });
  return { options, keys: keys.filter((key) => options.some((option) => option.key === key)) };
}
