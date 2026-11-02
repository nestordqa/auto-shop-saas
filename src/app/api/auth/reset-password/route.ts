import { NextResponse } from "next/server";
import { z } from "zod";

import { homeForRole } from "@/lib/auth/role-routes";
import { createClient } from "@/lib/supabase/server";

const resetSchema = z.object({ password: z.string().min(8).max(72) });

export async function POST(request: Request) {
  const parsed = resetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La contraseña debe tener entre 8 y 72 caracteres." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "El enlace expiró. Solicita uno nuevo." }, { status: 401 });
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message = error.code === "same_password" ? "La nueva contraseña debe ser distinta a la anterior." : "No se pudo actualizar la contraseña.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ redirectTo: homeForRole(user.app_metadata.role) ?? "/login" });
}
