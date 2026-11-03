"use client";

import { Building2, Check, KeyRound, LoaderCircle, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { SpecialtyPicker } from "@/components/garage/specialty-picker";
import { PasswordInput } from "@/components/ui/password-input";
import type { SpecialtyOption } from "@/lib/mechanics";

export type ProfileValues = { fullName: string; email: string; phone: string; phone2: string; documentId: string };
export type GarageValues = { name: string; specialties: string[]; address: string; mapLocation: string };

const input = "min-h-12 w-full rounded-md border border-stone-300 bg-white px-4 font-normal";

/** Sends a form as JSON and tracks pending / saved / error for its button. */
function useSave(url: string, method: "PATCH" | "POST") {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>, after?: (form: HTMLFormElement) => void) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = JSON.stringify({ ...Object.fromEntries(data), ...(data.has("specialties") || form.querySelector("[name=specialties]") ? { specialties: data.getAll("specialties") } : {}) });
    setPending(true);
    setSaved(false);
    setError(undefined);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) return setError(result.error ?? "No se pudo guardar.");
      setSaved(true);
      after?.(form);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }
  return { pending, saved, error, submit };
}

function Card({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-stone-200 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-stone-900 text-white">{icon}</span>
        <div><h2 className="text-lg font-bold">{title}</h2><p className="text-sm text-stone-500">{description}</p></div>
      </header>
      {children}
    </section>
  );
}

function SaveRow({ pending, saved, error, label }: { pending: boolean; saved: boolean; error?: string; label: string }) {
  return (
    <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
      <p role={error ? "alert" : "status"} className={`text-sm font-semibold ${error ? "text-red-700" : "text-emerald-700"}`}>{error ?? (saved ? "Cambios guardados." : "")}</p>
      <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-6 font-bold text-white disabled:opacity-60">
        {pending ? <LoaderCircle className="animate-spin" size={18} /> : saved ? <Check size={18} /> : null} {pending ? "Guardando…" : label}
      </button>
    </div>
  );
}

export function ProfileForm({ values }: { values: ProfileValues }) {
  const { pending, saved, error, submit } = useSave("/api/account", "PATCH");
  return (
    <Card icon={<UserRound size={20} />} title="Datos personales" description="Tu nombre y cómo contactarte.">
      <form onSubmit={(event) => submit(event)} className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold sm:col-span-2">Nombre completo<input name="fullName" required minLength={2} defaultValue={values.fullName} className={input} /></label>
        <label className="grid gap-1 text-sm font-bold">Correo<input value={values.email} readOnly disabled className={`${input} bg-stone-100 text-stone-500`} /><span className="text-xs font-normal text-stone-500">Para cambiar el correo, escríbele a soporte.</span></label>
        <label className="grid gap-1 text-sm font-bold">Cédula / RIF<input name="documentId" defaultValue={values.documentId} className={input} /></label>
        <label className="grid gap-1 text-sm font-bold">Teléfono<input name="phone" type="tel" required defaultValue={values.phone} className={input} /></label>
        <label className="grid gap-1 text-sm font-bold">Teléfono alternativo (opcional)<input name="phone2" type="tel" defaultValue={values.phone2} className={input} /></label>
        <SaveRow pending={pending} saved={saved} error={error} label="Guardar datos" />
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const { pending, saved, error, submit } = useSave("/api/account/password", "POST");
  return (
    <Card icon={<KeyRound size={20} />} title="Contraseña" description="Cámbiala cuando quieras, sobre todo si recibiste una temporal.">
      <form onSubmit={(event) => submit(event, (form) => form.reset())} className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold">Contraseña actual<PasswordInput name="currentPassword" required autoComplete="current-password" className={input} /></label>
        <label className="grid gap-1 text-sm font-bold">Nueva contraseña<PasswordInput name="newPassword" required minLength={8} autoComplete="new-password" className={input} /></label>
        <SaveRow pending={pending} saved={saved} error={error} label="Cambiar contraseña" />
      </form>
    </Card>
  );
}

export function GarageForm({ values, specialtyOptions }: { values: GarageValues; specialtyOptions: SpecialtyOption[] }) {
  const { pending, saved, error, submit } = useSave("/api/owner/garage", "PATCH");
  return (
    <Card icon={<Building2 size={20} />} title="Datos del taller" description="Lo que ven tus clientes al reservar. Solo el owner puede editarlos.">
      <form onSubmit={(event) => submit(event)} className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold sm:col-span-2">Nombre comercial<input name="name" required minLength={2} defaultValue={values.name} className={input} /></label>
        <div className="sm:col-span-2"><SpecialtyPicker options={specialtyOptions} defaultValue={values.specialties} /></div>
        <label className="grid gap-1 text-sm font-bold sm:col-span-2">Dirección<textarea name="address" required minLength={5} rows={2} defaultValue={values.address} className={`${input} resize-none py-3`} /><span className="text-xs font-normal text-stone-500">También actualiza la sucursal principal. Las demás sucursales se editan en Sucursales.</span></label>
        <label className="grid gap-1 text-sm font-bold sm:col-span-2">Ubicación en el mapa (opcional)<input name="mapLocation" defaultValue={values.mapLocation} placeholder="URL de Google Maps o coordenadas" className={input} /></label>
        <SaveRow pending={pending} saved={saved} error={error} label="Guardar taller" />
      </form>
    </Card>
  );
}
