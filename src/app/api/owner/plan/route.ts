import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";
import { notifyPlanChosen } from "@/lib/billing-notifications";
import { getGarageBillingStatus } from "@/lib/billing-status";
import { todayDate } from "@/lib/contracts";
import { createContract } from "@/lib/contracts-create";
import { PLAN_KEYS, PLANS } from "@/lib/plans";

const planSchema = z.object({ plan: z.enum(PLAN_KEYS), billingCycle: z.enum(["weekly", "biweekly", "monthly"]).default("monthly") });

/** Owner picks a plan once the free trial is over: a paid contract starts today. */
export async function POST(request: Request) {
  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Elige un plan válido." }, { status: 400 });
  const auth = await authorizeStaffRequest({ ownerOnly: true, allowLocked: true, unavailable: "Los planes no están configurados." });
  if (!auth.ok) return auth.response;
  const status = await getGarageBillingStatus(auth.staff.garageId);
  if (!status.trialExpired) return NextResponse.json({ error: "Tu taller ya tiene un plan vigente. Para cambiarlo, escríbenos a soporte." }, { status: 409 });
  const result = await createContract(auth.admin, { kind: "paid", garageId: auth.staff.garageId, startDate: todayDate(), plan: parsed.data.plan, billingCycle: parsed.data.billingCycle, notes: "Plan elegido por el administrador al terminar la prueba.", createdBy: auth.user.id });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  notifyPlanChosen(auth.staff.garageId, result.id, PLANS[parsed.data.plan].name);
  return NextResponse.json({ success: true }, { status: 201 });
}
