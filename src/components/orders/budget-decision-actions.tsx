"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BudgetDecisionActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<boolean | null>(null);
  const [error, setError] = useState<string>();

  async function decide(approved: boolean) {
    setPending(approved);
    setError(undefined);
    const response = await fetch(`/api/orders/${orderId}/budget/decision`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    const result = await response.json() as { error?: string };
    setPending(null);
    if (!response.ok) return setError(result.error ?? "No se pudo registrar la decisión.");
    router.refresh();
  }

  return <div className="grid gap-3 sm:grid-cols-2">
    <button type="button" disabled={pending !== null} onClick={() => decide(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{pending === true ? <LoaderCircle className="animate-spin" size={19} /> : <Check size={19} />} Aceptar presupuesto</button>
    <button type="button" disabled={pending !== null} onClick={() => decide(false)} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-5 font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">{pending === false ? <LoaderCircle className="animate-spin" size={19} /> : <X size={19} />} Rechazar presupuesto</button>
    {error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
  </div>;
}