"use client";

import { FileSignature, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { addDays, CYCLE_LABELS, formatDate, TRIAL_DAYS, type BillingCycle, type ContractKind } from "@/lib/contracts";
import { PLAN_KEYS, PLANS, planSummary, type PlanKey } from "@/lib/plans";

type GarageOption = { id: string; name: string; ownerName: string; suggestedKind: ContractKind; suggestedStart: string; suggestedPlan: PlanKey };

type ContractCreateModalProps = { garages: GarageOption[]; today: string; preselectedGarageId?: string; label?: string };

export function ContractCreateModal({ garages, today, preselectedGarageId, label = "Nuevo contrato" }: ContractCreateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const initial = garages.find((garage) => garage.id === preselectedGarageId);
  const [garageId, setGarageId] = useState(initial?.id ?? "");
  const [kind, setKind] = useState<ContractKind>(initial?.suggestedKind ?? "trial");
  const [startDate, setStartDate] = useState(initial?.suggestedStart ?? today);
  const [plan, setPlan] = useState<PlanKey>(initial?.suggestedPlan ?? "bujia");
  const garage = garages.find((item) => item.id === garageId);

  function selectGarage(id: string) {
    setGarageId(id);
    const selected = garages.find((item) => item.id === id);
    if (selected) {
      setKind(selected.suggestedKind);
      setStartDate(selected.suggestedStart);
      setPlan(selected.suggestedPlan);
    }
  }

  async function createContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const response = await fetch("/api/admin/contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    const result = await response.json() as { error?: string; id?: string };
    setPending(false);
    if (!response.ok || !result.id) return setError(result.error ?? "No se pudo crear el contrato.");
    router.push(`/dashboard/admin/contracts/${result.id}?created=1`);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white"><Plus size={19} /> {label}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="contract-dialog-title">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white sm:max-w-2xl sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div className="flex items-center gap-3"><FileSignature /><h2 id="contract-dialog-title" className="text-xl font-bold">Nuevo contrato</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <form onSubmit={createContract} className="grid gap-4 p-5">
              <label className="grid gap-1 text-sm font-bold">Taller
                <select name="garageId" required value={garageId} onChange={(event) => selectGarage(event.target.value)} className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal">
                  <option value="" disabled>Selecciona un taller</option>
                  {garages.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ownerName}</option>)}
                </select>
              </label>
              {garage && <p className="-mt-2 text-sm text-stone-600">El contrato se emite a nombre del administrador <strong>{garage.ownerName}</strong>.</p>}
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="mb-1 text-sm font-bold">Tipo de contrato</legend>
                {(["trial", "paid"] as const).map((value) => (
                  <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${kind === value ? "border-[#ef3f26] bg-red-50/40" : "border-stone-300"}`}>
                    <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="mt-1 accent-[#ef3f26]" />
                    <span><span className="block font-bold">{value === "trial" ? "Mes de prueba" : "Contrato de pago"}</span><span className="text-xs text-stone-600">{value === "trial" ? `${TRIAL_DAYS} días de cortesía, sin costo.` : "Bujía, Alternador o Pistón."}</span></span>
                  </label>
                ))}
              </fieldset>
              <label className="grid gap-1 text-sm font-bold">Fecha de inicio
                <input type="date" name="startDate" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" />
              </label>
              {kind === "trial" && startDate && <p className="-mt-2 rounded-md bg-sky-50 p-3 text-sm text-sky-900">La prueba termina el <strong>{formatDate(addDays(startDate, TRIAL_DAYS - 1))}</strong>.</p>}
              {kind === "paid" && (
                <fieldset className="grid gap-2">
                  <legend className="mb-1 text-sm font-bold">Plan</legend>
                  {PLAN_KEYS.map((key) => (
                    <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${plan === key ? "border-[#ef3f26] bg-red-50/40" : "border-stone-300"}`}>
                      <input type="radio" name="plan" value={key} checked={plan === key} onChange={() => setPlan(key)} className="mt-1 accent-[#ef3f26]" />
                      <span><span className="block font-bold">{PLANS[key].name} <span className="font-normal text-stone-500">· {PLANS[key].audience}</span></span><span className="text-stone-600">{planSummary(key).split(" · ").slice(1).join(" · ")}</span></span>
                    </label>
                  ))}
                  {PLANS[plan].kind === "commission" ? (
                    <label className="grid gap-1 text-sm font-bold">Ciclo de cobro
                      <select name="billingCycle" defaultValue="monthly" className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal">
                        {(Object.keys(CYCLE_LABELS) as BillingCycle[]).map((cycle) => <option key={cycle} value={cycle}>{CYCLE_LABELS[cycle]}</option>)}
                      </select>
                    </label>
                  ) : <p className="text-xs text-stone-500">Los planes de suscripción se cobran cada mes.</p>}
                </fieldset>
              )}
              <label className="grid gap-1 text-sm font-bold">Notas internas (opcional)
                <textarea name="notes" maxLength={2000} rows={2} className="rounded-md border border-stone-300 px-4 py-3 font-normal" />
              </label>
              {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Generar contrato</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
