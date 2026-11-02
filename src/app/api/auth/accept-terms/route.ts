import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/terms";

/** Records that the signed-in user accepted the current terms. */
export async function POST(request: Request) {
  const parsed = z.object({ accepted: z.literal(true) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Debes aceptar los términos y condiciones." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El servicio no está configurado." }, { status: 503 });
  const { error } = await admin.from("profiles").update({ terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "No se pudo registrar la aceptación." }, { status: 500 });
  return NextResponse.json({ success: true });
}
