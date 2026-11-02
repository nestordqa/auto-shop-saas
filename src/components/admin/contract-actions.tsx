"use client";

import { CheckCircle2, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Records the payment of a closed period. */
export function RegisterPaymentButton({ contractId, periodStart, amountLabel }: { contractId: string; periodStart: string; amountLabel: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function register() {
    const reference = window.prompt(`Registrar pago de ${amountLabel}.\nReferencia del pago (opcional):`, "");
    if (reference === null) return;
    setPending(true);
    const response = await fetch(`/api/admin/contracts/${contractId}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periodStart, reference }) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return window.alert(result.error ?? "No se pudo registrar el pago.");
    router.refresh();
  }

  return <button type="button" disabled={pending} onClick={register} className="flex min-h-10 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Registrar pago</button>;
}

export function EndContractButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function end() {
    if (!window.confirm("¿Finalizar este contrato hoy? Los períodos ya cerrados seguirán pendientes de cobro.")) return;
    setPending(true);
    const response = await fetch(`/api/admin/contracts/${contractId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }) });
    setPending(false);
    if (!response.ok) return window.alert("No se pudo finalizar el contrato.");
    router.refresh();
  }

  return <button type="button" disabled={pending} onClick={end} className="min-h-12 rounded-md border border-red-200 px-4 font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">Finalizar contrato</button>;
}

export function UserActiveToggle({ userId, active, name }: { userId: string; active: boolean; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (active && !window.confirm(`¿Desactivar a ${name}? No podrá iniciar sesión hasta que lo reactives.`)) return;
    setPending(true);
    const response = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return window.alert(result.error ?? "No se pudo actualizar el usuario.");
    router.refresh();
  }

  return <button type="button" disabled={pending} onClick={toggle} className={`min-h-10 rounded-md border px-3 text-sm font-bold disabled:opacity-60 ${active ? "border-amber-300 text-amber-800 hover:bg-amber-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}>{pending ? <LoaderCircle className="animate-spin" size={16} /> : active ? "Desactivar" : "Reactivar"}</button>;
}

export function UserDeleteButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (window.prompt(`Eliminar a ${name} es permanente y no se puede deshacer.\nEscribe ELIMINAR para confirmar:`)?.trim() !== "ELIMINAR") return;
    setPending(true);
    const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return window.alert(result.error ?? "No se pudo eliminar el usuario.");
    router.refresh();
  }

  return <button type="button" disabled={pending} onClick={remove} aria-label={`Eliminar a ${name}`} title="Eliminar usuario" className="grid size-10 place-items-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={17} />}</button>;
}
