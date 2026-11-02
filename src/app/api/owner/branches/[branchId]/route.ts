import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";
import { branchUpdateSchema, updateBranch } from "@/lib/branches-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const parsed = branchUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(branchId).success || !parsed.success) return NextResponse.json({ error: "Revisa los datos de la sucursal." }, { status: 400 });
  const auth = await authorizeStaffRequest({ ownerOnly: true, unavailable: "La gestión de sucursales no está configurada." });
  if (!auth.ok) return auth.response;
  return updateBranch(auth.admin, auth.staff.garageId, branchId, parsed.data);
}
