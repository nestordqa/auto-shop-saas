import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { prospectRow, prospectSchema } from "@/lib/prospects-schema";

export async function POST(request: Request) {
  const parsed = prospectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del prospecto (nombre, teléfono o correo)." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { error } = await auth.admin.from("garage_prospects").insert({ ...prospectRow(parsed.data), created_by: auth.user.id });
  if (error) return NextResponse.json({ error: "No se pudo guardar el prospecto." }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
