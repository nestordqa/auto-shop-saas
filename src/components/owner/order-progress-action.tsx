"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OrderStatus } from "@/types/domain";

type Action = { next: OrderStatus; label: string; primary?: boolean };

/** Repair and road test can alternate as many times as needed before the vehicle is ready. */
const actions: Partial<Record<OrderStatus, Action[]>> = {
  diagnosticado: [{ next: "ingresado", label: "Reabrir diagnóstico" }],
  presupuesto_rechazado: [{ next: "diagnosticado", label: "Reabrir presupuesto" }],
  en_reparacion: [
    { next: "en_prueba", label: "Pasar a prueba", primary: true },
    { next: "listo_para_entregar", label: "Marcar listo para entregar" },
  ],
  en_prueba: [
    { next: "listo_para_entregar", label: "Marcar listo para entregar", primary: true },
    { next: "en_reparacion", label: "Volver a reparación" },
  ],
  listo_para_entregar: [{ next: "entregado", label: "Registrar vehículo entregado", primary: true }],
};

/** Transitions a mechanic may perform from this panel (the API and the database enforce the same rule). */
const MECHANIC_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  en_reparacion: ["en_prueba"],
  en_prueba: ["en_reparacion", "listo_para_entregar"],
};

export function OrderProgressAction({ orderId, status, mechanic = false }: { orderId: string; status: OrderStatus; mechanic?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string>();
  const available = (actions[status] ?? []).filter((action) => !mechanic || MECHANIC_TRANSITIONS[status]?.includes(action.next));
  if (!available.length) return null;

  async function advance(next: OrderStatus) {
    setPending(next);
    setError(undefined);
    const response = await fetch(`/api/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    const result = await response.json() as { error?: string };
    setPending(null);
    if (!response.ok) return setError(result.error ?? "No se pudo actualizar la orden.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className={`grid gap-3 ${available.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {available.map((action) => (
          <button key={action.next} type="button" disabled={pending !== null} onClick={() => advance(action.next)} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-5 font-bold disabled:opacity-60 ${action.primary || available.length === 1 ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"}`}>
            {pending === action.next ? <LoaderCircle className="animate-spin" size={19} /> : <ArrowRight size={19} />}{action.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
