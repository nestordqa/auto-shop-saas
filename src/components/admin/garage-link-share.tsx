"use client";

import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

type GarageLinkShareProps = {
  name: string;
  slug: string;
  ownerPhone: string | null;
  /** `compact` = icon buttons for table rows; `full` = card shown right after creating the garage. */
  variant?: "compact" | "full";
};

const noopSubscribe = () => () => {};

function useOrigin() {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => process.env.NEXT_PUBLIC_SITE_URL ?? "");
}

export function GarageLinkShare({ name, slug, ownerPhone, variant = "compact" }: GarageLinkShareProps) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const url = `${origin}/${slug}`;
  const message = [
    `¡Hola! Tu taller ${name} ya está activo en TorkeOS.`,
    "",
    `Comparte este enlace con tus clientes para que reserven sus citas: ${url}`,
    "",
    `Entra a tu panel en ${origin}/login con el correo y la contraseña temporal que te dimos.`,
  ].join("\n");
  const phone = ownerPhone ? normalizeWhatsAppPhone(ownerPhone) : "";
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copia el enlace del taller:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center justify-end gap-1">
        <button type="button" onClick={copy} aria-label={`Copiar enlace de ${name}`} title={url} className={`grid size-10 place-items-center rounded-md transition ${copied ? "bg-emerald-50 text-emerald-700" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"}`}>
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={`Enviar enlace de ${name} por WhatsApp`} title={phone ? `Enviar al owner (${ownerPhone})` : "Elegir contacto en WhatsApp"} className="grid size-10 place-items-center rounded-md text-stone-500 transition hover:bg-emerald-50 hover:text-emerald-700">
          <MessageCircle size={18} />
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex min-h-12 items-center gap-2 rounded-md border border-stone-300 bg-stone-50 pl-4 pr-1">
        <span className="min-w-0 flex-1 truncate font-mono text-sm">{url}</span>
        <button type="button" onClick={copy} className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded px-3 text-sm font-bold transition ${copied ? "bg-emerald-600 text-white" : "bg-stone-900 text-white"}`}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1f9d55] px-4 font-bold text-white hover:bg-[#178247]">
          <MessageCircle size={18} /> {phone ? "Enviar al owner por WhatsApp" : "Enviar por WhatsApp"}
        </a>
        <a href={url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold">
          <ExternalLink size={18} /> Abrir página del taller
        </a>
      </div>
    </div>
  );
}
