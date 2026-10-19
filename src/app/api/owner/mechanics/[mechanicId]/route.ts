import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";

const updateSchema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ mechanicId: string }> }) {
  const { mechanicId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(mechanicId).success || !parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const auth = await authorizeStaffRequest({ unavailable: "La administración del equipo no está configurada." });
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const garage = { id: auth.staff.garageId };

  const { data, error } = await admin.from("mechanics").update({ is_active: parsed.data.isActive }).eq("id", mechanicId).eq("garage_id", garage.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "El mecánico no pertenece a tu taller." }, { status: 404 });
  return NextResponse.json({ success: true });
}