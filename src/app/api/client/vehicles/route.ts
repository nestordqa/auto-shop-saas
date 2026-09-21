import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const vehicleSchema = z.object({ modelId: z.uuid(), year: z.number().int().min(1900).max(new Date().getFullYear()), color: z.string().trim().min(2).max(50), plate: z.string().trim().min(3).max(20) });

export async function POST(request: Request) {
  const parsed = vehicleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del vehículo." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata.role !== "client") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "El registro de vehículos no está configurado." }, { status: 503 });
  const { data: model } = await admin.from("vehicle_models").select("id").eq("id", parsed.data.modelId).eq("is_active", true).maybeSingle();
  if (!model) return NextResponse.json({ error: "El modelo seleccionado no está disponible." }, { status: 400 });
  const { data: modelYear, error: yearError } = await admin.from("vehicle_model_years").upsert({ model_id: model.id, year: parsed.data.year, is_active: true }, { onConflict: "model_id,year" }).select("id").single();
  if (yearError || !modelYear) return NextResponse.json({ error: "No se pudo registrar el año del vehículo." }, { status: 400 });
  const { data: vehicle, error } = await admin.from("vehicles").insert({ user_id: user.id, model_year_id: modelYear.id, color: parsed.data.color, plate: parsed.data.plate.toUpperCase() }).select("id").single();
  if (error || !vehicle) return NextResponse.json({ error: error?.code === "23505" ? "Esa placa ya está registrada." : "No se pudo registrar el vehículo." }, { status: 409 });
  return NextResponse.json({ vehicleId: vehicle.id }, { status: 201 });
}