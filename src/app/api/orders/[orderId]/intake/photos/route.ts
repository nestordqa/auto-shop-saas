import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedDiagnosticOrder } from "@/lib/auth/diagnostic-order-access";
import { INTAKE_PHOTO_TYPES, MAX_INTAKE_PHOTO_BYTES, intakePhotoPrefix } from "@/lib/intake";
import { createUploadUrl, isStorageConfigured } from "@/lib/storage/intake-photos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uploadSchema = z.object({
  contentType: z.enum(INTAKE_PHOTO_TYPES),
  size: z.number().int().positive().max(MAX_INTAKE_PHOTO_BYTES),
});

const extensions: Record<(typeof INTAKE_PHOTO_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Returns a short-lived presigned URL so the browser uploads the photo straight to Supabase Storage. */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const parsed = uploadSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(orderId).success || !parsed.success) {
    return NextResponse.json({ error: "Solo se permiten fotos JPG, PNG o WebP de hasta 8 MB." }, { status: 400 });
  }
  if (!isStorageConfigured()) return NextResponse.json({ error: "El almacenamiento de fotos no está configurado." }, { status: 503 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El formato de ingreso no está configurado." }, { status: 503 });

  const order = await getAuthorizedDiagnosticOrder(admin, user, orderId);
  if (!order || !["por_ingresar", "ingresado"].includes(order.status)) {
    return NextResponse.json({ error: "No puedes adjuntar fotos a esta orden." }, { status: 403 });
  }

  const key = `${intakePhotoPrefix(order.garage_id, order.id)}${randomUUID()}.${extensions[parsed.data.contentType]}`;
  const uploadUrl = await createUploadUrl(key).catch(() => null);
  if (!uploadUrl) return NextResponse.json({ error: "No se pudo preparar la subida. Verifica que exista el bucket intake-photos." }, { status: 503 });
  return NextResponse.json({ key, uploadUrl });
}
