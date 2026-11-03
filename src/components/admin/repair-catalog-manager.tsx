"use client";

import { ChevronDown, Eye, EyeOff, LoaderCircle, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Repair = { key: string; label: string; system: string; isActive: boolean };
export type CatalogSpecialty = { key: string; label: string; isActive: boolean; repairs: Repair[] };

const input = "min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm";

/** Sends JSON to an admin endpoint and refreshes the page; returns the error text, if any. */
async function send(url: string, method: "POST" | "PATCH", body: object) {
  try {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    return response.ok ? null : result.error ?? "No se pudo guardar.";
  } catch {
    return "Sin conexión. Intenta de nuevo.";
  }
}

/** Admin: specialties (add, rename, hide) and the repairs of each one, grouped by system. */
export function RepairCatalogManager({ specialties }: { specialties: CatalogSpecialty[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function addSpecialty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const label = String(new FormData(form).get("label") ?? "");
    setPending(true);
    setError(undefined);
    const failure = await send("/api/admin/specialties", "POST", { label });
    setPending(false);
    if (failure) return setError(failure);
    form.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={addSpecialty} className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row">
        <input name="label" required minLength={2} maxLength={80} placeholder="Nueva especialidad (ej. Detailing)" className={`${input} min-w-0 flex-1`} />
        <button disabled={pending} className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-4 text-sm font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />} Agregar especialidad</button>
      </form>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {specialties.map((specialty) => <SpecialtyCard key={specialty.key} specialty={specialty} />)}
    </div>
  );
}

function SpecialtyCard({ specialty }: { specialty: CatalogSpecialty }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();
  const systems = [...new Set(specialty.repairs.map((repair) => repair.system))];
  const active = specialty.repairs.filter((repair) => repair.isActive).length;

  async function run(id: string, url: string, method: "POST" | "PATCH", body: object, after?: () => void) {
    setPending(id);
    setError(undefined);
    const failure = await send(url, method, body);
    setPending(undefined);
    if (failure) return setError(failure);
    after?.();
    router.refresh();
  }

  function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = String(new FormData(event.currentTarget).get("label") ?? "");
    void run("rename", "/api/admin/specialties", "PATCH", { key: specialty.key, label }, () => setRenaming(false));
  }

  function addRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    void run("add", "/api/admin/repairs", "POST", { specialty: specialty.key, system: values.system, label: values.label }, () => form.reset());
  }

  function editRepair(repair: Repair) {
    const label = window.prompt("Nombre de la reparación:", repair.label)?.trim();
    if (!label || label === repair.label) return;
    void run(repair.key, "/api/admin/repairs", "PATCH", { key: repair.key, label });
  }

  return (
    <article className={`rounded-lg border bg-white shadow-sm ${specialty.isActive ? "border-stone-200" : "border-dashed border-stone-300 opacity-75"}`}>
      <div className="flex items-start justify-between gap-3 p-4">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-start gap-2 text-left">
          <ChevronDown size={18} className={`mt-1 shrink-0 transition ${open ? "rotate-180" : ""}`} />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 font-bold">{specialty.label}{!specialty.isActive && <span className="rounded-sm bg-stone-100 px-2 py-0.5 text-xs text-stone-600">Oculta</span>}</span>
            <span className="text-sm text-stone-500">{specialty.key === "general" ? "Ve todas las reparaciones" : `${active} reparaciones activas`}</span>
          </span>
        </button>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={() => setRenaming(!renaming)} aria-label={`Renombrar ${specialty.label}`} className="grid size-10 place-items-center rounded-md hover:bg-stone-100"><Pencil size={16} /></button>
          {specialty.key !== "general" && <button type="button" disabled={Boolean(pending)} onClick={() => run("toggle", "/api/admin/specialties", "PATCH", { key: specialty.key, isActive: !specialty.isActive })} aria-label={specialty.isActive ? "Ocultar especialidad" : "Mostrar especialidad"} title={specialty.isActive ? "Ocultar (no aparecerá en talleres ni mecánicos nuevos)" : "Mostrar"} className="grid size-10 place-items-center rounded-md hover:bg-stone-100">{pending === "toggle" ? <LoaderCircle className="animate-spin" size={16} /> : specialty.isActive ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
        </div>
      </div>
      {renaming && (
        <form onSubmit={rename} className="flex gap-2 border-t border-stone-200 p-4">
          <input name="label" required minLength={2} maxLength={80} defaultValue={specialty.label} className={`${input} min-w-0 flex-1`} />
          <button disabled={Boolean(pending)} className="flex min-h-11 items-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-60">{pending === "rename" && <LoaderCircle className="animate-spin" size={16} />} Guardar</button>
        </form>
      )}
      {error && <p role="alert" className="mx-4 mb-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {open && specialty.key !== "general" && (
        <div className="grid gap-4 border-t border-stone-200 p-4">
          <form onSubmit={addRepair} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
            <input name="label" required minLength={2} maxLength={120} placeholder="Nueva reparación" className={input} />
            <input name="system" required minLength={2} maxLength={80} list={`systems-${specialty.key}`} defaultValue={systems[0] ?? specialty.label} placeholder="Grupo" className={input} />
            <datalist id={`systems-${specialty.key}`}>{systems.map((system) => <option key={system} value={system} />)}</datalist>
            <button disabled={Boolean(pending)} className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-60">{pending === "add" ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />} Agregar</button>
          </form>
          {systems.map((system) => (
            <section key={system}>
              <h3 className="mb-1 text-xs font-bold uppercase text-stone-500">{system}</h3>
              <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
                {specialty.repairs.filter((repair) => repair.system === system).map((repair) => (
                  <li key={repair.key} className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm ${repair.isActive ? "" : "text-stone-400 line-through"}`}>
                    <span className="min-w-0">{repair.label}</span>
                    <span className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => editRepair(repair)} aria-label={`Renombrar ${repair.label}`} className="grid size-9 place-items-center rounded-md hover:bg-stone-100"><Pencil size={14} /></button>
                      <button type="button" disabled={Boolean(pending)} onClick={() => run(repair.key, "/api/admin/repairs", "PATCH", { key: repair.key, isActive: !repair.isActive })} aria-label={repair.isActive ? "Ocultar reparación" : "Mostrar reparación"} className="grid size-9 place-items-center rounded-md hover:bg-stone-100">{pending === repair.key ? <LoaderCircle className="animate-spin" size={14} /> : repair.isActive ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {!specialty.repairs.length && <p className="text-sm text-stone-500">Todavía no tiene reparaciones. Agrega la primera arriba.</p>}
        </div>
      )}
    </article>
  );
}
