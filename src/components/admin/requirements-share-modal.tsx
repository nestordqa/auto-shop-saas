"use client";

import { Check, ClipboardList, Copy, MessageCircle, X } from "lucide-react";
import { useState } from "react";

import { useMessageTemplate } from "@/components/messages/use-message-template";
import { buildRequirementsMessage } from "@/lib/contracts";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

/** Message for a prospective owner listing what we need to create their garage. */
export function RequirementsShareModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const template = useMessageTemplate("prospect_requirements");
  const message = buildRequirementsMessage(name.trim() || undefined, template);
  const whatsappPhone = phone ? normalizeWhatsAppPhone(phone) : "";

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

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-5 font-bold"><ClipboardList size={19} /> Enviar requisitos</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="requirements-dialog-title">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white sm:max-w-xl sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div className="flex items-center gap-3"><ClipboardList /><h2 id="requirements-dialog-title" className="text-xl font-bold">Requisitos para crear el taller</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <div className="grid gap-3 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del owner (opcional)" className="min-h-12 rounded-md border border-stone-300 px-4" />
                <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder="Teléfono (opcional)" className="min-h-12 rounded-md border border-stone-300 px-4" />
              </div>
              <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-stone-50 p-4 font-sans text-sm text-stone-700">{message}</pre>
              <div className="grid gap-2 sm:grid-cols-2">
                <a href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1f9d55] px-4 font-bold text-white hover:bg-[#178247]"><MessageCircle size={18} /> {whatsappPhone ? "Enviar por WhatsApp" : "WhatsApp (elegir contacto)"}</a>
                <button type="button" onClick={copy} className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-4 font-bold transition ${copied ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300"}`}>{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copiado" : "Copiar mensaje"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
