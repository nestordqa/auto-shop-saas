import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";
import { paymentMethodRow, paymentMethodsError, paymentMethodsSchema } from "@/lib/payments-data";

/** Saves the garage payment methods (owner only). */
export async function PUT(request: Request) {
  const parsed = z.object({ methods: paymentMethodsSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos: el descuento debe estar entre 0 y 100% y los campos no pueden ser tan largos." }, { status: 400 });
  const auth = await authorizeStaffRequest({ ownerOnly: true, unavailable: "Los métodos de pago no están configurados." });
  if (!auth.ok) return auth.response;
  const invalid = paymentMethodsError(parsed.data.methods);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const rows = parsed.data.methods.map((method) => ({ ...paymentMethodRow(method), garage_id: auth.staff.garageId }));
  const { error } = await auth.admin.from("garage_payment_methods").upsert(rows, { onConflict: "garage_id,kind" });
  if (error) return NextResponse.json({ error: "No se pudieron guardar los métodos de pago. ¿Ejecutaste la migración 031?" }, { status: 500 });
  return NextResponse.json({ success: true });
}
