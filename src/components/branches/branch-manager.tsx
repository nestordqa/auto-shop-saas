"use client";

import { LoaderCircle, MapPin, Pencil, Phone, Plus, Star, Store, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { EXTRA_BRANCH_FEE } from "@/lib/billing-branches";

export type BranchRow = { id: string; name: string; slug: string; address: string; map_location: string | null; phone: string | null; is_main: boolean; is_active: boolean };

const input = "min-h-12 rounded-md border border-stone-300 px-4 font-normal";

/**
 * List + create/edit/toggle of a garage's branches. `apiBase` is `/api/owner/branches` for the owner
 * or `/api/admin/garages/{id}/branches` for the admin; `bookingBase` is the garage booking URL (each branch adds `?sucursal=`).
 */
export function BranchManager({ branches, apiBase, bookingBase }: { branches: BranchRow[]; apiBase: string; bookingBase?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<BranchRow | "new">();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const extra = branches.filter((branch) => branch.is_active && !branch.is_main).length;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const target = editing === "new" ? apiBase : `${apiBase}/${editing!.id}`;
    const response = await fetch(target, { method: editing === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo guardar la sucursal.");
    setEditing(undefined);
    router.refresh();
  }

  async function toggle(branch: BranchRow) {
    if (branch.is_active && !window.confirm(`¿Desactivar la sucursal ${branch.name}? Los clientes ya no podrán agendar en ella.`)) return;
    setError(undefined);
    const response = await fetch(`${apiBase}/${branch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !branch.is_active }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return setError(result.error ?? "No se pudo actualizar la sucursal.");
    router.refresh();
  }

  const current = editing === "new" ? undefined : editing;
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">{extra ? <>Tienes <strong>{extra}</strong> sucursal(es) adicional(es): <strong>+${extra * EXTRA_BRANCH_FEE}</strong> al mes sobre tu plan.</> : <>Cada sucursal adicional activa suma <strong>${EXTRA_BRANCH_FEE}</strong> al mes.</>}</p>
        <button type="button" onClick={() => { setEditing("new"); setError(undefined); }} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><Plus size={19} /> Agregar otra sucursal</button>
      </div>
      {error && !editing && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {branches.map((branch) => (
          <article key={branch.id} className={`rounded-lg border bg-white p-4 ${branch.is_active ? "border-stone-200" : "border-dashed border-stone-300 opacity-70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold"><Store size={17} className="shrink-0 text-[#ef3f26]" /> <span className="truncate">{branch.name}</span></p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold">
                  {branch.is_main && <span className="flex items-center gap-1 rounded-sm bg-amber-100 px-2 py-0.5 text-amber-800"><Star size={11} /> Principal</span>}
                  <span className={`rounded-sm px-2 py-0.5 ${branch.is_active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>{branch.is_active ? "Activa" : "Inactiva"}</span>
                </div>
              </div>
              <button type="button" onClick={() => { setEditing(branch); setError(undefined); }} aria-label={`Editar ${branch.name}`} className="grid size-10 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-stone-100"><Pencil size={17} /></button>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-sm text-stone-600"><MapPin size={15} className="mt-0.5 shrink-0" /> {branch.address}</p>
            {branch.phone && <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600"><Phone size={15} /> {branch.phone}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {bookingBase && branch.is_active && branches.length > 1 && <button type="button" onClick={() => navigator.clipboard?.writeText(`${bookingBase}?sucursal=${branch.slug}`)} className="min-h-9 rounded-md border border-stone-300 px-3 text-xs font-bold">Copiar enlace de reservas</button>}
              {!branch.is_main && <button type="button" onClick={() => toggle(branch)} className="min-h-9 rounded-md border border-stone-300 px-3 text-xs font-bold">{branch.is_active ? "Desactivar" : "Activar"}</button>}
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="branch-dialog-title">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white text-left sm:max-w-lg sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div className="flex items-center gap-3"><Store /><h2 id="branch-dialog-title" className="text-xl font-bold">{current ? "Editar sucursal" : "Nueva sucursal"}</h2></div>
              <button type="button" onClick={() => setEditing(undefined)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <form onSubmit={save} className="grid gap-3 p-5">
              <input name="name" required minLength={2} maxLength={80} defaultValue={current?.name} placeholder="Nombre: ej. Sede Centro" className={input} />
              <textarea name="address" required minLength={5} maxLength={300} rows={3} defaultValue={current?.address} placeholder="Dirección completa" className="min-h-24 resize-none rounded-md border border-stone-300 p-4" />
              <input name="mapLocation" maxLength={500} defaultValue={current?.map_location ?? ""} placeholder="Enlace de Google Maps (opcional)" className={input} />
              <input name="phone" type="tel" maxLength={30} defaultValue={current?.phone ?? ""} placeholder="Teléfono de la sucursal (opcional)" className={input} />
              {!current && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Esta sucursal suma <strong>${EXTRA_BRANCH_FEE}</strong> al mes mientras esté activa.</p>}
              {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} {current ? "Guardar cambios" : "Crear sucursal"}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
