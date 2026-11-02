import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest, resolveStaffBranch } from "@/lib/auth/garage-staff";
import { weekScheduleSchema } from "@/lib/schedule";

/** Opening hours of a branch: the owner for any branch, a manager only for theirs. */
export async function PUT(request: Request, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const parsed = z.object({ schedule: weekScheduleSchema }).safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(branchId).success || !parsed.success) return NextResponse.json({ error: "Revisa el horario: el cierre debe ser después de la apertura." }, { status: 400 });
  const auth = await authorizeStaffRequest({ unavailable: "La agenda no está configurada." });
  if (!auth.ok) return auth.response;
  if (await resolveStaffBranch(auth.admin, auth.staff, branchId) !== branchId) return NextResponse.json({ error: "No puedes editar el horario de esta sucursal." }, { status: 403 });
  const { error } = await auth.admin.from("garage_branches").update({ schedule: parsed.data.schedule }).eq("id", branchId);
  if (error) return NextResponse.json({ error: "No se pudo guardar el horario." }, { status: 500 });
  return NextResponse.json({ success: true });
}
