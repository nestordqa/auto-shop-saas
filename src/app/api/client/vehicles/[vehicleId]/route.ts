import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({ year: z.number().int().min(1900).max(new Date().getFullYear()), color: z.string().trim().min(2).max(50), plate: z.string().trim().min(3).max(20) });

/** The signed-in client's own vehicle, with the model it belongs to. */
async function ownVehicle(vehicleId: string) {
  if (!z.uuid().safeParse(vehicleId).success) return { error: NextResponse.json({ error: "Vehículo inválido." }, { status: 400 }) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata.role !== "client") return { error: NextResponse.json({ error: "Acceso restringido." }, { status: 403 }) };
  const admin = createAdminClient();
  if (!admin) return { error: NextResponse.json({ error: "La gestión de vehículos no está configurada." }, { status: 503 }) };
  const { data: vehicle } = await admin.from("vehicles").select("id, model_year_id").eq("id", vehicleId).eq("user_id", user.id).maybeSingle();
  if (!vehicle) return { error: NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 }) };
  return { admin, vehicle };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del vehículo." }, { status: 400 });
  const found = await ownVehicle((await params).vehicleId);
  if ("error" in found) return found.error;
  const { admin, vehicle } = found;

  const { data: current } = await admin.from("vehicle_model_years").select("model_id").eq("id", vehicle.model_year_id).maybeSingle();
  if (!current) return NextResponse.json({ error: "No se encontró el modelo del vehículo." }, { status: 400 });
  const { data: modelYear, error: yearError } = await admin.from("vehicle_model_years").upsert({ model_id: current.model_id, year: parsed.data.year, is_active: true }, { onConflict: "model_id,year" }).select("id").single();
  if (yearError || !modelYear) return NextResponse.json({ error: "No se pudo registrar el año del vehículo." }, { status: 400 });

  const { error } = await admin.from("vehicles").update({ model_year_id: modelYear.id, color: parsed.data.color, plate: parsed.data.plate.toUpperCase() }).eq("id", vehicle.id);
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Esa placa ya está registrada." : "No se pudo actualizar el vehículo." }, { status: 409 });
  return NextResponse.json({ ok: true });
}

/** Only vehicles that never had an order: the history belongs to the garages too. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  const found = await ownVehicle((await params).vehicleId);
  if ("error" in found) return found.error;
  const { admin, vehicle } = found;
  const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("vehicle_id", vehicle.id);
  if (count) return NextResponse.json({ error: "Este vehículo tiene citas o servicios registrados en un taller, así que no se puede eliminar. Escríbele a soporte si necesitas darlo de baja." }, { status: 409 });
  const { error } = await admin.from("vehicles").delete().eq("id", vehicle.id);
  if (error) return NextResponse.json({ error: "No se pudo eliminar el vehículo." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
