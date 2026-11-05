"use client";

import { Building2, CheckCircle2, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GarageLinkShare } from "@/components/admin/garage-link-share";
import { SpecialtyPicker } from "@/components/garage/specialty-picker";
import { PasswordInput } from "@/components/ui/password-input";
import { PLAN_KEYS, PLANS, planSummary } from "@/lib/plans";
import { specialtyKeysFrom, type SpecialtyOption } from "@/lib/mechanics";
import { TRIAL_DAYS } from "@/lib/contracts";

type OwnerOption = { id: string; fullName: string; documentId: string | null };
export type ProspectOption = { id: string; name: string; contactName: string | null; phone: string | null; email: string | null; address: string | null; mapLocation: string | null; specialty: string | null; city: string | null; statusLabel: string };

export function GarageCreateModal({ owners, prospects = [], specialties, sellers = [] }: { owners: OwnerOption[]; prospects?: ProspectOption[]; specialties: SpecialtyOption[]; sellers?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ownerMode, setOwnerMode] = useState<"existing" | "new">(owners.length ? "existing" : "new");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<{ name: string; slug: string; ownerPhone: string | null; contractId: string | null; trialEnds: string | null; credentials?: { email: string; password: string } } | null>(null);
  const [prospect, setProspect] = useState<ProspectOption>();

  function selectProspect(id: string) {
    const selected = prospects.find((item) => item.id === id);
    setProspect(selected);
    // A prospect is a new business: its contact becomes a new owner.
    if (selected) setOwnerMode("new");
  }

  function close() {
    setOpen(false);
    setCreated(null);
    setProspect(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = Object.fromEntries(formData);
    const response = await fetch("/api/admin/garages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, specialties: formData.getAll("specialties"), ownerMode }),
    });
    const result = await response.json() as { error?: string; garage?: { name: string; slug: string; ownerPhone: string | null; contractId: string | null; trialEnds: string | null } };
    setPending(false);
    if (!response.ok || !result.garage) {
      setError(result.error ?? "No se pudo crear el taller.");
      return;
    }
    form.reset();
    setProspect(undefined);
    setCreated({ ...result.garage, credentials: ownerMode === "new" ? { email: String(values.ownerEmail), password: String(values.temporaryPassword) } : undefined });
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><Plus size={20} /> Crear taller</button>
      {open && <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="garage-modal-title">
        <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-2xl sm:max-w-2xl sm:rounded-lg">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-stone-900 text-white"><Building2 size={20} /></span><h2 id="garage-modal-title" className="text-xl font-bold">{created ? "Taller creado" : "Nuevo taller"}</h2></div><button type="button" onClick={close} className="grid size-11 place-items-center rounded-md hover:bg-stone-100" aria-label="Cerrar"><X /></button></div>
          {created ? (
            <div className="grid gap-5 p-4 sm:p-6">
              <div className="flex items-start gap-3 rounded-md bg-emerald-50 p-4 text-emerald-900">
                <CheckCircle2 className="mt-0.5 shrink-0" size={22} />
                <p><strong>{created.name}</strong> ya está activo. Envíale al administrador por WhatsApp su enlace de reservas{created.credentials ? ", su acceso" : ""}{created.contractId ? " y su contrato para firmar" : ""}.</p>
              </div>
              {created.contractId ? <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">Contrato generado{created.trialEnds ? <> · <strong>prueba gratis ($0) hasta el {created.trialEnds}</strong></> : null}. <a href={`/dashboard/admin/contracts/${created.contractId}`} className="font-bold text-[#d9341d] underline">Ver y enviar contrato</a></p> : <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">No se pudo generar el contrato automáticamente. Créalo desde Contratos.</p>}
              <GarageLinkShare name={created.name} slug={created.slug} ownerPhone={created.ownerPhone} variant="full" credentials={created.credentials} contract={created.contractId ? { id: created.contractId, trialEnds: created.trialEnds } : undefined} />
              <button type="button" onClick={close} className="min-h-12 rounded-md border border-stone-300 px-5 font-bold">Listo</button>
            </div>
          ) : (
          <form key={prospect?.id ?? "blank"} onSubmit={submit} className="grid gap-5 p-4 sm:p-6">
            {prospects.length > 0 && <label className="grid gap-1 rounded-md border border-dashed border-stone-300 bg-stone-50 p-3 text-sm font-bold">Cargar datos desde un prospecto (opcional)<select value={prospect?.id ?? ""} onChange={(event) => selectProspect(event.target.value)} className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal"><option value="">— Sin prospecto —</option>{prospects.map((item) => <option key={item.id} value={item.id}>{item.name}{item.contactName ? ` · ${item.contactName}` : ""} ({item.statusLabel})</option>)}</select>{prospect && <span className="text-xs font-normal text-stone-600">Revisa y completa lo que falte (cédula, correo, contraseña). Al crear el taller, el prospecto quedará como Convertido.</span>}</label>}
            <input type="hidden" name="prospectId" value={prospect?.id ?? ""} />
            {sellers.length > 0 && <label className="grid gap-1 text-sm font-bold">¿Lo trajo un vendedor? (opcional)<select name="sellerId" defaultValue="" className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal"><option value="">— Ninguno (TorkeOS) —</option>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></label>}
            <fieldset className="grid gap-3"><legend className="mb-2 text-sm font-bold">Datos del taller</legend><input name="name" required minLength={2} defaultValue={prospect?.name} placeholder="Nombre comercial" className="min-h-12 rounded-md border border-stone-300 px-4" /><div className="grid gap-2 rounded-md border border-dashed border-stone-300 p-3"><p className="text-xs font-bold text-stone-600">Si es una empresa (opcional)</p><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]"><input name="legalName" minLength={2} maxLength={160} placeholder="Razón social" className="min-h-12 min-w-0 rounded-md border border-stone-300 px-4" /><input name="legalId" minLength={4} maxLength={30} placeholder="RIF (J-12345678-9)" className="min-h-12 min-w-0 rounded-md border border-stone-300 px-4 uppercase" /></div></div><SpecialtyPicker options={specialties} defaultValue={specialtyKeysFrom(prospect?.specialty, specialties)} /><fieldset className="grid gap-2"><legend className="mb-1 text-sm font-bold">¿Cómo empieza?</legend><label className="flex cursor-pointer items-start gap-3 rounded-md border border-stone-300 p-3 text-sm has-checked:border-[#ef3f26] has-checked:bg-red-50/40"><input type="radio" name="start" value="trial" defaultChecked className="mt-1 accent-[#ef3f26]" /><span><span className="block font-bold">Mes de prueba gratis</span><span className="text-stone-600">$0 durante {TRIAL_DAYS} días con todas las funciones. Al vencer, el administrador elige su plan desde su panel.</span></span></label>{PLAN_KEYS.map((key) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-md border border-stone-300 p-3 text-sm has-checked:border-[#ef3f26] has-checked:bg-red-50/40"><input type="radio" name="start" value={key} className="mt-1 accent-[#ef3f26]" /><span><span className="block font-bold">Plan {PLANS[key].name} desde hoy <span className="font-normal text-stone-500">· {PLANS[key].audience}</span></span><span className="text-stone-600">{planSummary(key).split(" · ").slice(1).join(" · ")}</span></span></label>)}<span className="text-xs font-normal text-stone-500">El contrato se genera automáticamente al crear el taller.</span></fieldset><textarea name="address" required minLength={5} rows={3} defaultValue={prospect ? [prospect.address, prospect.city].filter(Boolean).join(", ") : undefined} placeholder="Dirección completa" className="min-h-24 resize-none rounded-md border border-stone-300 p-4" /><input name="mapLocation" defaultValue={prospect?.mapLocation ?? ""} placeholder="URL o coordenadas del mapa (opcional)" className="min-h-12 rounded-md border border-stone-300 px-4" /></fieldset>
            <fieldset><legend className="text-sm font-bold">Administrador</legend><div className="mt-2 grid grid-cols-2 rounded-md bg-stone-100 p-1"><button type="button" disabled={!owners.length} onClick={() => setOwnerMode("existing")} className={`min-h-11 rounded-sm px-3 text-sm font-bold ${ownerMode === "existing" ? "bg-white shadow-sm" : "text-stone-500"}`}>Administrador existente</button><button type="button" onClick={() => setOwnerMode("new")} className={`min-h-11 rounded-sm px-3 text-sm font-bold ${ownerMode === "new" ? "bg-white shadow-sm" : "text-stone-500"}`}>Crear administrador</button></div>
              {ownerMode === "existing" ? <select name="ownerId" required className="mt-3 min-h-12 w-full rounded-md border border-stone-300 bg-white px-4"><option value="">Selecciona un administrador disponible</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.fullName}{owner.documentId ? ` · ${owner.documentId}` : ""}</option>)}</select> : <div className="mt-3 grid gap-3 sm:grid-cols-2"><input name="ownerName" required defaultValue={prospect?.contactName ?? ""} placeholder="Nombre completo" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="ownerEmail" required type="email" defaultValue={prospect?.email ?? ""} placeholder="Correo" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="ownerPhone" required type="tel" defaultValue={prospect?.phone ?? ""} placeholder="Teléfono" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="ownerDocument" required placeholder="Cédula / RIF" className="min-h-12 rounded-md border border-stone-300 px-4" /><PasswordInput name="temporaryPassword" required minLength={8} placeholder="Contraseña temporal" className="min-h-12 rounded-md border border-stone-300 px-4" containerClassName="sm:col-span-2" /></div>}
            </fieldset>
            {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
            <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Crear taller</button>
          </form>
          )}
        </div>
      </div>}
    </>
  );
}