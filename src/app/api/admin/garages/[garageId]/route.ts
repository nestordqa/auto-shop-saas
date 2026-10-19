import { NextResponse } from "next/server";
import { z } from "zod";

import { INTAKE_PHOTOS_BUCKET } from "@/lib/storage/intake-photos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Permanently deletes a garage with its orders, staff accounts and intake photos (admin only). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ garageId: string }> }) {
  const { garageId } = await params;
  if (!z.uuid().safeParse(garageId).success) return NextResponse.json({ error: "Taller inválido." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "admin") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La administración de talleres no está configurada." }, { status: 503 });

  // Collect photo paths before the intakes disappear with their orders.
  const { data: orders } = await admin.from("orders").select("id").eq("garage_id", garageId);
  const orderIds = (orders ?? []).map((order) => order.id);
  const { data: intakes } = orderIds.length
    ? await admin.from("vehicle_intakes").select("photos").in("order_id", orderIds)
    : { data: [] };
  const photoPaths = (intakes ?? []).flatMap((intake) => ((intake.photos ?? []) as { key: string }[]).map((photo) => photo.key));

  const { data: staffIds, error } = await admin.rpc("admin_delete_garage", { target_garage_id: garageId });
  if (error) {
    return NextResponse.json({ error: error.message === "Garage not found" ? "El taller no existe." : "No se pudo eliminar el taller." }, { status: 400 });
  }

  // Best effort: the garage is already gone, leftovers here do not block the admin.
  const cleanup = await Promise.allSettled([
    ...((staffIds ?? []) as string[]).map((id) => admin.auth.admin.deleteUser(id)),
    ...(photoPaths.length ? [admin.storage.from(INTAKE_PHOTOS_BUCKET).remove(photoPaths)] : []),
  ]);
  const failed = cleanup.filter((result) => result.status === "rejected" || (result.status === "fulfilled" && result.value.error)).length;

  return NextResponse.json({ success: true, removedStaff: (staffIds ?? []).length, cleanupFailures: failed });
}
