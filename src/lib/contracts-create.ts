import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { addDays, TRIAL_DAYS, type BillingCycle } from "@/lib/contracts";
import { PLANS, type PlanKey } from "@/lib/plans";

export type NewContract =
  | { kind: "trial"; garageId: string; startDate: string; notes?: string; createdBy: string }
  | { kind: "paid"; garageId: string; startDate: string; plan: PlanKey; billingCycle: BillingCycle; notes?: string; createdBy: string };

/**
 * Issues a contract for a garage; the one in force ends the day before the new one starts.
 * Used by admins (any contract) and by owners choosing their plan once the trial ends.
 */
export async function createContract(admin: SupabaseClient, input: NewContract): Promise<{ id: string } | { error: string; status: number }> {
  const { data: garage } = await admin.from("garages").select("id, owner_id").eq("id", input.garageId).maybeSingle();
  if (!garage) return { error: "El taller no existe.", status: 404 };

  const { data: current } = await admin.from("contracts").select("id, start_date, end_date").eq("garage_id", garage.id).eq("status", "active").maybeSingle();
  if (current) {
    if (input.startDate <= current.start_date) return { error: "El nuevo contrato debe empezar después del contrato vigente.", status: 400 };
    const previousEnd = addDays(input.startDate, -1);
    const { error } = await admin.from("contracts").update({ status: "ended", end_date: current.end_date && current.end_date < previousEnd ? current.end_date : previousEnd }).eq("id", current.id);
    if (error) return { error: "No se pudo cerrar el contrato vigente.", status: 500 };
  }

  const plan = input.kind === "paid" ? PLANS[input.plan] : null;
  const { data, error } = await admin.from("contracts").insert({
    garage_id: garage.id,
    owner_id: garage.owner_id,
    kind: input.kind,
    start_date: input.startDate,
    notes: input.notes || null,
    created_by: input.createdBy,
    ...(!plan
      ? { end_date: addDays(input.startDate, TRIAL_DAYS - 1), commission_percent: 0 }
      // Only Pistón (commission) may settle weekly or biweekly; subscriptions are monthly.
      : { plan: plan.key, billing_cycle: plan.kind === "commission" && input.kind === "paid" ? input.billingCycle : "monthly", commission_percent: plan.kind === "commission" ? plan.percent : 0 }),
  }).select("id").single();

  if (error || !data) {
    if (current) await admin.from("contracts").update({ status: "active", end_date: current.end_date }).eq("id", current.id);
    return { error: "No se pudo crear el contrato.", status: 500 };
  }
  // Remember the plan on the garage so the next contract suggests it.
  if (plan) await admin.from("garages").update({ plan: plan.key }).eq("id", garage.id);
  return { id: data.id as string };
}
