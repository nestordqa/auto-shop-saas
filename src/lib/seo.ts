import "server-only";

import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://torkeos.com").replace(/\/$/, "");

export const noIndex = { index: false, follow: false } as const;

export const getPublicGarage = cache(async (slug: string) => {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("garages").select("id, name, address, map_location, slug, updated_at").eq("slug", slug).maybeSingle();
  return data;
});

export async function getPublicGarages() {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("garages").select("slug, updated_at").order("updated_at", { ascending: false }).limit(45000);
  if (error) throw new Error(`No se pudieron cargar los talleres para el sitemap: ${error.message}`);
  return data ?? [];
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
