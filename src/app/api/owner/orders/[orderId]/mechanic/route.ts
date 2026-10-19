import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";

const assignmentSchema = z.object({ mechanicId: z.uuid().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(orderId).success || !parsed.success) return NextResponse.json({ error: "Asignación inválida." }, { status: 400 });

  const auth = await authorizeStaffRequest({ unavailable: "La asignación de órdenes no está configurada." });
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const garage = { id: auth.staff.garageId };
  const { data: order } = await admin.from("orders").select("id, status").eq("id", orderId).eq("garage_id", garage.id).maybeSingle();
  if (!order) return NextResponse.json({ error: "La orden no pertenece a tu taller." }, { status: 404 });
  if (order.status === "entregado") return NextResponse.json({ error: "No se puede modificar una orden entregada." }, { status: 409 });

  if (parsed.data.mechanicId) {
    const { data: mechanic } = await admin.from("mechanics").select("id").eq("id", parsed.data.mechanicId).eq("garage_id", garage.id).eq("is_active", true).maybeSingle();
    if (!mechanic) return NextResponse.json({ error: "El mecánico no está activo en tu taller." }, { status: 400 });
  }

  const { error } = await admin.from("orders").update({ mechanic_id: parsed.data.mechanicId }).eq("id", order.id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar la asignación." }, { status: 400 });
  return NextResponse.json({ success: true });
}