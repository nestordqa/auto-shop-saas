import { NextResponse } from "next/server";
import { z } from "zod";

import { appointmentIso, GARAGE_TIMEZONE_OFFSET } from "@/lib/appointments";
import { authorizeStaffRequest, resolveStaffBranch } from "@/lib/auth/garage-staff";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const blockSchema = z.object({
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  allDay: z.boolean(),
  startTime: time.optional(),
  endTime: time.optional(),
  reason: z.string().trim().max(120).optional(),
  branchId: z.union([z.literal(""), z.uuid()]).optional(),
});

function nextDay(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

/** Blocks a time range (garage time) so clients cannot book appointments in it. */
export async function POST(request: Request) {
  const parsed = blockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa las fechas del bloqueo." }, { status: 400 });
  const auth = await authorizeStaffRequest({ unavailable: "La agenda no está configurada." });
  if (!auth.ok) return auth.response;
  const input = parsed.data;
  if (!input.allDay && (!input.startTime || !input.endTime)) return NextResponse.json({ error: "Indica la hora de inicio y de fin." }, { status: 400 });

  const startsAt = appointmentIso(input.startDate, input.allDay ? "00:00" : input.startTime!, GARAGE_TIMEZONE_OFFSET);
  const endsAt = input.allDay ? appointmentIso(nextDay(input.endDate), "00:00", GARAGE_TIMEZONE_OFFSET) : appointmentIso(input.endDate, input.endTime!, GARAGE_TIMEZONE_OFFSET);
  if (endsAt <= startsAt) return NextResponse.json({ error: "El fin debe ser posterior al inicio." }, { status: 400 });
  if (new Date(endsAt).getTime() <= Date.now()) return NextResponse.json({ error: "El bloqueo ya terminó; elige fechas futuras." }, { status: 400 });

  // Owners may block the whole garage (no branch) or one branch; managers only their own branch.
  const branchId = input.branchId || auth.staff.branchId ? await resolveStaffBranch(auth.admin, auth.staff, input.branchId || null) : null;
  if ((input.branchId || auth.staff.branchId) && !branchId) return NextResponse.json({ error: "La sucursal seleccionada no es válida." }, { status: 400 });

  let appointmentsQuery = auth.admin.from("orders").select("id", { count: "exact", head: true }).eq("garage_id", auth.staff.garageId).eq("status", "por_ingresar").gte("appointment_date", startsAt).lt("appointment_date", endsAt);
  if (branchId) appointmentsQuery = appointmentsQuery.eq("branch_id", branchId);
  const { count: appointments } = await appointmentsQuery;
  const { error } = await auth.admin.from("garage_unavailability").insert({ garage_id: auth.staff.garageId, branch_id: branchId, starts_at: startsAt, ends_at: endsAt, reason: input.reason || null, created_by: auth.user.id });
  if (error) return NextResponse.json({ error: "No se pudo guardar el bloqueo." }, { status: 500 });
  return NextResponse.json({ success: true, existingAppointments: appointments ?? 0 }, { status: 201 });
}
