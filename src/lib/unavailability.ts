import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type UnavailableRange = { starts_at: string; ends_at: string };

/** Blocks of a garage that overlap [from, to]. */
export async function getUnavailableRanges(admin: SupabaseClient, garageId: string, from: string, to: string): Promise<UnavailableRange[]> {
  const { data } = await admin.from("garage_unavailability").select("starts_at, ends_at").eq("garage_id", garageId).lte("starts_at", to).gt("ends_at", from);
  return data ?? [];
}

/** A slot is blocked when it starts inside a range (start inclusive, end exclusive). */
export function isBlocked(ranges: UnavailableRange[], timestamp: number) {
  return ranges.some((range) => timestamp >= new Date(range.starts_at).getTime() && timestamp < new Date(range.ends_at).getTime());
}
