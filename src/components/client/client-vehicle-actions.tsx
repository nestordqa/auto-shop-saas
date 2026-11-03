"use client";

import { LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Vehicle = { id: string; year: number; color: string; plate: string };
const years = Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) => new Date().getFullYear() - index);

/** Client: edit year, color and plate of a vehicle, or delete it (only without orders). */
export function ClientVehicleActions({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<"save" | "delete">();
  const [error, setError] = useState<string>();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setPending("save");
    setError(undefined);
    const response = await fetch(`/api/client/vehicles/${vehicle.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: Number(values.year), color: values.color, plate: values.plate }) }).catch(() => null);
    const result = await response?.json().catch(() => ({})) as { error?: string } | undefined;
    setPending(undefined);
    if (!response?.ok) return setError(result?.error ?? "No se pudo actualizar el vehículo.");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar el vehículo ${vehicle.plate}? Esta acción no se puede deshacer.`)) return;
    setPending("delete");
    setError(undefined);
    const response = await fetch(`/api/client/vehicles/${vehicle.id}`, { method: "DELETE" }).catch(() => null);
    const result = await response?.json().catch(() => ({})) as { error?: string } | undefined;
    if (!response?.ok) { setPending(undefined); return setError(result?.error ?? "No se pudo eliminar el vehículo."); }
    router.push("/dashboard/client/vehicles");
    router.refresh();
  }

  return (
    <div className="mb-6">
      {editing ? (
        <form onSubmit={save} className="grid gap-3 rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-3">
          <div className="flex items-center justify-between sm:col-span-3"><h2 className="text-lg font-bold">Editar vehículo</h2><button type="button" onClick={() => setEditing(false)} aria-label="Cancelar" className="grid size-10 place-items-center rounded-md hover:bg-stone-100"><X /></button></div>
          <label className="grid gap-1 text-sm font-bold">Año<select name="year" defaultValue={vehicle.year} className="min-h-12 rounded-md border border-stone-300 bg-white px-3 font-normal">{years.map((year) => <option key={year}>{year}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-bold">Color<input name="color" required minLength={2} defaultValue={vehicle.color} className="min-h-12 rounded-md border border-stone-300 px-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">Placa<input name="plate" required minLength={3} defaultValue={vehicle.plate} className="min-h-12 rounded-md border border-stone-300 px-3 font-normal uppercase" /></label>
          <p className="text-xs text-stone-500 sm:col-span-3">¿Marca o modelo equivocados? Elimina el vehículo y regístralo de nuevo (solo si aún no tiene servicios).</p>
          <button disabled={Boolean(pending)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60 sm:col-span-3">{pending === "save" && <LoaderCircle className="animate-spin" size={18} />} {pending === "save" ? "Guardando…" : "Guardar cambios"}</button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className="flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 font-bold"><Pencil size={17} /> Editar</button>
          <button type="button" disabled={Boolean(pending)} onClick={remove} className="flex min-h-11 items-center gap-2 rounded-md border border-red-300 bg-white px-4 font-bold text-red-700 disabled:opacity-60">{pending === "delete" ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />} {pending === "delete" ? "Eliminando…" : "Eliminar"}</button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
