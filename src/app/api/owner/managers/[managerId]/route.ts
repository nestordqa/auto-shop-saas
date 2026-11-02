import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest, resolveStaffBranch } from "@/lib/auth/garage-staff";

// Toggle the manager or move them to another branch (a manager works at exactly one).
const updateSchema = z.union([z.object({ isActive: z.boolean() }).strict(), z.object({ branchId: z.uuid() }).strict()]);

export async function PATCH(request: Request, { params }: { params: Promise<{ managerId: string }> }) {
  const { managerId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(managerId).success || !parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const auth = await authorizeStaffRequest({ ownerOnly: true, unavailable: "La administración del equipo no está configurada." });
  if (!auth.ok) return auth.response;

  let update: { is_active: boolean } | { branch_id: string };
  if ("branchId" in parsed.data) {
    const branchId = await resolveStaffBranch(auth.admin, auth.staff, parsed.data.branchId);
    if (!branchId) return NextResponse.json({ error: "La sucursal seleccionada no es válida." }, { status: 400 });
    update = { branch_id: branchId };
  } else update = { is_active: parsed.data.isActive };

  const { data, error } = await auth.admin
    .from("garage_managers")
    .update(update)
    .eq("id", managerId)
    .eq("garage_id", auth.staff.garageId)
    .select("id")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "El encargado no pertenece a tu taller." }, { status: 404 });
  return NextResponse.json({ success: true });
}
