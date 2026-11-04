"use client";

import { LoaderCircle, Pencil, Plus, Target, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PROSPECT_SOURCES, PROSPECT_STATUS_LABELS, PROSPECT_STATUSES, type Prospect, type ProspectStatus } from "@/lib/prospects";

const input = "min-h-12 rounded-md border border-stone-300 px-4 font-normal";

/** Create a prospect, or edit one when `prospect` is given. */
export function ProspectFormModal({ prospect }: { prospect?: Prospect }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ProspectStatus>(prospect?.status ?? "new");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const response = await fetch(prospect ? `/api/admin/prospects/${prospect.id}` : "/api/admin/prospects", {
      method: prospect ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo guardar el prospecto.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {prospect
        ? <button type="button" onClick={() => setOpen(true)} aria-label={`Editar ${prospect.name}`} title="Editar" className="grid size-10 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900"><Pencil size={17} /></button>
        : <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white"><Plus size={19} /> Nuevo prospecto</button>}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="prospect-dialog-title">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white text-left sm:max-w-2xl sm:rounded-lg">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div className="flex items-center gap-3"><Target /><h2 id="prospect-dialog-title" className="text-xl font-bold">{prospect ? "Editar prospecto" : "Nuevo prospecto"}</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <form onSubmit={save} className="grid gap-5 p-5">
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-bold">Taller</legend>
                <input name="name" required minLength={2} maxLength={120} defaultValue={prospect?.name} placeholder="Nombre del taller *" className={`${input} sm:col-span-2`} />
                <input name="specialty" maxLength={120} defaultValue={prospect?.specialty ?? ""} placeholder="Especialidad" className={input} />
                <label className="grid gap-1 text-sm font-bold">Ubicación<select name="isLocal" defaultValue={prospect && !prospect.is_local ? "false" : "true"} className={`${input} bg-white`}><option value="true">En Mérida</option><option value="false">Fuera de Mérida</option></select></label>
                <label className="grid gap-1 text-sm font-bold">Ciudad / zona<input name="city" maxLength={120} defaultValue={prospect?.city ?? ""} placeholder="Ej.: Ejido, Caracas" className={input} /></label>
                <input name="address" maxLength={300} defaultValue={prospect?.address ?? ""} placeholder="Dirección" className={`${input} sm:col-span-2`} />
                <input name="mapLocation" maxLength={500} defaultValue={prospect?.map_location ?? ""} placeholder="Enlace de Google Maps" className={`${input} sm:col-span-2`} />
              </fieldset>
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-bold">Contacto</legend>
                <input name="contactName" maxLength={120} defaultValue={prospect?.contact_name ?? ""} placeholder="Nombre del administrador o contacto" className={input} />
                <input name="phone" type="tel" maxLength={30} defaultValue={prospect?.phone ?? ""} placeholder="Teléfono / WhatsApp" className={input} />
                <input name="email" type="email" maxLength={200} defaultValue={prospect?.email ?? ""} placeholder="Correo" className={`${input} sm:col-span-2`} />
              </fieldset>
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-bold">Redes sociales (opcional)</legend>
                <input name="instagram" maxLength={200} defaultValue={prospect?.instagram ?? ""} placeholder="Instagram: @taller o enlace" className={input} />
                <input name="facebook" maxLength={200} defaultValue={prospect?.facebook ?? ""} placeholder="Facebook: página o enlace" className={input} />
                <input name="tiktok" maxLength={200} defaultValue={prospect?.tiktok ?? ""} placeholder="TikTok: @taller o enlace" className={input} />
                <input name="website" maxLength={300} defaultValue={prospect?.website ?? ""} placeholder="Sitio web" className={input} />
              </fieldset>
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-bold">Seguimiento</legend>
                <label className="grid gap-1 text-sm font-bold">Estado<select name="status" value={status} onChange={(event) => setStatus(event.target.value as ProspectStatus)} className={`${input} bg-white`}>{PROSPECT_STATUSES.map((value) => <option key={value} value={value}>{PROSPECT_STATUS_LABELS[value]}</option>)}</select></label>
                <label className="grid gap-1 text-sm font-bold">¿Cómo llegó?<select name="source" defaultValue={prospect?.source ?? ""} className={`${input} bg-white`}><option value="">Sin especificar</option>{PROSPECT_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
                <label className="grid gap-1 text-sm font-bold">Próximo seguimiento<input type="date" name="nextFollowUp" defaultValue={prospect?.next_follow_up ?? ""} className={input} /></label>
                {status === "lost" && <label className="grid gap-1 text-sm font-bold">Motivo del descarte<input name="lostReason" maxLength={300} defaultValue={prospect?.lost_reason ?? ""} placeholder="Ej.: precio, ya usa otro sistema" className={input} /></label>}
                <label className="grid gap-1 text-sm font-bold sm:col-span-2">Notas<textarea name="notes" maxLength={2000} rows={3} defaultValue={prospect?.notes ?? ""} placeholder="Conversaciones, objeciones, tamaño del taller…" className="rounded-md border border-stone-300 px-4 py-3 font-normal" /></label>
              </fieldset>
              {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} {prospect ? "Guardar cambios" : "Guardar prospecto"}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
