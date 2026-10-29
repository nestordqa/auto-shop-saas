import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizedDiagnosticOrder } from "@/lib/auth/diagnostic-order-access";
import { intakePhotoPrefix, intakeSchema } from "@/lib/intake";
import { notifyStatusChange } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Saves the intake form and checks the vehicle in (por_ingresar → ingresado). */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(orderId).success || !parsed.success) {
    return NextResponse.json({ error: parsed.error?.issues[0]?.message ?? "Revisa el formato de ingreso." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El formato de ingreso no está configurado." }, { status: 503 });

  const order = await getAuthorizedDiagnosticOrder(admin, user, orderId);
  if (!order) return NextResponse.json({ error: "La orden no pertenece a tu taller o no está asignada a tu perfil." }, { status: 403 });
  if (order.status !== "por_ingresar") return NextResponse.json({ error: "Este vehículo ya fue ingresado." }, { status: 409 });

  const input = parsed.data;
  const prefix = intakePhotoPrefix(order.garage_id, order.id);
  if (input.photos.some((photo) => !photo.key.startsWith(prefix))) {
    return NextResponse.json({ error: "Alguna foto no pertenece a esta orden." }, { status: 400 });
  }

  const { data: intake, error: intakeError } = await admin.from("vehicle_intakes").insert({
    order_id: order.id,
    mileage: input.mileage,
    fuel_level: input.fuelLevel,
    vin: input.vin,
    engine_number: input.engineNumber,
    has_registration: input.hasRegistration,
    has_insurance: input.hasInsurance,
    accessories: input.accessories,
    damages: input.damages,
    photos: input.photos,
    reported_issue: input.reportedIssue,
    observations: input.observations,
    delivered_by_name: input.deliveredByName,
    customer_signature: input.customerSignature,
    receiver_signature: input.receiverSignature,
    received_by: user.id,
  }).select("id").single();
  if (intakeError || !intake) {
    return NextResponse.json({ error: intakeError?.code === "23505" ? "Esta orden ya tiene un formato de ingreso." : "No se pudo guardar el formato de ingreso." }, { status: 400 });
  }

  const { error: statusError } = await admin.from("orders").update({ status: "ingresado" }).eq("id", order.id);
  if (statusError) {
    await admin.from("vehicle_intakes").delete().eq("id", intake.id);
    return NextResponse.json({ error: "No se pudo ingresar el vehículo." }, { status: 409 });
  }

  notifyStatusChange(order.id, "por_ingresar", "ingresado", { id: user.id, role: user.app_metadata.role });
  return NextResponse.json({ status: "ingresado" }, { status: 201 });
}
