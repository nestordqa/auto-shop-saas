"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OrderStatus } from "@/types/domain";

const actions: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  por_ingresar: { next: "ingresado", label: "Confirmar ingreso del vehículo" },
  presupuesto_rechazado: { next: "diagnosticado", label: "Reabrir presupuesto" },
  en_reparacion: { next: "listo_para_entregar", label: "Marcar listo para entregar" },
  listo_para_entregar: { next: "entregado", label: "Registrar vehículo entregado" },
};

export function OrderProgressAction({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const action = actions[status];
  if (!action) return null;

  async function advance() {
    if (!action) return;
    setPending(true);
    setError(undefined);
    const response = await fetch(`/api/orders/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action.next }) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo actualizar la orden.");
    router.refresh();
  }

  return <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"><button type="button" disabled={pending} onClick={advance} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={19} /> : <ArrowRight size={19} />}{action.label}</button>{error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}</div>;
}