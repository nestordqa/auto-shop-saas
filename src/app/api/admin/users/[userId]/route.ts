import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";

const updateSchema = z.object({ active: z.boolean() });

/** Deactivating bans the Auth account, so it can no longer sign in; the data is kept and it can be reactivated. */
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { userId } = await params;
  if (userId === auth.user.id) return NextResponse.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 400 });

  const { error } = await auth.admin.auth.admin.updateUserById(userId, { ban_duration: parsed.data.active ? "none" : "876000h" });
  if (error) return NextResponse.json({ error: "No se pudo actualizar el usuario." }, { status: 500 });
  return NextResponse.json({ success: true });
}

/**
 * Deletes the Auth account; the profile and what hangs only from it (vehicles, mechanic/manager seats, push) cascade.
 * Refused when it would erase a garage's history: owners of a garage, clients with orders, mechanics with diagnostics.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const { userId } = await params;
  if (userId === auth.user.id) return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });

  const [{ data: garage }, { data: vehicles }, { count: diagnostics }] = await Promise.all([
    admin.from("garages").select("name").eq("owner_id", userId).maybeSingle(),
    admin.from("vehicles").select("id").eq("user_id", userId),
    admin.from("diagnostics").select("id", { count: "exact", head: true }).eq("created_by", userId),
  ]);
  if (garage) return NextResponse.json({ error: `Es el administrador de ${garage.name}. Elimina el taller primero o desactiva al usuario.` }, { status: 409 });
  if (diagnostics) return NextResponse.json({ error: "Ha registrado diagnósticos en órdenes. Desactívalo para conservar el historial." }, { status: 409 });
  const vehicleIds = (vehicles ?? []).map((vehicle) => vehicle.id);
  if (vehicleIds.length) {
    const { count: orders } = await admin.from("orders").select("id", { count: "exact", head: true }).in("vehicle_id", vehicleIds);
    if (orders) return NextResponse.json({ error: "Sus vehículos tienen órdenes en talleres. Desactívalo para conservar el historial." }, { status: 409 });
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: "No se pudo eliminar el usuario. Puede tener datos asociados; desactívalo en su lugar." }, { status: 500 });
  return NextResponse.json({ success: true });
}
