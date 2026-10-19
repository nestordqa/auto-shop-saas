"use client";

import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type GarageDeleteButtonProps = {
  garage: { id: string; name: string };
  totals: { orders: number; openOrders: number; staff: number };
};

/** Delete with a type-the-name confirmation: the operation cannot be undone. */
export function GarageDeleteButton({ garage, totals }: GarageDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const confirmed = confirmation.trim() === garage.name.trim();

  function close() {
    setOpen(false);
    setConfirmation("");
    setError(undefined);
  }

  async function remove() {
    setPending(true);
    setError(undefined);
    const response = await fetch(`/api/admin/garages/${garage.id}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo eliminar el taller.");
    close();
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Eliminar ${garage.name}`} className="grid size-10 place-items-center rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-700">
        <Trash2 size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={`delete-${garage.id}`}>
          <div className="w-full rounded-t-lg bg-white sm:max-w-lg sm:rounded-lg">
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-red-100 text-red-700"><AlertTriangle size={20} /></span>
                <h2 id={`delete-${garage.id}`} className="text-xl font-bold">Eliminar {garage.name}</h2>
              </div>
              <button type="button" onClick={close} aria-label="Cerrar" className="grid size-10 place-items-center"><X /></button>
            </div>
            <div className="grid gap-4 p-5 text-sm">
              <p>Esta acción es <strong>permanente</strong> y no se puede deshacer. Se eliminará:</p>
              <ul className="grid gap-1.5 rounded-md bg-red-50 p-4 text-red-900">
                <li>• El taller y su página pública de reservas.</li>
                <li>• {totals.orders} {totals.orders === 1 ? "orden" : "órdenes"}{totals.openOrders ? ` (${totals.openOrders} abiertas)` : ""}, con sus diagnósticos, presupuestos, formatos de ingreso y fotos.</li>
                <li>• {totals.staff} {totals.staff === 1 ? "cuenta" : "cuentas"} de mecánicos y encargados.</li>
              </ul>
              <p className="text-stone-600">Se conservan la cuenta del dueño (podrás asignarle otro taller) y los clientes con sus vehículos. La facturación de este taller deja de estar disponible.</p>
              <label className="grid gap-1.5 font-bold">
                Escribe <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono">{garage.name}</span> para confirmar
                <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="min-h-12 rounded-md border border-stone-300 px-4 font-normal outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
              </label>
              {error && <p role="alert" className="rounded-md bg-red-50 p-3 font-semibold text-red-700">{error}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={close} className="min-h-12 rounded-md border border-stone-300 px-5 font-bold">Cancelar</button>
                <button type="button" disabled={!confirmed || pending} onClick={remove} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-red-600 px-5 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {pending ? <LoaderCircle className="animate-spin" size={18} /> : <Trash2 size={18} />} Eliminar taller
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
