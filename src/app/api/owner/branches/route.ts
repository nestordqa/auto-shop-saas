import { NextResponse } from "next/server";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";
import { branchSchema, createBranch } from "@/lib/branches-api";

export async function POST(request: Request) {
  const parsed = branchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa el nombre y la dirección de la sucursal." }, { status: 400 });
  const auth = await authorizeStaffRequest({ ownerOnly: true, unavailable: "La gestión de sucursales no está configurada." });
  if (!auth.ok) return auth.response;
  return createBranch(auth.admin, auth.staff.garageId, parsed.data);
}
