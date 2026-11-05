"use client";

import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useState } from "react";

/** The garage's public booking link, to copy or share with clients by WhatsApp. */
export function BookingLinkCard({ url, garageName }: { url: string; garageName: string }) {
  const [copied, setCopied] = useState(false);
  const message = `¡Hola! Ya puedes agendar tu cita en ${garageName} desde aquí: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="break-all rounded-md border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-sm text-stone-800">{url}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={copy} className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-bold hover:bg-stone-50">{copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copiado" : "Copiar enlace"}</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#25d366] px-4 text-sm font-bold text-white"><MessageCircle size={17} /> Compartir</a>
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-bold hover:bg-stone-50"><ExternalLink size={17} /> Ver página</a>
      </div>
    </div>
  );
}
