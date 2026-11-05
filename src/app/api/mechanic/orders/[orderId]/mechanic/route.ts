import { NextResponse } from "next/server";
import { z } from "zod";

import { getReceptionMechanic } from "@/lib/auth/diagnostic-order-access";
import { notifyMechanicAssigned } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const assignmentSchema = z.object({ mechanicId: z.uuid().nullable() });

/** A reception mechanic assigns the repair of an order of their branch to a mechanic of that branch (themselves included). */
export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(orderId).success || !parsed.success) return NextResponse.json({ error: "Asignación inválida." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "mechanic") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La asignación de órdenes no está configurada." }, { status: 503 });
  const reception = await getReceptionMechanic(admin, user.id);
  if (!reception) return NextResponse.json({ error: "Solo un mecánico de recepción puede asignar mecánicos." }, { status: 403 });

  const { data: order } = await admin.from("orders").select("id, status, mechanic_id").eq("id", orderId).eq("garage_id", reception.garage_id).eq("branch_id", reception.branch_id).maybeSingle();
  if (!order) return NextResponse.json({ error: "La orden no pertenece a tu sucursal." }, { status: 404 });
  if (order.status === "entregado") return NextResponse.json({ error: "No se puede modificar una orden entregada." }, { status: 409 });

  if (parsed.data.mechanicId) {
    const { data: mechanic } = await admin.from("mechanics").select("id").eq("id", parsed.data.mechanicId).eq("garage_id", reception.garage_id).eq("branch_id", reception.branch_id).eq("is_active", true).maybeSingle();
    if (!mechanic) return NextResponse.json({ error: "El mecánico no está activo en tu sucursal." }, { status: 400 });
  }

  const { error } = await admin.from("orders").update({ mechanic_id: parsed.data.mechanicId }).eq("id", order.id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar la asignación." }, { status: 400 });
  if (parsed.data.mechanicId && parsed.data.mechanicId !== order.mechanic_id) notifyMechanicAssigned(order.id, parsed.data.mechanicId, { id: user.id, role: "mechanic" });
  return NextResponse.json({ success: true });
}
