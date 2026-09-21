import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/domain";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  nextPath: z.string().optional(),
});

const roleRoutes: Record<AppRole, string> = {
  admin: "/dashboard/admin",
  garage_owner: "/dashboard/owner",
  mechanic: "/dashboard/mechanic",
  client: "/dashboard/client",
};

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de acceso inválidos." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });

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
  return NextResponse.json({ redirectTo: role === "client" && safeNextPath ? safeNextPath : roleRoutes[role] });
}