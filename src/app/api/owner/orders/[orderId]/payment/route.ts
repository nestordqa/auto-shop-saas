import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";
import { notifyPaymentResolved } from "@/lib/notifications";

const actionSchema = z.object({ action: z.enum(["confirm", "reject", "receive"]), note: z.string().trim().max(300).optional() });
const transitions = { confirm: ["reported", "confirmed"], reject: ["reported", "rejected"], receive: ["pay_at_garage", "received"] } as const;

/** Owner only: confirms or rejects an online payment, or marks the in-person one as received. */
export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(orderId).success || !parsed.success) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  const auth = await authorizeStaffRequest({ ownerOnly: true, unavailable: "Los pagos no están configurados." });
  if (!auth.ok) return auth.response;
  const { data: order } = await auth.admin.from("orders").select("id").eq("id", orderId).eq("garage_id", auth.staff.garageId).maybeSingle();
  if (!order) return NextResponse.json({ error: "La orden no pertenece a tu taller." }, { status: 404 });

  const [from, to] = transitions[parsed.data.action];
  const { data: payment, error } = await auth.admin.from("order_payments")
    .update({ status: to, resolved_by: auth.user.id, resolved_at: new Date().toISOString(), note: parsed.data.note || null })
    .eq("order_id", order.id).eq("status", from).select("id").maybeSingle();
  if (error || !payment) return NextResponse.json({ error: "El pago ya no está pendiente de esta acción. Recarga la página." }, { status: 409 });
  notifyPaymentResolved(order.id, to, parsed.data.note || null, { id: auth.user.id, role: "garage_owner" });
  return NextResponse.json({ success: true });
}
