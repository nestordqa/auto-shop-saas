import { NextResponse } from "next/server";
import { z } from "zod";

import { MECHANIC_SPECIALTIES } from "@/lib/mechanics";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const mechanicSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().min(7).max(30),
  documentId: z.string().trim().min(4).max(30),
  temporaryPassword: z.string().min(8).max(72),
  specialty: z.enum(MECHANIC_SPECIALTIES),
});

export async function POST(request: Request) {
  const parsed = mechanicSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del mecánico." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "garage_owner") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La creación de usuarios no está configurada." }, { status: 503 });
  const { data: garage } = await admin.from("garages").select("id").eq("owner_id", user.id).maybeSingle();
  if (!garage) return NextResponse.json({ error: "Tu cuenta no tiene un taller asignado." }, { status: 403 });

  const input = parsed.data;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.temporaryPassword,
    email_confirm: true,
    app_metadata: { role: "mechanic" },
    user_metadata: { full_name: input.fullName, phone: input.phone },
  });
  if (authError || !authData.user) return NextResponse.json({ error: authError?.message ?? "No se pudo crear el usuario." }, { status: 400 });

  const profileId = authData.user.id;
  const { error: profileError } = await admin.from("profiles").update({
    full_name: input.fullName,
    phone: input.phone,
    document_id: input.documentId,
    role: "mechanic",
  }).eq("id", profileId).select("id").single();
  if (profileError) {
    await admin.auth.admin.deleteUser(profileId);
    return NextResponse.json({ error: "No se pudo sincronizar el perfil del mecánico." }, { status: 500 });
  }

  const { error: mechanicError } = await admin.from("mechanics").insert({
    profile_id: profileId,
    garage_id: garage.id,
    specialty: input.specialty,
  });
  if (mechanicError) {
    await admin.auth.admin.deleteUser(profileId);
    return NextResponse.json({ error: "No se pudo agregar el mecánico al taller." }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}