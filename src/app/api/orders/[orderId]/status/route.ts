import { NextResponse } from "next/server";
import { z } from "zod";

import { getStaffGarage } from "@/lib/auth/garage-staff";
import { notifyStatusChange } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES, type OrderStatus } from "@/types/domain";

const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

/** Mirrors the mechanic rule in validate_order_transition: this route writes with the service key, so the trigger cannot see the role. */
const MECHANIC_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  por_ingresar: ["ingresado"],
  ingresado: ["diagnosticado"],
  en_reparacion: ["en_prueba"],
  en_prueba: ["en_reparacion", "listo_para_entregar"],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));

  if (!z.uuid().safeParse(orderId).success || !parsed.success) {
    return NextResponse.json({ error: "Estado u orden inválidos." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La actualización de órdenes no está configurada." }, { status: 503 });
  const role = user.app_metadata.role;
  const { data: order } = await admin.from("orders").select("id, garage_id, mechanic_id, status").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "La orden no existe." }, { status: 404 });

  let authorized = role === "admin";
  if (role === "garage_owner" || role === "garage_manager") {
    authorized = (await getStaffGarage(admin, user))?.garageId === order.garage_id;
  } else if (role === "mechanic") {
    const { data: mechanic } = await admin.from("mechanics").select("id").eq("profile_id", user.id).eq("id", order.mechanic_id).eq("is_active", true).maybeSingle();
    authorized = Boolean(mechanic);
  }
  if (!authorized) return NextResponse.json({ error: "La orden no está asignada a tu perfil o taller." }, { status: 403 });
  if (role === "mechanic" && !MECHANIC_TRANSITIONS[order.status as OrderStatus]?.includes(parsed.data.status)) {
    return NextResponse.json({ error: "Este cambio de estado lo realiza el taller." }, { status: 403 });
  }

  if (parsed.data.status === "ingresado") {
    const { data: intake } = await admin.from("vehicle_intakes").select("id").eq("order_id", orderId).maybeSingle();
    if (!intake) return NextResponse.json({ error: "Completa el formato de ingreso antes de recibir el vehículo." }, { status: 409 });
  }

  if (parsed.data.status === "diagnosticado") {
    const { count } = await admin.from("diagnostics").select("id", { count: "exact", head: true }).eq("order_id", orderId);
    if (!count) return NextResponse.json({ error: "Registra al menos un hallazgo antes de finalizar el diagnóstico." }, { status: 409 });
  }

  const { error } = await admin
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", orderId);

  if (error) {
    return NextResponse.json(
      { error: "No tienes permiso o la transición de estado no es válida." },
      { status: 409 },
    );
  }

  notifyStatusChange(orderId, order.status as OrderStatus, parsed.data.status, { id: user.id, role });
  return NextResponse.json({ status: parsed.data.status });
}