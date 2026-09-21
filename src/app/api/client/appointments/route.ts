import { NextResponse } from "next/server";
import { z } from "zod";

import { appointmentIso } from "@/lib/appointments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const appointmentSchema = z.object({
  garageId: z.uuid(),
  vehicleId: z.uuid(),
  date: z.iso.date(),
  time: z.string().regex(/^(0[8-9]|1[0-7]):(00|30)$|^18:00$/),
  timezoneOffset: z.number().int().min(-840).max(840),
});

export async function POST(request: Request) {
  const parsed = appointmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos de la cita." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata.role !== "client") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La agenda no está configurada." }, { status: 503 });
  const { garageId, vehicleId, date, time, timezoneOffset } = parsed.data;
  const appointmentDate = appointmentIso(date, time, timezoneOffset);
  if (new Date(appointmentDate).getTime() <= Date.now()) return NextResponse.json({ error: "Selecciona un horario futuro." }, { status: 400 });
  const [{ data: garage }, { data: vehicle }] = await Promise.all([
    admin.from("garages").select("id").eq("id", garageId).maybeSingle(),
    admin.from("vehicles").select("id").eq("id", vehicleId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!garage || !vehicle) return NextResponse.json({ error: "El taller o vehículo seleccionado no es válido." }, { status: 400 });
  const { data: order, error } = await admin.from("orders").insert({ garage_id: garage.id, vehicle_id: vehicle.id, mechanic_id: null, appointment_date: appointmentDate }).select("id").single();
  if (error?.code === "23505") return NextResponse.json({ error: "Ese horario acaba de ser reservado. Selecciona otro." }, { status: 409 });
  if (error || !order) return NextResponse.json({ error: "No se pudo agendar la cita." }, { status: 400 });
  return NextResponse.json({ orderId: order.id }, { status: 201 });
}