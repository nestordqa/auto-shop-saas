import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest, resolveStaffBranch } from "@/lib/auth/garage-staff";

// Toggle (owner, or the manager of the mechanic's branch) or move to another branch (owner only).
const updateSchema = z.union([z.object({ isActive: z.boolean() }).strict(), z.object({ branchId: z.uuid() }).strict()]);

export async function PATCH(request: Request, { params }: { params: Promise<{ mechanicId: string }> }) {
  const { mechanicId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(mechanicId).success || !parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const auth = await authorizeStaffRequest({ unavailable: "La administración del equipo no está configurada." });
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const garage = { id: auth.staff.garageId };

  let update: { is_active: boolean } | { branch_id: string };
  if ("branchId" in parsed.data) {
    if (auth.staff.role !== "garage_owner") return NextResponse.json({ error: "Solo el owner puede mover mecánicos entre sucursales." }, { status: 403 });
    const branchId = await resolveStaffBranch(admin, auth.staff, parsed.data.branchId);
    if (!branchId) return NextResponse.json({ error: "La sucursal seleccionada no es válida." }, { status: 400 });
    update = { branch_id: branchId };
  } else update = { is_active: parsed.data.isActive };

  let query = admin.from("mechanics").update(update).eq("id", mechanicId).eq("garage_id", garage.id);
  if (auth.staff.branchId) query = query.eq("branch_id", auth.staff.branchId);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "El mecánico no pertenece a tu taller." }, { status: 404 });
  return NextResponse.json({ success: true });
}