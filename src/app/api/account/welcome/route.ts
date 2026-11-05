import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user saw the first-login welcome: it is not shown again. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "No disponible." }, { status: 503 });
  const { error } = await admin.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, show_welcome: false } });
  if (error) return NextResponse.json({ error: "No se pudo guardar." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
