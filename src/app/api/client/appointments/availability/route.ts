import { NextResponse } from "next/server";
import { z } from "zod";

import { appointmentIso } from "@/lib/appointments";
import { parseSchedule, scheduleSlots } from "@/lib/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUnavailableRanges, isBlocked, resolveBookingBranch } from "@/lib/unavailability";

const querySchema = z.object({
  garageId: z.uuid(),
  branchId: z.uuid().optional(),
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
  const { garageId, branchId: requestedBranch, date, timezoneOffset } = parsed.data;
  const { data: garage } = await admin.from("garages").select("id").eq("id", garageId).maybeSingle();
  if (!garage) return NextResponse.json({ error: "El taller no existe." }, { status: 404 });
  const branchId = await resolveBookingBranch(admin, garageId, requestedBranch);
  if (!branchId) return NextResponse.json({ error: "La sucursal no está disponible." }, { status: 404 });
  const { data: branch } = await admin.from("garage_branches").select("schedule").eq("id", branchId).single();
  const times = scheduleSlots(parseSchedule(branch?.schedule), date);
  if (!times.length) return NextResponse.json({ slots: [], closed: true });
  const start = appointmentIso(date, times[0], timezoneOffset);
  const end = appointmentIso(date, times.at(-1)!, timezoneOffset);
  const [{ data: orders }, blocked] = await Promise.all([
    admin.from("orders").select("appointment_date").eq("branch_id", branchId).gte("appointment_date", start).lte("appointment_date", end),
    getUnavailableRanges(admin, garageId, branchId, start, end),
  ]);
  const occupied = new Set((orders ?? []).map(({ appointment_date }) => new Date(appointment_date).getTime()));
  const now = Date.now();
  const slots = times.filter((time) => {
    const timestamp = new Date(appointmentIso(date, time, timezoneOffset)).getTime();
    return timestamp > now && !occupied.has(timestamp) && !isBlocked(blocked, timestamp);
  });
  return NextResponse.json({ slots });
}