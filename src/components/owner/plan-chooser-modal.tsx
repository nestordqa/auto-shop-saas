"use client";

import { Check, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CYCLE_LABELS, type BillingCycle } from "@/lib/contracts";
import { EXTRA_VEHICLE_FEE, PLAN_KEYS, PLANS, RATE_NOTE, type PlanKey } from "@/lib/plans";

/** Shown to the owner once the free trial ended: the free plan is gone, they pick the one that fits (no way to dismiss it). */
export function PlanChooserModal({ garageName, suggested, extraBranchFee }: { garageName: string; suggested: PlanKey; extraBranchFee: number }) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanKey>(suggested);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const selected = PLANS[plan];

  async function choose() {
    setPending(true);
    setError(undefined);
    const response = await fetch("/api/owner/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, billingCycle: cycle }) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo activar el plan.");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end bg-black/70 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="plan-chooser-title">
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-lg bg-white sm:max-w-2xl sm:rounded-lg">
        <div className="border-b border-stone-200 p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#d9341d]"><Sparkles size={15} /> Tu mes de prueba terminó</p>
          <h2 id="plan-chooser-title" className="mt-2 font-display text-3xl font-bold">Elige el plan para {garageName}</h2>
          <p className="mt-1 text-sm text-stone-600">El plan gratuito ya no está disponible. Elige el que se ajuste a tu taller; podrás cambiarlo más adelante escribiéndonos.</p>
        </div>
        <div className="grid gap-3 p-5">
          {PLAN_KEYS.map((key) => {
            const item = PLANS[key];
            return (
              <button key={key} type="button" onClick={() => setPlan(key)} className={`flex items-start justify-between gap-4 rounded-lg border p-4 text-left ${plan === key ? "border-[#ef3f26] bg-red-50/40 ring-2 ring-[#ef3f26]" : "border-stone-300"}`}>
                <span>
                  <span className="block font-display text-2xl font-bold">{item.name}</span>
                  <span className="block text-sm text-stone-500">{item.audience}</span>
                  <span className="mt-2 block text-sm text-stone-700">{item.kind === "subscription" ? `Hasta ${item.vehicleLimit} vehículos al mes. Vehículo extra: $${EXTRA_VEHICLE_FEE}.` : `Vehículos ilimitados. ${item.percent}% de los presupuestos aceptados: mínimo $${item.minimum}, máximo $${item.maximum} al mes.`}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-3xl font-bold">{item.kind === "subscription" ? `$${item.price}` : `${item.percent}%`}</span>
                  <span className="text-xs text-stone-500">{item.kind === "subscription" ? "al mes" : "de lo aprobado"}</span>
                  {plan === key && <Check className="ml-auto mt-2 text-[#ef3f26]" size={20} />}
                </span>
              </button>
            );
          })}
          {selected.kind === "commission" && (
            <label className="grid gap-1 text-sm font-bold">¿Cada cuánto quieres pagar?
              <select value={cycle} onChange={(event) => setCycle(event.target.value as BillingCycle)} className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal">{(Object.keys(CYCLE_LABELS) as BillingCycle[]).map((value) => <option key={value} value={value}>{CYCLE_LABELS[value]}</option>)}</select>
            </label>
          )}
          <p className="text-xs text-stone-500">Montos en dólares a {RATE_NOTE}. Cada sucursal adicional suma ${extraBranchFee} al mes. El plan empieza hoy y se paga al cierre de cada período desde «Facturación».</p>
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          <button type="button" disabled={pending} onClick={choose} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Activar plan {selected.name}</button>
        </div>
      </div>
    </div>
  );
}
