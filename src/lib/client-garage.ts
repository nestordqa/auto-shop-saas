import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { GARAGE_CONTEXT_COOKIE } from "@/lib/garage-context";

export type ClientGarage = { id: string; name: string; slug: string };

/** The garage the client entered through (/login/<slug> or the garage page); null after a plain /login. */
export async function resolveClientGarage(admin: SupabaseClient): Promise<ClientGarage | null> {
  const slug = (await cookies()).get(GARAGE_CONTEXT_COOKIE)?.value;
  if (!slug) return null;
  const { data } = await admin.from("garages").select("id, name, slug").eq("slug", slug).maybeSingle();
  return data;
}
