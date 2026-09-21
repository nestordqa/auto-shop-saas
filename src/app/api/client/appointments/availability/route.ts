import { NextResponse } from "next/server";
import { z } from "zod";

import { appointmentIso, APPOINTMENT_TIMES } from "@/lib/appointments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  garageId: z.uuid(),
  date: z.iso.date(),
  timezoneOffset: z.coerce.number().int().min(-840).max(840),
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Consulta de disponibilidad inválida." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata.role !== "client") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La agenda no está configurada." }, { status: 503 });
  const { garageId, date, timezoneOffset } = parsed.data;
  const { data: garage } = await admin.from("garages").select("id").eq("id", garageId).maybeSingle();
  if (!garage) return NextResponse.json({ error: "El taller no existe." }, { status: 404 });
  const start = appointmentIso(date, "08:00", timezoneOffset);
  const end = appointmentIso(date, "18:00", timezoneOffset);
  const { data: orders } = await admin.from("orders").select("appointment_date").eq("garage_id", garageId).gte("appointment_date", start).lte("appointment_date", end);
  const occupied = new Set((orders ?? []).map(({ appointment_date }) => new Date(appointment_date).getTime()));
  const now = Date.now();
  const slots = APPOINTMENT_TIMES.filter((time) => {
    const timestamp = new Date(appointmentIso(date, time, timezoneOffset)).getTime();
    return timestamp > now && !occupied.has(timestamp);
  });
  return NextResponse.json({ slots });
}