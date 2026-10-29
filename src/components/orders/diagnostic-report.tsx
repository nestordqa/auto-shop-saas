import { CheckCircle2, Circle, ClipboardList, XCircle } from "lucide-react";

import { componentLabel, interventionLabel } from "@/lib/vehicle-systems";
import type { Diagnostic } from "@/types/domain";

const currency = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" });

type Budget = { includesParts: boolean; totalAmount: number; approved: boolean | null };

/**
 * Read-only diagnosis for every stage after it is finished.
 * Staff pass `budget` to see prices, part brands and the decision; mechanics never get prices.
 */
export function DiagnosticReport({ diagnostics, budget, subtitle }: { diagnostics: Diagnostic[]; budget?: Budget | null; subtitle?: string }) {
  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-stone-200 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-stone-900 text-white"><ClipboardList size={20} /></span>
        <div>
          <h2 className="text-xl font-bold">Diagnóstico</h2>
          <p className="text-sm text-stone-500">{subtitle ?? `${diagnostics.length} ${diagnostics.length === 1 ? "hallazgo" : "hallazgos"}`}</p>
        </div>
      </header>
      <div className="divide-y divide-stone-100">
        {diagnostics.map((item, index) => (
          <div key={item.id} className="flex items-start justify-between gap-4 p-4 sm:px-5">
            <div className="min-w-0">
              <p className="flex items-start gap-2 font-semibold">
                <span className="mt-0.5 text-xs font-bold text-stone-400">{String(index + 1).padStart(2, "0")}</span>
                {item.description}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                {item.component && <span className="rounded bg-stone-900 px-1.5 py-0.5 font-bold text-white">{componentLabel(item.component)} · {interventionLabel(item.interventionType)}</span>}
                {budget && item.partBrand && <span className="rounded bg-stone-100 px-1.5 py-0.5 font-semibold text-stone-700">Marca: {item.partBrand}</span>}
                <span className="inline-flex items-center gap-1">{item.isCompleted ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Circle size={13} />}{item.isCompleted ? "Completado" : "Pendiente"}</span>
              </p>
            </div>
            {budget && item.price !== null && <strong className="shrink-0">{currency.format(Number(item.price))}</strong>}
          </div>
        ))}
        {!diagnostics.length && <p className="p-5 text-stone-500">No se registraron hallazgos.</p>}
      </div>
      {budget && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 p-5">
          <div className="text-sm text-stone-600">
            <p>Total {budget.includesParts ? "con repuestos" : "sin repuestos"}</p>
            {budget.approved !== null && (
              <p className={`mt-1 flex items-center gap-1.5 font-bold ${budget.approved ? "text-emerald-700" : "text-red-700"}`}>
                {budget.approved ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                {budget.approved ? "Presupuesto aceptado" : "Presupuesto rechazado"}
              </p>
            )}
          </div>
          <strong className="font-display text-2xl">{currency.format(budget.totalAmount)}</strong>
        </footer>
      )}
    </section>
  );
}
