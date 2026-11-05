"use client";

import { ArrowRight, LoaderCircle, TicketPercent } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SpecialtyPicker } from "@/components/garage/specialty-picker";
import { PasswordInput } from "@/components/ui/password-input";
import { TRIAL_DAYS } from "@/lib/contracts";
import type { SpecialtyOption } from "@/lib/mechanics";

const input = "min-h-12 w-full min-w-0 rounded-md border border-stone-300 px-4";

/** Self sign-up of a garage: creates the owner account, the garage and its free trial right away. */
export function GarageSignupForm({ specialties, coupon }: { specialties: SpecialtyOption[]; coupon?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register-garage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(formData), specialties: formData.getAll("specialties") }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string; redirectTo?: string };
    setPending(false);
    if (!response.ok || !result.redirectTo) {
      if (response.status === 201) return router.replace("/login");
      return setError(result.error ?? "No se pudo registrar el taller.");
    }
    router.replace(result.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-bold">Datos del taller</legend>
        <input name="name" required minLength={2} maxLength={120} placeholder="Nombre comercial" className={input} />
        <textarea name="address" required minLength={5} maxLength={300} rows={2} placeholder="Dirección completa (con ciudad)" className="min-h-20 resize-none rounded-md border border-stone-300 p-4" />
        <input name="mapLocation" maxLength={500} placeholder="Enlace de Google Maps (opcional)" className={input} />
        <SpecialtyPicker options={specialties} defaultValue={["general"]} />
        <div className="grid gap-2 rounded-md border border-dashed border-stone-300 p-3">
          <p className="text-xs font-bold text-stone-600">Si es una empresa (opcional)</p>
          <div className="grid gap-2 sm:grid-cols-2"><input name="legalName" maxLength={160} placeholder="Razón social" className={input} /><input name="legalId" maxLength={30} placeholder="RIF (J-12345678-9)" className={`${input} uppercase`} /></div>
        </div>
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-bold">Datos del administrador</legend>
        <input name="ownerName" required minLength={2} maxLength={120} placeholder="Nombre completo" autoComplete="name" className={input} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="ownerDocument" required minLength={4} maxLength={30} placeholder="Cédula" className={input} />
          <input name="ownerPhone" required type="tel" maxLength={30} placeholder="Teléfono" autoComplete="tel" className={input} />
        </div>
        <input name="ownerEmail" required type="email" maxLength={200} placeholder="Correo (será tu usuario)" autoComplete="email" className={input} />
        <PasswordInput name="password" required minLength={8} placeholder="Contraseña (mínimo 8 caracteres)" autoComplete="new-password" className={input} />
      </fieldset>
      <label className="grid gap-1 text-sm font-bold"><span className="flex items-center gap-2"><TicketPercent size={17} /> Cupón de vendedor (opcional)</span><input name="coupon" maxLength={30} defaultValue={coupon} placeholder="Ej.: JUAN-2026" className={`${input} font-normal uppercase`} /></label>
      <label className="flex items-start gap-3 text-sm text-stone-700"><input type="checkbox" name="acceptTerms" required className="mt-0.5 size-5 shrink-0 accent-[#ef3f26]" /><span>Acepto los <Link href="/terminos" target="_blank" className="font-bold text-[#d9341d] hover:underline">términos y condiciones</Link> de TorkeOS.</span></label>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={20} /> : <>Registrar mi taller <ArrowRight size={20} /></>}</button>
      <p className="text-center text-xs text-stone-500">Tu taller queda activo al instante con {TRIAL_DAYS} días de prueba gratis. Al terminar eliges tu plan.</p>
    </form>
  );
}
