import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ mechanicId: string }> }) {
  const { mechanicId } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(mechanicId).success || !parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "garage_owner") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La administración del equipo no está configurada." }, { status: 503 });
  const { data: garage } = await admin.from("garages").select("id").eq("owner_id", user.id).maybeSingle();
  if (!garage) return NextResponse.json({ error: "Tu cuenta no tiene un taller asignado." }, { status: 403 });

  const { data, error } = await admin.from("mechanics").update({ is_active: parsed.data.isActive }).eq("id", mechanicId).eq("garage_id", garage.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "El mecánico no pertenece a tu taller." }, { status: 404 });
  return NextResponse.json({ success: true });
}