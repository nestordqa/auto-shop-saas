import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";
import { hasNoAppAccess } from "@/lib/client-accounts";

const accessSchema = z.object({ email: z.email().max(160), password: z.string().min(8).max(72) });

/** Gives app access (real email + password) to a client the garage registered without email. */
export async function POST(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const parsed = accessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa el correo y la contraseña (mínimo 8 caracteres)." }, { status: 400 });

  const auth = await authorizeStaffRequest({ unavailable: "La gestión de clientes no está configurada." });
  if (!auth.ok) return auth.response;
  const { admin, staff } = auth;

  // Only clients with a vehicle that has been serviced by this garage (and branch, for managers).
  const { data: vehicles } = await admin.from("vehicles").select("id").eq("user_id", clientId);
  const vehicleIds = (vehicles ?? []).map(({ id }) => id);
  let orders = vehicleIds.length ? admin.from("orders").select("id").eq("garage_id", staff.garageId).in("vehicle_id", vehicleIds).limit(1) : null;
  if (orders && staff.branchId) orders = orders.eq("branch_id", staff.branchId);
  const { data: related } = orders ? await orders : { data: [] };
  if (!related?.length) return NextResponse.json({ error: "Ese cliente no pertenece a tu taller." }, { status: 404 });

  const { data: account } = await admin.auth.admin.getUserById(clientId);
  if (!account.user || account.user.app_metadata.role !== "client") return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  if (!hasNoAppAccess(account.user.email)) return NextResponse.json({ error: "Este cliente ya tiene acceso a la app." }, { status: 409 });

  const { error } = await admin.auth.admin.updateUserById(clientId, { email: parsed.data.email, password: parsed.data.password, email_confirm: true });
  if (error) {
    const exists = error.code === "email_exists" || /already|registered/i.test(error.message);
    return NextResponse.json({ error: exists ? "Ese correo ya tiene una cuenta en TorkeOS." : "No se pudo dar acceso al cliente." }, { status: exists ? 409 : 400 });
  }
  return NextResponse.json({ success: true });
}
