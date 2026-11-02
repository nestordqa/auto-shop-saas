import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientPayableOrder } from "@/lib/auth/client-order-access";
import { notifyPaymentReported } from "@/lib/notifications";
import { canPayOrder, discountedAmount, PAYMENT_KINDS } from "@/lib/payments";
import { getPaymentMethods } from "@/lib/payments-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const paymentSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("online"), methodKind: z.enum(PAYMENT_KINDS), reference: z.string().trim().max(120).optional(), proofKey: z.string().max(300) }),
  z.object({ mode: z.literal("at_garage") }),
]);

/** Client reports an online payment (with proof) or says they will pay at the garage. */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(orderId).success || !parsed.success) return NextResponse.json({ error: "Revisa los datos del pago." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata.role !== "client") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Los pagos no están configurados." }, { status: 503 });
  const order = await getClientPayableOrder(admin, user.id, orderId);
  if (!order || !canPayOrder(order.status, order.budgetApproved)) return NextResponse.json({ error: "Esta orden todavía no se puede pagar." }, { status: 403 });

  const input = parsed.data;
  let row: Record<string, unknown> = { order_id: order.id, base_amount: order.total, reported_by: user.id };
  if (input.mode === "online") {
    // The proof must have been uploaded for this very order.
    if (!input.proofKey.startsWith(`${order.garageId}/${order.id}/`)) return NextResponse.json({ error: "Sube el comprobante de pago." }, { status: 400 });
    const method = (await getPaymentMethods(admin, order.garageId, { enabledOnly: true })).find((item) => item.kind === input.methodKind);
    if (!method) return NextResponse.json({ error: "El taller ya no acepta ese método de pago." }, { status: 400 });
    row = { ...row, status: "reported", method_kind: method.kind, discount_percent: method.discountPercent, amount: discountedAmount(order.total, method.discountPercent), reference: input.reference || null, proof_path: input.proofKey };
  } else {
    row = { ...row, status: "pay_at_garage", amount: order.total };
  }
  const { error } = await admin.from("order_payments").insert(row);
  if (error?.code === "23505") return NextResponse.json({ error: "Esta orden ya tiene un pago registrado." }, { status: 409 });
  if (error) return NextResponse.json({ error: "No se pudo registrar el pago." }, { status: 500 });
  notifyPaymentReported(order.id, input.mode === "online", { id: user.id, role: "client" });
  return NextResponse.json({ success: true }, { status: 201 });
}
