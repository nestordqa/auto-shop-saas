import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

async function authorize() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  return { user, admin };
}

/**
 * Registers this device for the signed-in user. The endpoint is unique, so a shared device
 * always belongs to whoever is signed in now and never keeps receiving the previous user's alerts.
 */
export async function POST(request: Request) {
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  const { user, admin } = await authorize();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "El servidor no tiene SUPABASE_SECRET_KEY configurada." }, { status: 503 });

  const { error } = await admin.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "No se pudo activar las notificaciones." }, { status: 400 });
  return NextResponse.json({ success: true });
}

/** Removes this device (on logout or when the user turns notifications off). */
export async function DELETE(request: Request) {
  const parsed = z.object({ endpoint: z.url().max(1000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  const { user, admin } = await authorize();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "El servidor no tiene SUPABASE_SECRET_KEY configurada." }, { status: 503 });
  await admin.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint).eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
