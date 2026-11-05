"use client";

import { Building2, CheckCircle2, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SpecialtyPicker } from "@/components/garage/specialty-picker";
import { PasswordInput } from "@/components/ui/password-input";
import { TRIAL_DAYS } from "@/lib/contracts";
import { specialtyKeysFrom, type SpecialtyOption } from "@/lib/mechanics";

const input = "min-h-12 w-full min-w-0 rounded-md border border-stone-300 px-4";

export type SellerProspectOption = { id: string; name: string; contactName: string | null; phone: string | null; email: string | null; address: string | null; mapLocation: string | null; specialty: string | null; city: string | null };

/** A seller creates a garage (always with the free trial); it is attributed to them and admins are notified. */
export function SellerGarageCreateModal({ specialties, prospects }: { specialties: SpecialtyOption[]; prospects: SellerProspectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [prospect, setProspect] = useState<SellerProspectOption>();
  const [created, setCreated] = useState<{ name: string; slug: string; email: string; password: string; trialEnds: string | null } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData);
    const response = await fetch("/api/seller/garages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, specialties: formData.getAll("specialties") }) });
    const result = await response.json().catch(() => ({})) as { error?: string; garage?: { name: string; slug: string; trialEnds: string | null } };
    setPending(false);
    if (!response.ok || !result.garage) return setError(result.error ?? "No se pudo crear el taller.");
    setCreated({ ...result.garage, email: String(values.ownerEmail), password: String(values.temporaryPassword) });
    setProspect(undefined);
    router.refresh();
  }

  function close() {
    setOpen(false);
    setCreated(null);
    setProspect(undefined);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><Plus size={20} /> Crear taller</button>
      {open && <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="seller-garage-title">
        <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-2xl sm:max-w-2xl sm:rounded-lg">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-stone-900 text-white"><Building2 size={20} /></span><h2 id="seller-garage-title" className="text-xl font-bold">{created ? "Taller creado" : "Nuevo taller"}</h2></div><button type="button" onClick={close} aria-label="Cerrar" className="grid size-11 place-items-center rounded-md hover:bg-stone-100"><X /></button></div>
          {created ? (
            <div className="grid gap-4 p-5">
              <p className="flex items-start gap-3 rounded-md bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mt-0.5 shrink-0" size={22} /><span><strong>{created.name}</strong> ya está activo{created.trialEnds ? ` con prueba gratis hasta el ${created.trialEnds}` : ""} y quedó a tu nombre. Envíale al administrador sus datos de acceso.</span></p>
              <p className="rounded-md border border-stone-200 bg-stone-50 p-4 font-mono text-sm">Usuario: {created.email}<br />Contraseña: {created.password}</p>
              <button type="button" onClick={close} className="min-h-12 rounded-md border border-stone-300 px-5 font-bold">Listo</button>
            </div>
          ) : (
            <form key={prospect?.id ?? "blank"} onSubmit={submit} className="grid gap-5 p-5">
              {prospects.length > 0 && <label className="grid gap-1 rounded-md border border-dashed border-stone-300 bg-stone-50 p-3 text-sm font-bold">Cargar datos desde uno de mis prospectos (opcional)<select value={prospect?.id ?? ""} onChange={(event) => setProspect(prospects.find((item) => item.id === event.target.value))} className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal"><option value="">— Sin prospecto —</option>{prospects.map((item) => <option key={item.id} value={item.id}>{item.name}{item.contactName ? ` · ${item.contactName}` : ""}</option>)}</select></label>}
              <input type="hidden" name="prospectId" value={prospect?.id ?? ""} />
              <fieldset className="grid gap-3">
                <legend className="mb-2 text-sm font-bold">Datos del taller</legend>
                <input name="name" required minLength={2} maxLength={120} defaultValue={prospect?.name} placeholder="Nombre comercial" className={input} />
                <textarea name="address" required minLength={5} maxLength={300} rows={2} defaultValue={prospect ? [prospect.address, prospect.city].filter(Boolean).join(", ") : undefined} placeholder="Dirección completa" className="min-h-20 resize-none rounded-md border border-stone-300 p-4" />
                <input name="mapLocation" maxLength={500} defaultValue={prospect?.mapLocation ?? ""} placeholder="Enlace de Google Maps (opcional)" className={input} />
                <SpecialtyPicker options={specialties} defaultValue={specialtyKeysFrom(prospect?.specialty, specialties)} />
                <div className="grid gap-2 sm:grid-cols-2"><input name="legalName" maxLength={160} placeholder="Razón social (opcional)" className={input} /><input name="legalId" maxLength={30} placeholder="RIF (opcional)" className={`${input} uppercase`} /></div>
              </fieldset>
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-bold">Administrador del taller</legend>
                <input name="ownerName" required minLength={2} defaultValue={prospect?.contactName ?? ""} placeholder="Nombre completo" className={input} />
                <input name="ownerEmail" required type="email" defaultValue={prospect?.email ?? ""} placeholder="Correo (su usuario)" className={input} />
                <input name="ownerPhone" required type="tel" defaultValue={prospect?.phone ?? ""} placeholder="Teléfono" className={input} />
                <input name="ownerDocument" required minLength={4} placeholder="Cédula / RIF" className={input} />
                <PasswordInput name="temporaryPassword" required minLength={8} placeholder="Contraseña temporal" className={input} containerClassName="sm:col-span-2" />
              </fieldset>
              <p className="text-xs text-stone-500">El taller empieza con {TRIAL_DAYS} días de prueba gratis. TorkeOS recibe un aviso y lo verá a tu nombre.</p>
              {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
              <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Crear taller</button>
            </form>
          )}
        </div>
      </div>}
    </>
  );
}
