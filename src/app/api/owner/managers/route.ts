import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";

const managerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().min(7).max(30),
  documentId: z.string().trim().min(4).max(30),
  temporaryPassword: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const parsed = managerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del encargado." }, { status: 400 });

  const auth = await authorizeStaffRequest({ ownerOnly: true, unavailable: "La creación de usuarios no está configurada." });
  if (!auth.ok) return auth.response;
  const { admin, staff } = auth;

  const input = parsed.data;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.temporaryPassword,
    email_confirm: true,
    app_metadata: { role: "garage_manager" },
    user_metadata: { full_name: input.fullName, phone: input.phone },
  });
  if (authError || !authData.user) return NextResponse.json({ error: authError?.message ?? "No se pudo crear el usuario." }, { status: 400 });

  const profileId = authData.user.id;
  const { error: profileError } = await admin.from("profiles").update({
    full_name: input.fullName,
    phone: input.phone,
    document_id: input.documentId,
    role: "garage_manager",
  }).eq("id", profileId).select("id").single();
  if (profileError) {
    await admin.auth.admin.deleteUser(profileId);
    return NextResponse.json({ error: "No se pudo sincronizar el perfil del encargado." }, { status: 500 });
  }

  const { error: managerError } = await admin.from("garage_managers").insert({ profile_id: profileId, garage_id: staff.garageId });
  if (managerError) {
    await admin.auth.admin.deleteUser(profileId);
    return NextResponse.json({ error: "No se pudo agregar el encargado al taller." }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
