import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { PROSPECT_STATUSES } from "@/lib/prospects";
import { prospectRow, prospectSchema } from "@/lib/prospects-schema";

type Params = { params: Promise<{ prospectId: string }> };

/** Full edit, or just `{ status }` for the quick status change in the table. */
const updateSchema = z.union([z.object({ status: z.enum(PROSPECT_STATUSES) }).strict(), prospectSchema]);

export async function PATCH(request: Request, { params }: Params) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del prospecto." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { prospectId } = await params;
  const values = "name" in parsed.data ? prospectRow(parsed.data) : { status: parsed.data.status };
  const { error, count } = await auth.admin.from("garage_prospects").update(values, { count: "exact" }).eq("id", prospectId);
  if (error) return NextResponse.json({ error: "No se pudo actualizar el prospecto." }, { status: 500 });
  if (!count) return NextResponse.json({ error: "El prospecto no existe." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { prospectId } = await params;
  const { error } = await auth.admin.from("garage_prospects").delete().eq("id", prospectId);
  if (error) return NextResponse.json({ error: "No se pudo eliminar el prospecto." }, { status: 500 });
  return NextResponse.json({ success: true });
}
