import { NextResponse } from "next/server";
import { z } from "zod";

import { createOwnerAccount, garageFieldsSchema, insertGarage, newOwnerSchema, startSchema } from "@/lib/garage-signup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const shared = garageFieldsSchema.extend({
  /** "trial" = free first month (default); a plan key = paid from today. */
  start: startSchema,
  prospectId: z.union([z.literal(""), z.uuid()]).optional(),
  /** Seller who brought this garage (optional). */
  sellerId: z.union([z.literal(""), z.uuid()]).optional(),
});

const garageSchema = z.discriminatedUnion("ownerMode", [
  shared.extend({ ownerMode: z.literal("existing"), ownerId: z.uuid() }),
  shared.extend(newOwnerSchema.shape).extend({ ownerMode: z.literal("new"), temporaryPassword: z.string().min(8).max(72) }),
]);

export async function POST(request: Request) {
  const parsed = garageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del taller y administrador." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "admin") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const input = parsed.data;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La creación de talleres no está configurada." }, { status: 503 });

  let ownerId: string;
  let createdOwner = false;
  if (input.ownerMode === "new") {
    const owner = await createOwnerAccount(admin, { ...input, password: input.temporaryPassword });
    if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: 400 });
    ownerId = owner.id;
    createdOwner = true;
  } else {
    const { data: owner } = await admin.from("profiles").select("id").eq("id", input.ownerId).eq("role", "garage_owner").maybeSingle();
    if (!owner) return NextResponse.json({ error: "El administrador no existe o ya no está disponible." }, { status: 400 });
    ownerId = owner.id;
  }

  let sellerId: string | null = null;
  if (input.sellerId) {
    const { data: seller } = await admin.from("sellers").select("id").eq("id", input.sellerId).maybeSingle();
    if (!seller) return NextResponse.json({ error: "El vendedor seleccionado no existe." }, { status: 400 });
    sellerId = seller.id;
  }

  const result = await insertGarage(admin, { ownerId, fields: input, start: input.start, createdBy: user.id, source: "admin", sellerId, prospectId: input.prospectId || null });
  if ("error" in result) {
    if (createdOwner) await admin.auth.admin.deleteUser(ownerId);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true, garage: result.garage }, { status: 201 });
}
