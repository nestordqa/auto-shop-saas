import { NextResponse } from "next/server";
import { z } from "zod";

import { phoneSchema } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const adminSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: phoneSchema,
  documentId: z.string().trim().min(4).max(30),
  temporaryPassword: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const parsed = adminSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del administrador." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "admin") return NextResponse.json({ error: "Solo un administrador puede crear administradores." }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La creación de usuarios no está configurada." }, { status: 503 });

  const input = parsed.data;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.temporaryPassword,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: input.fullName, phone: input.phone },
  });
  if (authError || !authData.user) return NextResponse.json({ error: authError?.message ?? "No se pudo crear el usuario." }, { status: 400 });

  const { error: profileError } = await admin.from("profiles").update({
    full_name: input.fullName,
    phone: input.phone,
    document_id: input.documentId,
    role: "admin",
  }).eq("id", authData.user.id).select("id").single();
  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: "No se pudo sincronizar el perfil del administrador." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
