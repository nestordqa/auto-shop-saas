import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const forgotSchema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const parsed = forgotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 400 });
  const supabase = await createClient();
  const origin = new URL(request.url).origin;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${origin}/auth/confirm?next=/reset-password` });
  // Same answer whether or not the account exists, so the form cannot be used to probe emails.
  if (error && error.status === 429) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }, { status: 429 });
  return NextResponse.json({ ok: true });
}
