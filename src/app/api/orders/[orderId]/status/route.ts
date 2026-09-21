import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES } from "@/types/domain";

const statusSchema = z.object({ status: z.enum(ORDER_STATUSES) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));

  if (!z.uuid().safeParse(orderId).success || !parsed.success) {
    return NextResponse.json({ error: "Estado u orden inválidos." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La actualización de órdenes no está configurada." }, { status: 503 });
  const role = user.app_metadata.role;
  const { data: order } = await admin.from("orders").select("id, garage_id, mechanic_id").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "La orden no existe." }, { status: 404 });

  let authorized = role === "admin";
  if (role === "garage_owner") {
    const { data: garage } = await admin.from("garages").select("id").eq("id", order.garage_id).eq("owner_id", user.id).maybeSingle();
    authorized = Boolean(garage);
  } else if (role === "mechanic") {
    const { data: mechanic } = await admin.from("mechanics").select("id").eq("profile_id", user.id).eq("id", order.mechanic_id).eq("is_active", true).maybeSingle();
    authorized = Boolean(mechanic);
  }
  if (!authorized) return NextResponse.json({ error: "La orden no está asignada a tu perfil o taller." }, { status: 403 });

  const { error } = await admin
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", orderId);

  if (error) {
    return NextResponse.json(
      { error: "No tienes permiso o la transición de estado no es válida." },
      { status: 409 },
    );
  }

  return NextResponse.json({ status: parsed.data.status });
}