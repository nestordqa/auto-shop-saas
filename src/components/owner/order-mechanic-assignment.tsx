"use client";

import { LoaderCircle, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type MechanicOption = { id: string; name: string; specialty: string };

export function OrderMechanicAssignment({ orderId, currentMechanicId, mechanics, disabled }: { orderId: string; currentMechanicId: string | null; mechanics: MechanicOption[]; disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const mechanicId = String(new FormData(event.currentTarget).get("mechanicId") ?? "") || null;
    const response = await fetch(`/api/owner/orders/${orderId}/mechanic`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mechanicId }) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo asignar el mecánico.");
    router.refresh();
  }

  return <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end"><span className="grid size-11 place-items-center rounded-md bg-stone-100"><UserRoundCog size={20} /></span><label className="grid gap-1 text-sm font-bold">Asignar mecánico<select name="mechanicId" defaultValue={currentMechanicId ?? ""} disabled={disabled || pending} className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal disabled:bg-stone-100"><option value="">Sin asignar</option>{mechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.name} · {mechanic.specialty}</option>)}</select></label><button disabled={disabled || pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white disabled:opacity-50">{pending && <LoaderCircle className="animate-spin" size={18} />} Guardar asignación</button>{error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-3">{error}</p>}</form>;
}