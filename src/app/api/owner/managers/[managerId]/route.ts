import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";

const updateSchema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ managerId: string }> }) {
  const { managerId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(managerId).success || !parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const auth = await authorizeStaffRequest({ ownerOnly: true, unavailable: "La administración del equipo no está configurada." });
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.admin
    .from("garage_managers")
    .update({ is_active: parsed.data.isActive })
    .eq("id", managerId)
    .eq("garage_id", auth.staff.garageId)
    .select("id")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "El encargado no pertenece a tu taller." }, { status: 404 });
  return NextResponse.json({ success: true });
}
