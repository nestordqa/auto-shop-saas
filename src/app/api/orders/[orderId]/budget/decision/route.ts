import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const decisionSchema = z.object({ approved: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(orderId).success || !parsed.success) {
    return NextResponse.json({ error: "Decisión inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La gestión de presupuestos no está configurada." }, { status: 503 });
  const { data: order } = await admin.from("orders").select("id, garage_id, vehicle_id, status").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "La orden no existe." }, { status: 404 });
  if (order.status !== "presupuestado") {
    return NextResponse.json({ error: "Este presupuesto ya fue decidido o no está publicado." }, { status: 409 });
  }

  const role = user.app_metadata.role;
  let authorized = role === "admin";
  if (role === "garage_owner") {
    const { data: garage } = await admin.from("garages").select("id").eq("id", order.garage_id).eq("owner_id", user.id).maybeSingle();
    authorized = Boolean(garage);
  } else if (role === "client") {
    const { data: vehicle } = await admin.from("vehicles").select("id").eq("id", order.vehicle_id).eq("user_id", user.id).maybeSingle();
    authorized = Boolean(vehicle);
  }
  if (!authorized) return NextResponse.json({ error: "No puedes decidir este presupuesto." }, { status: 403 });

  const { error } = await admin.from("budgets").update({ approved: parsed.data.approved }).eq("order_id", order.id);
  if (error) return NextResponse.json({ error: "No se pudo registrar la decisión del presupuesto." }, { status: 409 });

  return NextResponse.json({ status: parsed.data.approved ? "en_reparacion" : "presupuesto_rechazado" });
}