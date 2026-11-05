"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const input = "min-h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-sm";

/** Admin records what TorkeOS paid the seller; the balance updates from it. */
export function SellerPayoutForm({ sellerId, suggested }: { sellerId: string; suggested: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(undefined);
    const response = await fetch(`/api/admin/sellers/${sellerId}/payouts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo registrar el pago.");
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[120px_150px_minmax(0,1fr)_auto]">
      <input name="amount" type="number" min={0.01} step="0.01" required defaultValue={suggested > 0 ? suggested.toFixed(2) : undefined} placeholder="Monto $" aria-label="Monto" className={input} />
      <input name="paidOn" type="date" aria-label="Fecha del pago" className={input} />
      <input name="reference" maxLength={200} placeholder="Referencia / método" className={input} />
      <button disabled={pending} className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />} Registrar pago</button>
      {error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-4">{error}</p>}
    </form>
  );
}

export function SellerPayoutDelete({ sellerId, payoutId }: { sellerId: string; payoutId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function remove() {
    if (!window.confirm("¿Eliminar este pago?")) return;
    setPending(true);
    const response = await fetch(`/api/admin/sellers/${sellerId}/payouts`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payoutId }) });
    setPending(false);
    if (!response.ok) return window.alert("No se pudo eliminar el pago.");
    router.refresh();
  }
  return <button type="button" disabled={pending} onClick={remove} aria-label="Eliminar pago" className="grid size-9 place-items-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={15} />}</button>;
}
