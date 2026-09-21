"use client";

import { LoaderCircle, Plus, UserRoundPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/ui/password-input";
import { MECHANIC_SPECIALTIES, MECHANIC_SPECIALTY_LABELS, type MechanicSpecialty } from "@/lib/mechanics";

type MechanicRow = { id: string; fullName: string; phone: string | null; documentId: string | null; specialty: MechanicSpecialty; isActive: boolean };

export function TeamManager({ mechanics }: { mechanics: MechanicRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function createMechanic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = event.currentTarget;
    const response = await fetch("/api/owner/mechanics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo crear el mecánico.");
    form.reset();
    setOpen(false);
    router.refresh();
  }

  async function toggle(mechanic: MechanicRow) {
    setError(undefined);
    const response = await fetch(`/api/owner/mechanics/${mechanic.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !mechanic.isActive }) });
    if (!response.ok) return setError("No se pudo actualizar el mecánico.");
    router.refresh();
  }

  return <>
    <div className="flex justify-end"><button type="button" onClick={() => setOpen(true)} className="flex min-h-12 items-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><Plus size={19} /> Agregar mecánico</button></div>
    {error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
    <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm"><table className="min-w-180 w-full text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Mecánico</th><th className="p-4">Contacto</th><th className="p-4">Especialidad</th><th className="p-4">Estado</th><th className="p-4 text-right">Acción</th></tr></thead><tbody className="divide-y divide-stone-100">{mechanics.map((mechanic) => <tr key={mechanic.id}><td className="p-4"><p className="font-bold">{mechanic.fullName}</p><p className="text-xs text-stone-500">{mechanic.documentId ?? "Sin documento"}</p></td><td className="p-4">{mechanic.phone ?? "Sin teléfono"}</td><td className="p-4">{MECHANIC_SPECIALTY_LABELS[mechanic.specialty]}</td><td className="p-4"><span className={`rounded-sm px-2 py-1 text-xs font-bold ${mechanic.isActive ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>{mechanic.isActive ? "Activo" : "Inactivo"}</span></td><td className="p-4 text-right"><button type="button" onClick={() => toggle(mechanic)} className="min-h-10 rounded-md border border-stone-300 px-3 font-bold">{mechanic.isActive ? "Desactivar" : "Activar"}</button></td></tr>)}</tbody></table>{!mechanics.length && <p className="p-8 text-center text-stone-500">Todavía no hay mecánicos en el equipo.</p>}</div>
    {open && <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true"><div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white sm:max-w-2xl sm:rounded-lg"><div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5"><div className="flex items-center gap-3"><UserRoundPlus /><h2 className="text-xl font-bold">Nuevo mecánico</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button></div><form onSubmit={createMechanic} className="grid gap-3 p-5 sm:grid-cols-2"><input name="fullName" required placeholder="Nombre completo" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="email" type="email" required placeholder="Correo" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="phone" required placeholder="Teléfono" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="documentId" required placeholder="Cédula / documento" className="min-h-12 rounded-md border border-stone-300 px-4" /><select name="specialty" defaultValue="general" className="min-h-12 rounded-md border border-stone-300 bg-white px-4 sm:col-span-2">{MECHANIC_SPECIALTIES.map((specialty) => <option key={specialty} value={specialty}>{MECHANIC_SPECIALTY_LABELS[specialty]}</option>)}</select><PasswordInput name="temporaryPassword" required minLength={8} placeholder="Contraseña temporal" className="min-h-12 rounded-md border border-stone-300 px-4" containerClassName="sm:col-span-2" />{error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}<button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60 sm:col-span-2">{pending && <LoaderCircle className="animate-spin" size={19} />} Crear mecánico</button></form></div></div>}
  </>;
}