import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { INTAKE_COLUMNS, mapIntakeRow, type VehicleIntake } from "@/lib/intake";
import { createDownloadUrls, isStorageConfigured } from "@/lib/storage/intake-photos";

async function withPhotoUrls(intake: VehicleIntake) {
  if (!intake.photos.length || !isStorageConfigured()) return intake;
  const urls = await createDownloadUrls(intake.photos.map((photo) => photo.key)).catch(() => new Map<string, string>());
  return { ...intake, photos: intake.photos.map((photo) => ({ ...photo, url: urls.get(photo.key) ?? null })) };
}

export async function getOrderIntakes(dataClient: SupabaseClient, orderIds: string[]) {
  const result = new Map<string, VehicleIntake>();
  if (!orderIds.length) return result;

  const { data: rows } = await dataClient.from("vehicle_intakes").select(INTAKE_COLUMNS).in("order_id", orderIds);
  if (!rows?.length) return result;

  const receiverIds = [...new Set(rows.map((row) => row.received_by).filter((id): id is string => Boolean(id)))];
  const { data: receivers } = receiverIds.length
    ? await dataClient.from("profiles").select("id, full_name").in("id", receiverIds)
    : { data: [] };
  const receiverName = new Map((receivers ?? []).map((profile) => [profile.id, profile.full_name as string]));

  await Promise.all(rows.map(async (row) => {
    result.set(row.order_id, await withPhotoUrls(mapIntakeRow(row, row.received_by ? receiverName.get(row.received_by) ?? null : null)));
  }));
  return result;
}

export async function getOrderIntake(dataClient: SupabaseClient, orderId: string) {
  return (await getOrderIntakes(dataClient, [orderId])).get(orderId) ?? null;
}
