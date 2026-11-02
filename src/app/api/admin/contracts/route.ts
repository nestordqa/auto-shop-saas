import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { addDays, TRIAL_DAYS } from "@/lib/contracts";

const contractSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("trial"), garageId: z.uuid(), startDate: z.iso.date(), notes: z.string().trim().max(2000).optional() }),
  z.object({
    kind: z.literal("paid"),
    garageId: z.uuid(),
    startDate: z.iso.date(),
    billingCycle: z.enum(["weekly", "biweekly", "monthly"]),
    commissionPercent: z.coerce.number().min(0).max(100),
    notes: z.string().trim().max(2000).optional(),
  }),
]);

export async function POST(request: Request) {
  const parsed = contractSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del contrato." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { admin, user } = auth;
  const input = parsed.data;

  const { data: garage } = await admin.from("garages").select("id, owner_id").eq("id", input.garageId).maybeSingle();
  if (!garage) return NextResponse.json({ error: "El taller no existe." }, { status: 404 });

  // The new contract replaces the one in force; it ends the day before the new one starts.
  const { data: current } = await admin.from("contracts").select("id, start_date, end_date").eq("garage_id", garage.id).eq("status", "active").maybeSingle();
  if (current) {
    if (input.startDate <= current.start_date) return NextResponse.json({ error: "El nuevo contrato debe empezar después del contrato vigente." }, { status: 400 });
    const previousEnd = addDays(input.startDate, -1);
    const { error } = await admin.from("contracts").update({ status: "ended", end_date: current.end_date && current.end_date < previousEnd ? current.end_date : previousEnd }).eq("id", current.id);
    if (error) return NextResponse.json({ error: "No se pudo cerrar el contrato vigente." }, { status: 500 });
  }

  const { data, error } = await admin.from("contracts").insert({
    garage_id: garage.id,
    owner_id: garage.owner_id,
    kind: input.kind,
    start_date: input.startDate,
    notes: input.notes || null,
    created_by: user.id,
    ...(input.kind === "trial"
      ? { end_date: addDays(input.startDate, TRIAL_DAYS - 1), commission_percent: 0 }
      : { billing_cycle: input.billingCycle, commission_percent: input.commissionPercent }),
  }).select("id").single();

  if (error || !data) {
    if (current) await admin.from("contracts").update({ status: "active", end_date: current.end_date }).eq("id", current.id);
    return NextResponse.json({ error: "No se pudo crear el contrato." }, { status: 500 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
