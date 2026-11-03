import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedDiagnosticOrder } from "@/lib/auth/diagnostic-order-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { OTHER_REPAIR, resolveRepairLabel } from "@/lib/repair-catalog";
import { INTERVENTION_TYPES } from "@/lib/vehicle-systems";

const createDiagnosticSchema = z.object({
  description: z.string().trim().min(3).max(1000),
  component: z.string().regex(/^[a-z0-9_]+$/).max(60).nullish(),
  /** Repair name written by the mechanic when choosing "Otro…". */
  componentLabel: z.string().trim().max(120).nullish(),
  interventionType: z.enum(INTERVENTION_TYPES).nullish(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const parsed = createDiagnosticSchema.safeParse(await request.json().catch(() => null));

  if (!z.uuid().safeParse(orderId).success || !parsed.success) {
    return NextResponse.json({ error: "Datos de diagnóstico inválidos." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El diagnóstico de órdenes no está configurado." }, { status: 503 });
  const authorizedOrder = await getAuthorizedDiagnosticOrder(admin, user, orderId);
  if (!authorizedOrder || authorizedOrder.status !== "ingresado") {
    return NextResponse.json({ error: "Solo puedes diagnosticar una orden ingresada de tu taller o asignada a tu perfil." }, { status: 403 });
  }

  const component = parsed.data.component ?? null;
  const label = component ? await resolveRepairLabel(admin, component, parsed.data.componentLabel) : null;
  if (component && !label) {
    return NextResponse.json({ error: component === OTHER_REPAIR ? "Escribe qué reparación es (opción «Otro…»)." : "Esa reparación no está en el catálogo." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("diagnostics")
    .insert({
      order_id: orderId,
      description: parsed.data.description,
      component,
      component_label: label,
      intervention_type: component ? parsed.data.interventionType ?? "reparacion" : null,
      created_by: user.id,
    })
    .select("id, description, price, is_completed, component, component_label, intervention_type")
    .single();

  if (error) {
    return NextResponse.json({ error: "No tienes permiso para añadir diagnósticos a esta orden." }, { status: 403 });
  }

  return NextResponse.json({
    diagnostic: {
      id: data.id,
      description: data.description,
      price: data.price,
      isCompleted: data.is_completed,
      component: data.component,
      componentLabel: data.component_label,
      interventionType: data.intervention_type,
    },
  }, { status: 201 });
}