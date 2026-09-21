"use client";

import { Building2, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/ui/password-input";

type OwnerOption = { id: string; fullName: string; documentId: string | null };

export function GarageCreateModal({ owners }: { owners: OwnerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ownerMode, setOwnerMode] = useState<"existing" | "new">(owners.length ? "existing" : "new");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/admin/garages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, ownerMode }),
    });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? "No se pudo crear el taller.");
      return;
    }
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><Plus size={20} /> Crear taller</button>
      {open && <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="garage-modal-title">
        <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-2xl sm:max-w-2xl sm:rounded-lg">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-stone-900 text-white"><Building2 size={20} /></span><h2 id="garage-modal-title" className="text-xl font-bold">Nuevo taller</h2></div><button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-md hover:bg-stone-100" aria-label="Cerrar"><X /></button></div>
          <form onSubmit={submit} className="grid gap-5 p-4 sm:p-6">
            <fieldset className="grid gap-3"><legend className="mb-2 text-sm font-bold">Datos del taller</legend><input name="name" required minLength={2} placeholder="Nombre comercial" className="min-h-12 rounded-md border border-stone-300 px-4" /><textarea name="address" required minLength={5} rows={3} placeholder="Dirección completa" className="min-h-24 resize-none rounded-md border border-stone-300 p-4" /><input name="mapLocation" placeholder="URL o coordenadas del mapa (opcional)" className="min-h-12 rounded-md border border-stone-300 px-4" /></fieldset>
            <fieldset><legend className="text-sm font-bold">Owner</legend><div className="mt-2 grid grid-cols-2 rounded-md bg-stone-100 p-1"><button type="button" disabled={!owners.length} onClick={() => setOwnerMode("existing")} className={`min-h-11 rounded-sm px-3 text-sm font-bold ${ownerMode === "existing" ? "bg-white shadow-sm" : "text-stone-500"}`}>Owner existente</button><button type="button" onClick={() => setOwnerMode("new")} className={`min-h-11 rounded-sm px-3 text-sm font-bold ${ownerMode === "new" ? "bg-white shadow-sm" : "text-stone-500"}`}>Crear owner</button></div>
              {ownerMode === "existing" ? <select name="ownerId" required className="mt-3 min-h-12 w-full rounded-md border border-stone-300 bg-white px-4"><option value="">Selecciona un owner disponible</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.fullName}{owner.documentId ? ` · ${owner.documentId}` : ""}</option>)}</select> : <div className="mt-3 grid gap-3 sm:grid-cols-2"><input name="ownerName" required placeholder="Nombre completo" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="ownerEmail" required type="email" placeholder="Correo" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="ownerPhone" required type="tel" placeholder="Teléfono" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="ownerDocument" required placeholder="Cédula / RIF" className="min-h-12 rounded-md border border-stone-300 px-4" /><PasswordInput name="temporaryPassword" required minLength={8} placeholder="Contraseña temporal" className="min-h-12 rounded-md border border-stone-300 px-4" containerClassName="sm:col-span-2" /></div>}
            </fieldset>
            {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
            <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Crear taller</button>
          </form>
        </div>
      </div>}
    </>
  );
}