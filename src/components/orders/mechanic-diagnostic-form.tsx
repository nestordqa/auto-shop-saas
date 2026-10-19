"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Circle, Flag, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { INTERVENTION_LABELS, INTERVENTION_TYPES, VEHICLE_SYSTEMS, componentLabel, interventionLabel } from "@/lib/vehicle-systems";
import type { Diagnostic, OrderStatus } from "@/types/domain";

const diagnosticSchema = z.object({
  description: z.string().trim().min(3, "Describe el hallazgo con al menos 3 caracteres.").max(240),
  component: z.string(),
  interventionType: z.enum(INTERVENTION_TYPES),
});

type DiagnosticInput = z.infer<typeof diagnosticSchema>;

type MechanicDiagnosticFormProps = {
  orderId: string;
  initialStatus: OrderStatus;
  initialDiagnostics: Diagnostic[];
};

export function MechanicDiagnosticForm({ orderId, initialStatus, initialDiagnostics }: MechanicDiagnosticFormProps) {
  const router = useRouter();
  const [diagnostics, setDiagnostics] = useState(initialDiagnostics);
  const [status, setStatus] = useState(initialStatus);
  const [advancing, setAdvancing] = useState(false);
  const [requestError, setRequestError] = useState<string>();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DiagnosticInput>({
    resolver: zodResolver(diagnosticSchema),
    defaultValues: { description: "", component: "", interventionType: "reemplazo" },
  });

  async function addDiagnostic(values: DiagnosticInput) {
    setRequestError(undefined);
    const response = await fetch(`/api/orders/${orderId}/diagnostics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, component: values.component || null }),
    });
    const result = await response.json() as { diagnostic?: Diagnostic; error?: string };
    if (!response.ok || !result.diagnostic) {
      setRequestError(result.error ?? "No se pudo guardar el diagnóstico.");
      return;
    }
    setDiagnostics((current) => [...current, result.diagnostic!]);
    reset({ description: "", component: "", interventionType: values.interventionType });
  }

  async function toggleDiagnostic(id: string) {
    const current = diagnostics.find((diagnostic) => diagnostic.id === id);
    if (!current) return;
    const response = await fetch(`/api/diagnostics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !current.isCompleted }),
    });
    if (!response.ok) {
      setRequestError("No se pudo actualizar el diagnóstico.");
      return;
    }
    setDiagnostics((items) => items.map((diagnostic) =>
      diagnostic.id === id ? { ...diagnostic, isCompleted: !diagnostic.isCompleted } : diagnostic,
    ));
  }

  async function removeDiagnostic(id: string) {
    const response = await fetch(`/api/diagnostics/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setRequestError("No se pudo eliminar el diagnóstico.");
      return;
    }
    setDiagnostics((current) => current.filter((diagnostic) => diagnostic.id !== id));
  }

  async function advanceOrder() {
    const nextStatus = status === "por_ingresar" ? "ingresado" : "diagnosticado";
    if (nextStatus === "diagnosticado" && !diagnostics.length) {
      setRequestError("Registra al menos un hallazgo antes de finalizar el diagnóstico.");
      return;
    }
    setRequestError(undefined);
    setAdvancing(true);
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json() as { error?: string; status?: OrderStatus };
    if (!response.ok || !result.status) {
      setAdvancing(false);
      setRequestError(result.error ?? "No se pudo actualizar la orden.");
      return;
    }
    setStatus(result.status);
    // The page decides what comes next (budget editor, read-only diagnosis…), so re-render it.
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-[#d9341d]">Inspección activa</p>
            <h2 className="mt-1 text-xl font-bold">Ítems de diagnóstico</h2>
          </div>
          <span className="shrink-0 rounded-md bg-stone-900 px-3 py-2 text-sm font-bold text-white">{diagnostics.length}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-600">Registra cada hallazgo por separado. Los precios los define el dueño del taller.</p>
      </div>

      <div className="divide-y divide-stone-100">
        {diagnostics.map((diagnostic) => (
          <div key={diagnostic.id} className="flex items-start gap-3 px-4 py-4 sm:px-6">
            <button type="button" onClick={() => toggleDiagnostic(diagnostic.id)} className={`grid size-11 shrink-0 place-items-center rounded-md border ${diagnostic.isCompleted ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 text-stone-400"}`} aria-label={diagnostic.isCompleted ? "Marcar pendiente" : "Marcar completado"}>
              {diagnostic.isCompleted ? <Check size={21} /> : <Circle size={20} />}
            </button>
            <div className="min-w-0 flex-1 pt-1">
              <p className={`wrap-break-word text-sm font-semibold leading-5 ${diagnostic.isCompleted ? "text-stone-500 line-through" : "text-stone-900"}`}>{diagnostic.description}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-stone-500">
                {diagnostic.component && <span className="rounded bg-stone-900 px-1.5 py-0.5 font-bold text-white">{componentLabel(diagnostic.component)} · {interventionLabel(diagnostic.interventionType)}</span>}
                Sin precio asignado
              </p>
            </div>
            <button type="button" onClick={() => removeDiagnostic(diagnostic.id)} className="grid size-11 shrink-0 place-items-center rounded-md text-stone-400 hover:bg-red-50 hover:text-red-700" aria-label="Eliminar diagnóstico">
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(addDiagnostic)} className="border-t border-stone-200 bg-stone-50 p-4 sm:p-6">
        <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <label className="grid gap-1 text-sm font-bold">
            Componente
            <select className="min-h-12 rounded-md border border-stone-300 bg-white px-3 text-base font-normal" {...register("component")}>
              <option value="">Sin componente específico</option>
              {VEHICLE_SYSTEMS.map((system) => (
                <optgroup key={system.key} label={system.label}>
                  {system.components.map((component) => <option key={component.key} value={component.key}>{component.label}</option>)}
                </optgroup>
              ))}
            </select>
            <span className="text-xs font-normal text-stone-500">Alimenta la historia clínica del vehículo.</span>
          </label>
          <label className="grid content-start gap-1 text-sm font-bold">
            Intervención
            <select className="min-h-12 rounded-md border border-stone-300 bg-white px-3 text-base font-normal" {...register("interventionType")}>
              {INTERVENTION_TYPES.map((type) => <option key={type} value={type}>{INTERVENTION_LABELS[type]}</option>)}
            </select>
          </label>
        </div>
        <label htmlFor="description" className="text-sm font-bold">Nuevo hallazgo</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <textarea id="description" rows={3} placeholder="Ej. Fuga de aceite en tapa de válvulas" className="min-h-28 w-full resize-none rounded-md border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-[#ef3f26] focus:ring-2 focus:ring-[#ef3f26]/20" {...register("description")} />
            {errors.description && <p className="mt-1 text-sm font-medium text-red-700">{errors.description.message}</p>}
          </div>
          <button disabled={isSubmitting} type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white hover:bg-[#d9341d] disabled:opacity-60">
            <Plus size={20} /> Añadir ítem
          </button>
        </div>
        {requestError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{requestError}</p>}
      </form>
      {(status === "por_ingresar" || status === "ingresado") && (
        <div className="border-t border-stone-200 p-4 sm:p-6">
          <button type="button" disabled={advancing} onClick={advanceOrder} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white hover:bg-stone-800 disabled:opacity-60">
            {advancing ? <LoaderCircle className="animate-spin" size={19} /> : <Flag size={19} />} {status === "por_ingresar" ? "Confirmar ingreso del vehículo" : "Finalizar diagnóstico"}
          </button>
        </div>
      )}
    </section>
  );
}