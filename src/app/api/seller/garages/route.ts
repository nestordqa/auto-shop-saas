import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeSellerRequest } from "@/lib/auth/seller-api";
import { createOwnerAccount, garageFieldsSchema, insertGarage, newOwnerSchema } from "@/lib/garage-signup";
import { notifyAdminsGarageCreated, sellerName } from "@/lib/sellers";

/** A seller registers a garage: it always starts with the free trial and is attributed to them. */
const schema = garageFieldsSchema.extend(newOwnerSchema.shape).extend({
  temporaryPassword: z.string().min(8).max(72),
  prospectId: z.union([z.literal(""), z.uuid()]).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del taller y del administrador." }, { status: 400 });
  const auth = await authorizeSellerRequest();
  if (!auth.ok) return auth.response;
  const input = parsed.data;

  // Only their own prospect can be converted.
  let prospectId: string | null = null;
  if (input.prospectId) {
    const { data } = await auth.admin.from("garage_prospects").select("id").eq("id", input.prospectId).eq("seller_id", auth.seller.id).maybeSingle();
    prospectId = data?.id ?? null;
  }

  const owner = await createOwnerAccount(auth.admin, { ...input, password: input.temporaryPassword });
  if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: 400 });
  const result = await insertGarage(auth.admin, { ownerId: owner.id, fields: input, start: "trial", createdBy: auth.user.id, source: "seller", sellerId: auth.seller.id, couponCode: auth.seller.coupon_code, prospectId });
  if ("error" in result) {
    await auth.admin.auth.admin.deleteUser(owner.id);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  notifyAdminsGarageCreated(result.garage.name, { source: "seller", sellerName: sellerName(auth.seller) });
  return NextResponse.json({ success: true, garage: result.garage }, { status: 201 });
}
