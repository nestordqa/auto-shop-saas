import { NextResponse } from "next/server";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";

export async function DELETE(_request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const auth = await authorizeStaffRequest({ unavailable: "La agenda no está configurada." });
  if (!auth.ok) return auth.response;
  const { blockId } = await params;
  let query = auth.admin.from("garage_unavailability").delete({ count: "exact" }).eq("id", blockId).eq("garage_id", auth.staff.garageId);
  // Managers only remove blocks of their own branch.
  if (auth.staff.branchId) query = query.eq("branch_id", auth.staff.branchId);
  const { error, count } = await query;
  if (error) return NextResponse.json({ error: "No se pudo eliminar el bloqueo." }, { status: 500 });
  if (!count) return NextResponse.json({ error: "El bloqueo no existe." }, { status: 404 });
  return NextResponse.json({ success: true });
}
