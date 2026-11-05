import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { todayDate } from "@/lib/contracts";
import { payoutSchema } from "@/lib/sellers-schema";

type Params = { params: Promise<{ sellerId: string }> };

/** Records a payment TorkeOS made to the seller (their commissions). */
export async function POST(request: Request, { params }: Params) {
  const parsed = payoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Indica un monto válido." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { sellerId } = await params;
  const { error } = await auth.admin.from("seller_payouts").insert({ seller_id: sellerId, amount: parsed.data.amount, reference: parsed.data.reference, note: parsed.data.note, paid_on: parsed.data.paidOn ?? todayDate(), recorded_by: auth.user.id });
  if (error) return NextResponse.json({ error: "No se pudo registrar el pago." }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  const parsed = z.object({ payoutId: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pago no válido." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { sellerId } = await params;
  const { error } = await auth.admin.from("seller_payouts").delete().eq("id", parsed.data.payoutId).eq("seller_id", sellerId);
  if (error) return NextResponse.json({ error: "No se pudo eliminar el pago." }, { status: 500 });
  return NextResponse.json({ success: true });
}
