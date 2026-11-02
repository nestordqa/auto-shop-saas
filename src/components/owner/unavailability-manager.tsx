"use client";

import { CalendarOff, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Block = { id: string; label: string; reason: string | null; active: boolean; scope: string | null; canRemove: boolean };

/** Owner/manager agenda: ranges in which clients cannot book appointments. `branches` (owner of a multi-branch garage) adds a scope picker. */
export function UnavailabilityManager({ blocks, today, branches = [] }: { blocks: Block[]; today: string; branches?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState(today);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/owner/unavailability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, allDay }) });
    const result = await response.json() as { error?: string; existingAppointments?: number };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo guardar el bloqueo.");
    setOpen(false);
    setNotice(result.existingAppointments ? `Bloqueo guardado. Ojo: ya hay ${result.existingAppointments} cita(s) agendada(s) en ese rango; contacta a esos clientes para reprogramarlas.` : "Bloqueo guardado. Los clientes ya no verán esos horarios.");
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar este bloqueo? Los clientes podrán volver a agendar en ese rango.")) return;
    setRemoving(id);
    const response = await fetch(`/api/owner/unavailability/${id}`, { method: "DELETE" });
    setRemoving(undefined);
    if (!response.ok) return window.alert("No se pudo eliminar el bloqueo.");
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold"><CalendarOff size={20} className="text-[#ef3f26]" /> No disponible</h2>
          <p className="mt-1 text-sm text-stone-600">Vacaciones, feriados o cierres: en estos rangos los clientes no pueden agendar citas.</p>
        </div>
        <button type="button" onClick={() => { setOpen(true); setError(undefined); setNotice(undefined); }} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 font-bold text-white"><Plus size={18} /> Bloquear fechas</button>
      </div>
      {notice && <p role="status" className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">{notice}</p>}
      {blocks.length > 0 ? (
        <ul className="mt-4 divide-y divide-stone-100 rounded-md border border-stone-200">
          {blocks.map((block) => (
            <li key={block.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0"><p className="font-bold">{block.label}{block.active && <span className="ml-2 rounded-sm bg-red-100 px-2 py-0.5 text-xs text-red-700">Ahora</span>}</p>{block.scope && <p className="text-xs font-semibold text-[#d9341d]">{block.scope}</p>}{block.reason && <p className="text-stone-500">{block.reason}</p>}</div>
              {block.canRemove && <button type="button" disabled={removing === block.id} onClick={() => remove(block.id)} aria-label="Eliminar bloqueo" className="grid size-10 shrink-0 place-items-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-60">{removing === block.id ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={17} />}</button>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 text-sm text-stone-500">No tienes bloqueos programados.</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="block-dialog-title">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white sm:max-w-lg sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div className="flex items-center gap-3"><CalendarOff /><h2 id="block-dialog-title" className="text-xl font-bold">Bloquear fechas</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <form onSubmit={create} className="grid gap-4 p-5">
              <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} className="size-5 accent-[#ef3f26]" /> Días completos</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-bold">Desde<input type="date" name="startDate" required min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>
                {!allDay && <label className="grid gap-1 text-sm font-bold">Hora de inicio<input type="time" name="startTime" required defaultValue="08:00" className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>}
                <label className="grid gap-1 text-sm font-bold">Hasta<input type="date" name="endDate" required min={startDate} defaultValue={today} className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>
                {!allDay && <label className="grid gap-1 text-sm font-bold">Hora de fin<input type="time" name="endTime" required defaultValue="18:00" className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>}
              </div>
              {branches.length > 0 && <label className="grid gap-1 text-sm font-bold">Aplica a<select name="branchId" defaultValue="" className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal"><option value="">Todas las sucursales</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
              <label className="grid gap-1 text-sm font-bold">Motivo (opcional)<input name="reason" maxLength={120} placeholder="Ej.: Vacaciones, feriado" className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>
              {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Guardar bloqueo</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
