import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";

import { getAuthorizedDiagnosticOrder } from "@/lib/auth/diagnostic-order-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const updateDiagnosticSchema = z.object({
  isCompleted: z.boolean(),
});

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function canChangeDiagnostic(supabase: SupabaseClient, user: User, diagnosticId: string) {
  const { data: diagnostic } = await supabase.from("diagnostics").select("order_id").eq("id", diagnosticId).maybeSingle();
  if (!diagnostic) return false;
  const order = await getAuthorizedDiagnosticOrder(supabase, user, diagnostic.order_id);
  return order?.status === "ingresado";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ diagnosticId: string }> },
) {
  const { diagnosticId } = await params;
  const parsed = updateDiagnosticSchema.safeParse(await request.json().catch(() => null));

  if (!z.uuid().safeParse(diagnosticId).success || !parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { user } = await getAuthenticatedClient();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El diagnóstico de órdenes no está configurado." }, { status: 503 });
  if (!await canChangeDiagnostic(admin, user, diagnosticId)) {
    return NextResponse.json({ error: "El diagnóstico no pertenece a una orden activa asignada." }, { status: 403 });
  }

  const { error } = await admin
    .from("diagnostics")
    .update({ is_completed: parsed.data.isCompleted })
    .eq("id", diagnosticId);

  if (error) return NextResponse.json({ error: "No se pudo actualizar el diagnóstico." }, { status: 403 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ diagnosticId: string }> },
) {
  const { diagnosticId } = await params;
  if (!z.uuid().safeParse(diagnosticId).success) {
    return NextResponse.json({ error: "Diagnóstico inválido." }, { status: 400 });
  }

  const { user } = await getAuthenticatedClient();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El diagnóstico de órdenes no está configurado." }, { status: 503 });
  if (!await canChangeDiagnostic(admin, user, diagnosticId)) {
    return NextResponse.json({ error: "El diagnóstico no pertenece a una orden activa asignada." }, { status: 403 });
  }

  const { error } = await admin.from("diagnostics").delete().eq("id", diagnosticId);
  if (error) return NextResponse.json({ error: "No se pudo eliminar el diagnóstico." }, { status: 403 });
  return NextResponse.json({ success: true });
}