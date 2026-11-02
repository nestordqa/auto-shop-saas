import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type UnavailableRange = { starts_at: string; ends_at: string };

/** Blocks overlapping [from, to] that apply to a branch: its own plus the garage-wide ones (no branch). */
export async function getUnavailableRanges(admin: SupabaseClient, garageId: string, branchId: string, from: string, to: string): Promise<UnavailableRange[]> {
  const { data } = await admin.from("garage_unavailability").select("starts_at, ends_at").eq("garage_id", garageId).or(`branch_id.is.null,branch_id.eq.${branchId}`).lte("starts_at", to).gt("ends_at", from);
  return data ?? [];
}

/** A slot is blocked when it starts inside a range (start inclusive, end exclusive). */
export function isBlocked(ranges: UnavailableRange[], timestamp: number) {
  return ranges.some((range) => timestamp >= new Date(range.starts_at).getTime() && timestamp < new Date(range.ends_at).getTime());
}

/** Active branch a client books into: the requested one if it belongs to the garage, otherwise the main branch. */
export async function resolveBookingBranch(admin: SupabaseClient, garageId: string, branchId?: string | null) {
  let query = admin.from("garage_branches").select("id").eq("garage_id", garageId).eq("is_active", true);
  query = branchId ? query.eq("id", branchId) : query.eq("is_main", true);
  const { data } = await query.maybeSingle();
  return data?.id as string | undefined;
}
