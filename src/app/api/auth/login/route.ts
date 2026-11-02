import { NextResponse } from "next/server";
import { z } from "zod";

import { roleRoutes } from "@/lib/auth/role-routes";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/domain";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  nextPath: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de acceso inválidos." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });

  if (error?.code === "user_banned") {
    return NextResponse.json({ error: "Tu cuenta está desactivada. Contacta al administrador." }, { status: 403 });
  }

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos." },
      { status: 401 },
    );
  }

  const role = data.user.app_metadata.role as AppRole | undefined;

  if (!role || !(role in roleRoutes)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "El usuario no tiene un rol válido en Auth app_metadata." },
      { status: 403 },
    );
  }

  const nextPath = parsed.data.nextPath;
  const safeNextPath = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : undefined;
  // Clients go back to the garage page they came from; anyone can come back to a contract PDF link.
  const allowNext = safeNextPath && (role === "client" || safeNextPath.startsWith("/api/contracts/"));
  return NextResponse.json({ redirectTo: allowNext ? safeNextPath : roleRoutes[role] });
}