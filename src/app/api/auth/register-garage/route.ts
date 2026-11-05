import { NextResponse } from "next/server";
import { z } from "zod";

import { createOwnerAccount, garageFieldsSchema, insertGarage, newOwnerSchema, normalizeCoupon, sellerForCoupon } from "@/lib/garage-signup";
import { notifyAdminsGarageCreated, sellerName } from "@/lib/sellers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Public self sign-up of a garage: owner account + garage + free trial, optionally with a seller's coupon. */
const schema = garageFieldsSchema.extend(newOwnerSchema.shape).extend({
  password: z.string().min(8).max(72),
  coupon: z.string().trim().max(30).optional(),
  acceptTerms: z.literal("on"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.some((issue) => issue.path[0] === "acceptTerms") ? "Debes aceptar los términos y condiciones." : "Revisa los datos del taller y del administrador." }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El registro no está configurado." }, { status: 503 });
  const input = parsed.data;

  const coupon = normalizeCoupon(input.coupon);
  const seller = await sellerForCoupon(admin, coupon);
  if (coupon && !seller) return NextResponse.json({ error: "El cupón no es válido. Revísalo o déjalo vacío." }, { status: 400 });

  const owner = await createOwnerAccount(admin, { ...input, acceptedTerms: true });
  if ("error" in owner) return NextResponse.json({ error: owner.error === "Ya existe una cuenta con ese correo." ? "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña." : owner.error }, { status: 400 });
  const result = await insertGarage(admin, { ownerId: owner.id, fields: input, start: "trial", createdBy: owner.id, source: "self", sellerId: seller?.id ?? null, couponCode: seller ? coupon : null });
  if ("error" in result) {
    await admin.auth.admin.deleteUser(owner.id);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  notifyAdminsGarageCreated(result.garage.name, { source: "self", sellerName: seller ? sellerName(seller) : null });

  const supabase = await createClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({ email: input.ownerEmail, password: input.password });
  if (loginError) return NextResponse.json({ error: "Tu taller fue creado. Inicia sesión para continuar." }, { status: 201 });
  return NextResponse.json({ redirectTo: "/dashboard/owner" }, { status: 201 });
}
