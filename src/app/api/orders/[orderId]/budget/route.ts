import { NextResponse } from "next/server";
import { z } from "zod";

import { getStaffGarage } from "@/lib/auth/garage-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const budgetSchema = z.object({
  includesParts: z.boolean(),
  diagnostics: z.array(z.object({
    id: z.uuid(),
    price: z.number().min(0).max(9999999999.99),
    partBrand: z.string().trim().max(80).nullish(),
  })).min(1),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const parsed = budgetSchema.safeParse(await request.json().catch(() => null));

  if (!z.uuid().safeParse(orderId).success || !parsed.success) {
    return NextResponse.json({ error: "El presupuesto contiene datos inválidos." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La gestión de presupuestos no está configurada." }, { status: 503 });
  const role = user.app_metadata.role;
  if (!["admin", "garage_owner", "garage_manager"].includes(role)) {
    return NextResponse.json({ error: "Solo el taller o un admin puede guardar presupuestos." }, { status: 403 });
  }
  const { data: order } = await admin.from("orders").select("id, garage_id").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "La orden no existe." }, { status: 404 });
  if (role !== "admin") {
    if ((await getStaffGarage(admin, user))?.garageId !== order.garage_id) return NextResponse.json({ error: "La orden no pertenece a tu taller." }, { status: 403 });
  }
  const diagnosticIds = parsed.data.diagnostics.map(({ id }) => id);
  const { data: orderDiagnostics } = await admin.from("diagnostics").select("id").eq("order_id", orderId).in("id", diagnosticIds);
  if (orderDiagnostics?.length !== diagnosticIds.length) {
    return NextResponse.json({ error: "El presupuesto contiene diagnósticos ajenos a la orden." }, { status: 400 });
  }

  const priceUpdates = await Promise.all(parsed.data.diagnostics.map(({ id, price, partBrand }) =>
    admin.from("diagnostics").update({ price, part_brand: partBrand || null }).eq("id", id).eq("order_id", orderId),
  ));

  if (priceUpdates.some(({ error }) => error)) {
    return NextResponse.json({ error: "No se pudieron actualizar todos los precios." }, { status: 403 });
  }

  const { error: budgetError } = await admin.from("budgets").upsert({
    order_id: orderId,
    includes_parts: parsed.data.includesParts,
    approved: null,
  }, { onConflict: "order_id" });

  if (budgetError) {
    return NextResponse.json({ error: "No se pudo guardar el presupuesto." }, { status: 403 });
  }

  const { error: statusError } = await admin
    .from("orders")
    .update({ status: "presupuestado" })
    .eq("id", orderId);

  if (statusError) {
    return NextResponse.json({ error: "El cambio de estado no respeta el ciclo de la orden." }, { status: 409 });
  }

  const { data: budget } = await admin
    .from("budgets")
    .select("total_amount")
    .eq("order_id", orderId)
    .single();

  return NextResponse.json({ totalAmount: budget?.total_amount ?? 0, status: "presupuestado" });
}