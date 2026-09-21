import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedDiagnosticOrder } from "@/lib/auth/diagnostic-order-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const createDiagnosticSchema = z.object({
  description: z.string().trim().min(3).max(240),
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

  const { data, error } = await admin
    .from("diagnostics")
    .insert({
      order_id: orderId,
      description: parsed.data.description,
      created_by: user.id,
    })
    .select("id, description, price, is_completed")
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
    },
  }, { status: 201 });
}