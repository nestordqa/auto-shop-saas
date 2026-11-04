"use client";

import { KeyRound, LoaderCircle, MessageCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useMessageTemplate } from "@/components/messages/use-message-template";
import { credentialsText } from "@/lib/credentials-message";
import { renderTemplate } from "@/lib/message-templates";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

function generatePassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (byte) => alphabet[byte % alphabet.length]).join("");
}

/** Client registered without email: the garage can give them app access later; vehicles and history stay. */
export function ClientAccessPanel({ clientId, clientName, phone, garage }: { clientId: string; clientName: string; phone: string | null; garage: { name: string; slug: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(generatePassword);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [granted, setGranted] = useState<{ email: string; password: string }>();
  const template = useMessageTemplate("client_welcome");
  const credentialsTemplate = useMessageTemplate("credentials");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setPending(true);
    setError(undefined);
    const response = await fetch(`/api/owner/clients/${clientId}/access`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo dar acceso al cliente.");
    setGranted({ email, password });
    router.refresh();
  }

  if (granted) {
    const origin = window.location.origin;
    const message = renderTemplate(template, { nombre: clientName.split(" ")[0], taller: garage.name, enlace: `${origin}/${garage.slug}`, acceso: credentialsText({ origin, ...granted }, credentialsTemplate) });
    return (
      <section className="mt-5 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-bold text-emerald-800">{clientName} ya tiene acceso a la app, con su vehículo e historial.</p>
        {phone && <a href={`https://wa.me/${normalizeWhatsAppPhone(phone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#25d366] px-5 font-bold text-white"><MessageCircle size={18} /> Enviar acceso por WhatsApp</a>}
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-amber-900">Cliente sin acceso a la app</p>
          <p className="text-sm text-amber-900">Avísale por WhatsApp en cada etapa. Si más adelante quiere usar la app, dale acceso: conservará su vehículo e historial.</p>
        </div>
        {!open && <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-bold text-white"><KeyRound size={16} /> Dar acceso a la app</button>}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="grid gap-1 text-sm font-bold">Correo<input name="email" type="email" required maxLength={160} autoComplete="off" autoCapitalize="none" placeholder="cliente@correo.com" className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">Contraseña temporal<div className="flex gap-2"><input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} className="min-h-12 w-full min-w-0 rounded-md border border-stone-300 bg-white px-4 font-mono font-normal" /><button type="button" onClick={() => setPassword(generatePassword())} aria-label="Generar otra contraseña" className="grid size-12 shrink-0 place-items-center rounded-md border border-stone-300 bg-white"><RefreshCw size={17} /></button></div></label>
          <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 self-end rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={18} />} Dar acceso</button>
          {error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-3">{error}</p>}
        </form>
      )}
    </section>
  );
}
