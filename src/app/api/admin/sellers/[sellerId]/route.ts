import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { sellerRow, sellerUpdateSchema } from "@/lib/sellers-schema";

type Params = { params: Promise<{ sellerId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const parsed = sellerUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del vendedor (un vendedor por cupón necesita un código válido)." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { sellerId } = await params;
  const row = sellerRow(parsed.data);
  const { data: seller, error } = await auth.admin.from("sellers").update(row).eq("id", sellerId).select("profile_id").maybeSingle();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Ese cupón ya está en uso." : "No se pudo actualizar el vendedor." }, { status: error.code === "23505" ? 409 : 500 });
  if (!seller) return NextResponse.json({ error: "El vendedor no existe." }, { status: 404 });
  await auth.admin.from("profiles").update({ full_name: `${row.first_name} ${row.last_name}`, phone: row.phone }).eq("id", seller.profile_id);
  // An inactive seller cannot sign in.
  await auth.admin.auth.admin.updateUserById(seller.profile_id, { ban_duration: row.is_active ? "none" : "876000h" });
  return NextResponse.json({ success: true });
}
