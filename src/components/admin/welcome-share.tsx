"use client";

import { Check, Copy, Mail, MessageCircle, PartyPopper } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { buildWelcomeMessage } from "@/lib/contracts";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

type WelcomeShareProps = { garageName: string; garageSlug: string; owner: { fullName: string; phone: string | null; email: string | null } };

const noopSubscribe = () => () => {};

function useOrigin() {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => process.env.NEXT_PUBLIC_SITE_URL ?? "");
}

/** "All set" message for the owner after signing: links plus how to install the app and enable notifications. */
export function WelcomeShare({ garageName, garageSlug, owner }: WelcomeShareProps) {
  const origin = useOrigin();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const message = buildWelcomeMessage({ ownerName: owner.fullName, garageName, garageUrl: `${origin}/${garageSlug}`, loginUrl: `${origin}/login` });
  const phone = owner.phone ? normalizeWhatsAppPhone(owner.phone) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      window.prompt("Copia el mensaje:", message);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-emerald-600 px-4 font-bold text-emerald-700 hover:bg-emerald-50"><PartyPopper size={18} /> Mensaje de bienvenida (todo listo)</button>;

  return (
    <div className="grid gap-3">
      <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-stone-50 p-4 font-sans text-sm text-stone-700">{message}</pre>
      <div className="grid gap-2 sm:grid-cols-3">
        <a href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1f9d55] px-4 font-bold text-white hover:bg-[#178247]"><MessageCircle size={18} /> WhatsApp</a>
        <a href={`mailto:${owner.email ?? ""}?subject=${encodeURIComponent(`${garageName} ya está activo en TorkeOS`)}&body=${encodeURIComponent(message)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold"><Mail size={18} /> Correo</a>
        <button type="button" onClick={copy} className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-4 font-bold transition ${copied ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300"}`}>{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copiado" : "Copiar"}</button>
      </div>
    </div>
  );
}
