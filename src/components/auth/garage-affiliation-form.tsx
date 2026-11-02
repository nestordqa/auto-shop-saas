"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { EXTRA_VEHICLE_FEE, PLAN_KEYS, PLANS, planSummary, RATE_NOTE, type PlanKey } from "@/lib/plans";
import { EXTRA_BRANCH_FEE } from "@/lib/billing-branches";
import { torkeosWhatsAppUrl } from "@/lib/contact";
import { MECHANIC_SPECIALTIES, MECHANIC_SPECIALTY_LABELS } from "@/lib/mechanics";

const input = "min-h-12 w-full rounded-md border border-stone-300 px-4";

/** Garage sign-up request: no account is created, the data goes to TorkeOS by WhatsApp and an admin sets it up. */
export function GarageAffiliationForm() {
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = (key: string) => String(new FormData(event.currentTarget).get(key) ?? "").trim();
    const optional = (label: string, key: string) => value(key) ? [`${label}: ${value(key)}`] : [];
    const message = [
      "¡Hola! Quiero afiliar mi taller a TorkeOS.",
      "",
      "*Datos del taller*",
      `Nombre comercial: ${value("garageName")}`,
      `Especialidad: ${value("specialty")}`,
      `Dirección: ${value("address")}`,
      `Ciudad: ${value("city")}`,
      ...optional("Google Maps", "mapLocation"),
      ...optional("Teléfono del taller", "garagePhone"),
      ...optional("Instagram", "instagram"),
      `Sucursales: ${value("branches")}`,
      `Plan de interés: ${PLANS[value("plan") as PlanKey]?.name ?? "Por definir"}`,
      "",
      "*Datos del dueño*",
      `Nombre completo: ${value("ownerName")}`,
      `Cédula / RIF: ${value("ownerDocument")}`,
      `Correo: ${value("ownerEmail")}`,
      `Teléfono: ${value("ownerPhone")}`,
      ...(value("notes") ? ["", "*Observaciones*", value("notes")] : []),
    ].join("\n");
    const url = torkeosWhatsAppUrl(message);
    if (!url) return setError("El contacto por WhatsApp no está disponible en este momento. Escríbenos a contacto@torkeos.com.");
    setError(undefined);
    window.open(url, "_blank", "noopener,noreferrer");
    setSent(true);
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-bold">Datos del taller</legend>
        <input name="garageName" required minLength={2} maxLength={120} placeholder="Nombre comercial" className={input} />
        <select name="specialty" defaultValue={MECHANIC_SPECIALTY_LABELS.general} className={`${input} bg-white`}>{MECHANIC_SPECIALTIES.map((specialty) => <option key={specialty} value={MECHANIC_SPECIALTY_LABELS[specialty]}>{MECHANIC_SPECIALTY_LABELS[specialty]}</option>)}</select>
        <textarea name="address" required minLength={5} maxLength={300} rows={2} placeholder="Dirección completa" className="min-h-20 resize-none rounded-md border border-stone-300 p-4" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="city" required maxLength={120} placeholder="Ciudad" className={input} />
          <select name="branches" defaultValue="1" aria-label="Número de sucursales" className={`${input} bg-white`}><option value="1">1 sede</option><option value="2">2 sedes</option><option value="3">3 sedes</option><option value="4 o más">4 o más sedes</option></select>
        </div>
        <input name="mapLocation" maxLength={500} placeholder="Enlace de Google Maps (opcional)" className={input} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="garagePhone" type="tel" maxLength={30} placeholder="Teléfono del taller (opcional)" className={input} />
          <input name="instagram" maxLength={120} placeholder="Instagram (opcional)" className={input} />
        </div>
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-bold">Datos del dueño</legend>
        <input name="ownerName" required minLength={2} maxLength={120} placeholder="Nombre completo" autoComplete="name" className={input} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="ownerDocument" required minLength={4} maxLength={30} placeholder="Cédula / RIF" className={input} />
          <input name="ownerPhone" required type="tel" maxLength={30} placeholder="Teléfono" autoComplete="tel" className={input} />
        </div>
        <input name="ownerEmail" required type="email" maxLength={200} placeholder="Correo (será tu usuario)" autoComplete="email" className={input} />
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold">¿Qué plan te interesa?</legend>
        {PLAN_KEYS.map((key) => (
          <label key={key} className="flex cursor-pointer items-start gap-3 rounded-md border border-stone-300 bg-white p-3 text-sm has-checked:border-[#ef3f26] has-checked:bg-red-50/40">
            <input type="radio" name="plan" value={key} defaultChecked={key === "bujia"} className="mt-1 accent-[#ef3f26]" />
            <span><span className="block font-bold">{PLANS[key].name} <span className="font-normal text-stone-500">· {PLANS[key].audience}</span></span><span className="text-stone-600">{planSummary(key).split(" · ").slice(1).join(" · ")}</span></span>
          </label>
        ))}
        <p className="text-xs text-stone-500">Vehículo extra sobre el límite: ${EXTRA_VEHICLE_FEE}. Sucursal adicional: ${EXTRA_BRANCH_FEE}/mes en cualquier plan. Montos en USD a {RATE_NOTE}. Todos empiezan con 30 días gratis.</p>
      </fieldset>
      <label className="grid gap-1 text-sm font-bold">Observaciones (opcional)<textarea name="notes" maxLength={1000} rows={3} placeholder="Horario, cuántos mecánicos tienen, dudas…" className="resize-none rounded-md border border-stone-300 p-4 font-normal" /></label>
      <label className="flex items-start gap-3 text-sm text-stone-700"><input type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-[#ef3f26]" /><span>Acepto los <Link href="/terminos" target="_blank" className="font-bold text-[#d9341d] hover:underline">términos y condiciones</Link> de TorkeOS.</span></label>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {sent && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Se abrió WhatsApp con tus datos. Envía el mensaje y te contactaremos para activar tu taller con <strong>30 días de prueba gratis</strong>.</p>}
      <button className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#25d366] px-5 font-bold text-white"><Send size={19} /> Enviar por WhatsApp</button>
      <p className="text-center text-xs text-stone-500">No se crea ninguna cuenta: nuestro equipo revisa tus datos y configura tu taller.</p>
    </form>
  );
}
