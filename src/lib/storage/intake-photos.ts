import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Private Supabase Storage bucket created by migration 010. */
export const INTAKE_PHOTOS_BUCKET = "intake-photos";

export function isStorageConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function bucket() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase Storage is not configured.");
  return admin.storage.from(INTAKE_PHOTOS_BUCKET);
}

/** Signed URL the browser uses to PUT the file straight into the bucket (valid for 2 hours). */
export async function createUploadUrl(path: string) {
  const { data, error } = await bucket().createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("No upload URL");
  return data.signedUrl;
}

/** Short-lived read URLs for private photos, keyed by path. */
export async function createDownloadUrls(paths: string[]) {
  const result = new Map<string, string>();
  if (!paths.length) return result;
  const { data } = await bucket().createSignedUrls(paths, 3600);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) result.set(item.path, item.signedUrl);
  }
  return result;
}
