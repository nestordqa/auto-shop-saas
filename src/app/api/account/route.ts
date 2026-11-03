import { NextResponse } from "next/server";
import { z } from "zod";

import { phoneSchema } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre completo.").max(120),
  phone: phoneSchema,
  phone2: z.union([z.literal(""), phoneSchema]).optional(),
  documentId: z.string().trim().max(30).optional(),
});

/** Any signed-in user edits their own personal data (email and role stay as they are). */
export async function PATCH(request: Request) {
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa tus datos." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La configuración de cuentas no está disponible." }, { status: 503 });

  const { fullName, phone, phone2, documentId } = parsed.data;
  const { error } = await admin.from("profiles").update({ full_name: fullName, phone, phone_2: phone2 || null, document_id: documentId || null }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "No se pudieron guardar tus datos." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
