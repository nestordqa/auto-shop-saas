import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Escribe tu contraseña actual."),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").max(72),
});

/** Changes the signed-in user's password after checking the current one. */
export async function POST(request: Request) {
  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  // Checked on a throwaway client so the session cookies of this request are not touched.
  const verifier = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await verifier.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
  if (signInError) return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return NextResponse.json({ error: error.code === "same_password" ? "La nueva contraseña debe ser distinta a la actual." : "No se pudo cambiar la contraseña." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
