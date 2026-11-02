import "server-only";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** For admin API routes: the signed-in admin and a service client, or the error response to return. */
export async function authorizeAdminRequest() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Sesión no válida." }, { status: 401 }) };
  if (user.app_metadata.role !== "admin") return { ok: false as const, response: NextResponse.json({ error: "Solo un administrador puede hacer esto." }, { status: 403 }) };
  const admin = createAdminClient();
  if (!admin) return { ok: false as const, response: NextResponse.json({ error: "Configura SUPABASE_SECRET_KEY." }, { status: 503 }) };
  return { ok: true as const, user, admin };
}
