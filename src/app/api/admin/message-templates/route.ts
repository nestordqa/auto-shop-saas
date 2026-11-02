import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { DEFAULT_PITCHES, PITCH_KEYS } from "@/lib/prospect-pitch";

const templateSchema = z.object({
  key: z.enum(PITCH_KEYS as [string, ...string[]]),
  /** Empty body restores the built-in text. */
  body: z.string().trim().max(4000),
});

export async function PUT(request: Request) {
  const parsed = templateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El mensaje es demasiado largo." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { key, body } = parsed.data;
  const { error } = body && body !== DEFAULT_PITCHES[key as keyof typeof DEFAULT_PITCHES]
    ? await auth.admin.from("admin_message_templates").upsert({ key, body, updated_by: auth.user.id, updated_at: new Date().toISOString() })
    : await auth.admin.from("admin_message_templates").delete().eq("key", key);
  if (error) return NextResponse.json({ error: "No se pudo guardar el mensaje. ¿Ejecutaste la migración 030?" }, { status: 500 });
  return NextResponse.json({ success: true });
}
