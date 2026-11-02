import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";
import { notifyPlatformPaymentReported } from "@/lib/billing-notifications";
import { getGarageBillingStatus } from "@/lib/billing-status";
import { discountedAmount, PAYMENT_KINDS } from "@/lib/payments";
import { getPaymentMethods } from "@/lib/payments-data";

const reportSchema = z.object({
  contractId: z.uuid(),
  periodStart: z.iso.date(),
  methodKind: z.enum(PAYMENT_KINDS),
  reference: z.string().trim().max(120).optional(),
  proofKey: z.string().max(300),
});

/** Owner reports the payment of a closed period with TorkeOS's methods; an admin then checks it. */
export async function POST(request: Request) {
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del pago." }, { status: 400 });
  const auth = await authorizeStaffRequest({ ownerOnly: true, allowLocked: true, unavailable: "Los pagos no están configurados." });
  if (!auth.ok) return auth.response;
  const input = parsed.data;
  if (!input.proofKey.startsWith(`platform/${auth.staff.garageId}/`)) return NextResponse.json({ error: "Sube el comprobante de pago." }, { status: 400 });

  // The amount comes from the server's own calculation of that period, never from the browser.
  const status = await getGarageBillingStatus(auth.staff.garageId);
  const period = status.due.find((item) => item.contract.id === input.contractId && item.start === input.periodStart);
  if (!period) return NextResponse.json({ error: "Ese período no tiene un pago pendiente." }, { status: 400 });
  if (period.report?.status === "reported") return NextResponse.json({ error: "Ya reportaste este pago; lo estamos revisando." }, { status: 409 });
  const method = (await getPaymentMethods(auth.admin, null, { enabledOnly: true })).find((item) => item.kind === input.methodKind);
  if (!method) return NextResponse.json({ error: "Ese medio de pago ya no está disponible." }, { status: 400 });

  const amount = discountedAmount(period.amount, method.discountPercent);
  const { error } = await auth.admin.from("contract_payment_reports").insert({
    contract_id: period.contract.id,
    period_start: period.start,
    period_end: period.end,
    amount,
    method_kind: method.kind,
    reference: input.reference || null,
    proof_path: input.proofKey,
    reported_by: auth.user.id,
  });
  if (error?.code === "23505") return NextResponse.json({ error: "Ya reportaste este pago; lo estamos revisando." }, { status: 409 });
  if (error) return NextResponse.json({ error: "No se pudo registrar el pago. ¿Ejecutaste la migración 034?" }, { status: 500 });
  notifyPlatformPaymentReported(auth.staff.garageId, period.contract.id, amount);
  return NextResponse.json({ success: true }, { status: 201 });
}
