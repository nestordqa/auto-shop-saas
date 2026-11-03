import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";

const signatureSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  position: z.string().trim().min(2, "Escribe tu cargo.").max(120),
  image: z.string().startsWith("data:image/png;base64,", "Dibuja tu firma.").max(300000, "La firma es demasiado grande."),
});

/** Each admin creates or replaces ONLY their own signature (one per admin). */
export async function PUT(request: Request) {
  const parsed = signatureSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa la firma." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { fullName, position, image } = parsed.data;
  const { error } = await auth.admin.from("admin_signatures").upsert({ admin_id: auth.user.id, full_name: fullName, position, image, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "No se pudo guardar la firma. ¿Ejecutaste la migración 038?" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
