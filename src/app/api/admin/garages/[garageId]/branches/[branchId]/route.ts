import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { branchUpdateSchema, updateBranch } from "@/lib/branches-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ garageId: string; branchId: string }> }) {
  const { garageId, branchId } = await params;
  const parsed = branchUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(garageId).success || !z.uuid().safeParse(branchId).success || !parsed.success) return NextResponse.json({ error: "Revisa los datos de la sucursal." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  return updateBranch(auth.admin, garageId, branchId, parsed.data);
}
