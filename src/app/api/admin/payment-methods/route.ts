import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { paymentMethodRow, paymentMethodsError, paymentMethodsSchema } from "@/lib/payments-data";

/** Saves TorkeOS's own payment methods: where garages pay their plan. */
export async function PUT(request: Request) {
  const parsed = z.object({ methods: paymentMethodsSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos: el descuento debe estar entre 0 y 100% y los campos no pueden ser tan largos." }, { status: 400 });
  const invalid = paymentMethodsError(parsed.data.methods);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { error } = await auth.admin.from("platform_payment_methods").upsert(parsed.data.methods.map((method) => ({ ...paymentMethodRow(method), updated_at: new Date().toISOString() })), { onConflict: "kind" });
  if (error) return NextResponse.json({ error: "No se pudieron guardar los medios de pago. ¿Ejecutaste la migración 034?" }, { status: 500 });
  return NextResponse.json({ success: true });
}
