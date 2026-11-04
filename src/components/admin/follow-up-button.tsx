"use client";

import { MessageCircleQuestion, Send, X } from "lucide-react";
import { useState } from "react";

import { useMessageTemplate } from "@/components/messages/use-message-template";
import { renderTemplate, type TemplateKey } from "@/lib/message-templates";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

type FollowUpButtonProps = {
  /** Row label, shown in the dialog title. */
  name: string;
  phone: string | null;
  values: Record<string, string | null | undefined>;
  /** One template, or a Mérida / outside pair the admin can switch between (e.g. garages without a city field). */
  templates: { key: TemplateKey; label: string }[];
  initialIndex?: number;
};

/** Row action: prepares a follow-up WhatsApp message, editable before sending. */
export function FollowUpButton({ name, phone, values, templates, initialIndex = 0 }: FollowUpButtonProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [message, setMessage] = useState("");
  const bodies = [useMessageTemplate(templates[0].key), useMessageTemplate((templates[1] ?? templates[0]).key)];
  const digits = phone ? normalizeWhatsAppPhone(phone) : "";

  function prepare(next: number) {
    setIndex(next);
    setMessage(renderTemplate(bodies[next], values));
  }

  function send() {
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => { prepare(initialIndex); setOpen(true); }} title="Enviar seguimiento por WhatsApp" aria-label={`Enviar seguimiento a ${name}`} className="grid size-10 place-items-center rounded-md text-stone-500 hover:bg-emerald-50 hover:text-emerald-700"><MessageCircleQuestion size={17} /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Seguimiento a ${name}`}>
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white text-left sm:max-w-xl sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <h2 className="text-lg font-bold">Seguimiento a {name}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <div className="grid gap-3 p-5">
              {templates.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template, i) => <button key={template.key} type="button" onClick={() => prepare(i)} className={`min-h-10 rounded-md border px-3 text-sm font-bold ${i === index ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"}`}>{template.label}</button>)}
                </div>
              )}
              <textarea rows={12} value={message} onChange={(event) => setMessage(event.target.value)} className="rounded-md border border-stone-300 p-3 text-sm" />
              <p className="text-xs text-stone-500">Los cambios aquí solo aplican a este envío. El mensaje base se edita en «Mensajes de WhatsApp».</p>
              {digits
                ? <button type="button" disabled={!message.trim()} onClick={send} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#25d366] px-5 font-bold text-white disabled:opacity-60"><Send size={18} /> Enviar por WhatsApp</button>
                : <button type="button" onClick={() => navigator.clipboard?.writeText(message)} className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Sin teléfono: copiar mensaje</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
