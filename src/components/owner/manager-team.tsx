"use client";

import { LoaderCircle, Plus, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/ui/password-input";

type ManagerRow = { id: string; fullName: string; phone: string | null; documentId: string | null; isActive: boolean };

export function ManagerTeam({ managers }: { managers: ManagerRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function createManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = event.currentTarget;
    const response = await fetch("/api/owner/managers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo crear el encargado.");
    form.reset();
    setOpen(false);
    router.refresh();
  }

  async function toggle(manager: ManagerRow) {
    setError(undefined);
    const response = await fetch(`/api/owner/managers/${manager.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !manager.isActive }) });
    if (!response.ok) return setError("No se pudo actualizar el encargado.");
    router.refresh();
  }

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><ShieldCheck className="text-[#ef3f26]" /> Encargados</h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">Empleados de confianza que gestionan el taller: órdenes, agenda, presupuestos y mecánicos. No ven la facturación ni pueden crear otros encargados.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white"><Plus size={19} /> Agregar encargado</button>
      </div>
      {error && !open && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {managers.map((manager) => (
          <article key={manager.id} className="flex items-start justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4">
            <div className="min-w-0">
              <p className="truncate font-bold">{manager.fullName}</p>
              <p className="text-xs text-stone-500">{manager.phone ?? "Sin teléfono"} · {manager.documentId ?? "Sin documento"}</p>
              <span className={`mt-2 inline-block rounded-sm px-2 py-1 text-xs font-bold ${manager.isActive ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>{manager.isActive ? "Activo" : "Inactivo"}</span>
            </div>
            <button type="button" onClick={() => toggle(manager)} className="min-h-10 shrink-0 rounded-md border border-stone-300 px-3 text-sm font-bold">{manager.isActive ? "Desactivar" : "Activar"}</button>
          </article>
        ))}
        {!managers.length && <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 sm:col-span-2 lg:col-span-3">Todavía no tienes encargados.</p>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="manager-dialog-title">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white sm:max-w-2xl sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div className="flex items-center gap-3"><ShieldCheck /><h2 id="manager-dialog-title" className="text-xl font-bold">Nuevo encargado</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <form onSubmit={createManager} className="grid gap-3 p-5 sm:grid-cols-2">
              <input name="fullName" required placeholder="Nombre completo" className="min-h-12 rounded-md border border-stone-300 px-4" />
              <input name="email" type="email" required placeholder="Correo" className="min-h-12 rounded-md border border-stone-300 px-4" />
              <input name="phone" required placeholder="Teléfono" className="min-h-12 rounded-md border border-stone-300 px-4" />
              <input name="documentId" required placeholder="Cédula / documento" className="min-h-12 rounded-md border border-stone-300 px-4" />
              <PasswordInput name="temporaryPassword" required minLength={8} placeholder="Contraseña temporal" className="min-h-12 rounded-md border border-stone-300 px-4" containerClassName="sm:col-span-2" />
              {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
              <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60 sm:col-span-2">{pending && <LoaderCircle className="animate-spin" size={19} />} Crear encargado</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
