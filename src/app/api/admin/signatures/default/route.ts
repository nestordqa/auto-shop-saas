import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { DEFAULT_SIGNATURE_SETTING } from "@/lib/signatures";

/** Any admin picks which admin signature is printed on new contracts. */
export async function PUT(request: Request) {
  const parsed = z.object({ adminId: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { data: signature } = await auth.admin.from("admin_signatures").select("admin_id").eq("admin_id", parsed.data.adminId).maybeSingle();
  if (!signature) return NextResponse.json({ error: "Esa firma no existe." }, { status: 404 });
  const { error } = await auth.admin.from("app_settings").upsert({ key: DEFAULT_SIGNATURE_SETTING, value: parsed.data.adminId, updated_by: auth.user.id, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "No se pudo guardar la firma predeterminada." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
