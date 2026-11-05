import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { sellerCreateSchema, sellerRow } from "@/lib/sellers-schema";

/** Creates the seller's login (role "seller") and their seller record. */
export async function POST(request: Request) {
  const parsed = sellerCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.path[0] === "couponCode" ? "Un vendedor por cupón necesita un código válido (3 a 30 letras, números o guiones)." : "Revisa los datos del vendedor." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const input = parsed.data;
  const fullName = `${input.firstName} ${input.lastName}`;

  if (input.couponCode) {
    const { data: taken } = await auth.admin.from("sellers").select("id").eq("coupon_code", input.couponCode).maybeSingle();
    if (taken) return NextResponse.json({ error: "Ese cupón ya está en uso." }, { status: 409 });
  }

  const { data, error } = await auth.admin.auth.admin.createUser({
    email: input.email,
    password: input.temporaryPassword,
    email_confirm: true,
    app_metadata: { role: "seller" },
    user_metadata: { full_name: fullName, phone: input.phone },
  });
  if (error || !data.user) {
    const exists = error && (error.code === "email_exists" || /already|registered/i.test(error.message));
    return NextResponse.json({ error: exists ? "Ya existe una cuenta con ese correo." : "No se pudo crear la cuenta del vendedor." }, { status: 400 });
  }
  const userId = data.user.id;
  const { error: profileError } = await auth.admin.from("profiles").update({ full_name: fullName, phone: input.phone, role: "seller" }).eq("id", userId);
  const { data: seller, error: sellerError } = profileError
    ? { data: null, error: profileError }
    : await auth.admin.from("sellers").insert({ ...sellerRow(input), profile_id: userId, created_by: auth.user.id }).select("id").single();
  if (sellerError || !seller) {
    await auth.admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "No se pudo crear el vendedor. ¿Ejecutaste las migraciones 041 y 042?" }, { status: 500 });
  }
  return NextResponse.json({ success: true, sellerId: seller.id }, { status: 201 });
}
