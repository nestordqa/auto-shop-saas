import { NextResponse } from "next/server";
import { z } from "zod";

import { phoneSchema } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/terms";

const registerSchema = z.object({ fullName: z.string().trim().min(2).max(120), email: z.email(), phone: phoneSchema, documentId: z.string().trim().min(4).max(30), password: z.string().min(8).max(72), acceptTerms: z.literal("on"), nextPath: z.string().optional() });

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.some((issue) => issue.path[0] === "acceptTerms") ? "Debes aceptar los términos y condiciones." : "Revisa los datos de tu cuenta." }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El registro no está configurado." }, { status: 503 });
  const input = parsed.data;
  const { data, error } = await admin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true, app_metadata: { role: "client" }, user_metadata: { full_name: input.fullName, phone: input.phone } });
  if (error || !data.user) return NextResponse.json({ error: error?.message ?? "No se pudo crear la cuenta." }, { status: 400 });
  const { error: profileError } = await admin.from("profiles").update({ full_name: input.fullName, phone: input.phone, document_id: input.documentId, role: "client", terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION }).eq("id", data.user.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "No se pudo completar el perfil." }, { status: 500 });
  }
  const supabase = await createClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (loginError) return NextResponse.json({ error: "La cuenta fue creada. Inicia sesión para continuar." }, { status: 201 });
  const safeNextPath = input.nextPath?.startsWith("/") && !input.nextPath.startsWith("//") ? input.nextPath : "/dashboard/client";
  return NextResponse.json({ redirectTo: safeNextPath }, { status: 201 });
}