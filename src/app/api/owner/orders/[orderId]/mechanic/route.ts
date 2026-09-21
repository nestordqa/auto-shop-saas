import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const assignmentSchema = z.object({ mechanicId: z.uuid().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(orderId).success || !parsed.success) return NextResponse.json({ error: "Asignación inválida." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "garage_owner") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La asignación de órdenes no está configurada." }, { status: 503 });
  const { data: garage } = await admin.from("garages").select("id").eq("owner_id", user.id).maybeSingle();
  if (!garage) return NextResponse.json({ error: "Tu cuenta no tiene un taller asignado." }, { status: 403 });
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