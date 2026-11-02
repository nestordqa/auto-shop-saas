import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { branchSchema, createBranch } from "@/lib/branches-api";

export async function POST(request: Request, { params }: { params: Promise<{ garageId: string }> }) {
  const { garageId } = await params;
  const parsed = branchSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(garageId).success || !parsed.success) return NextResponse.json({ error: "Revisa el nombre y la dirección de la sucursal." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { data: garage } = await auth.admin.from("garages").select("id").eq("id", garageId).maybeSingle();
  if (!garage) return NextResponse.json({ error: "El taller no existe." }, { status: 404 });
  return createBranch(auth.admin, garageId, parsed.data);
}
