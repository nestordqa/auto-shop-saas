import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminSignature = { adminId: string; fullName: string; position: string; image: string; updatedAt: string };

export const DEFAULT_SIGNATURE_SETTING = "default_signature_admin_id";

/** Every admin signature plus which one is the default. Never throws (before migration 038 it is empty). */
export async function getSignatures(admin: SupabaseClient): Promise<{ signatures: AdminSignature[]; defaultAdminId: string | null }> {
  const [{ data: rows }, { data: setting }] = await Promise.all([
    admin.from("admin_signatures").select("admin_id, full_name, position, image, updated_at").order("full_name"),
    admin.from("app_settings").select("value").eq("key", DEFAULT_SIGNATURE_SETTING).maybeSingle(),
  ]);
  const signatures = (rows ?? []).map((row) => ({ adminId: row.admin_id, fullName: row.full_name, position: row.position, image: row.image, updatedAt: row.updated_at }));
  const chosen = setting?.value && signatures.some((signature) => signature.adminId === setting.value) ? setting.value : null;
  // No explicit choice yet: the only signature (if there is just one) acts as the default.
  return { signatures, defaultAdminId: chosen ?? (signatures.length === 1 ? signatures[0].adminId : null) };
}

/** The signature printed on new contracts, or null when none is configured. */
export async function getDefaultSignature(admin: SupabaseClient) {
  const { signatures, defaultAdminId } = await getSignatures(admin);
  return signatures.find((signature) => signature.adminId === defaultAdminId) ?? null;
}
