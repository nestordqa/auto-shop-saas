"use client";

import { ChevronDown, LoaderCircle, Megaphone, MessageSquareText, RotateCcw, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DEFAULT_PITCHES, PITCH_KEYS, PITCH_LABELS, PITCH_PLACEHOLDERS, renderPitch, type PitchKey } from "@/lib/prospect-pitch";
import type { ProspectStatus } from "@/lib/prospects";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

/** Prospects page: the two saved pitch templates (Mérida / outside), editable and restorable. */
export function PitchTemplatesEditor({ templates }: { templates: Record<PitchKey, string> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(templates);
  const [saving, setSaving] = useState<PitchKey>();
  const [notice, setNotice] = useState<{ key: PitchKey; error?: string; success?: string }>();

  async function save(key: PitchKey, body: string) {
    setSaving(key);
    setNotice(undefined);
    const response = await fetch("/api/admin/message-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, body }) });
    const result = await response.json() as { error?: string };
    setSaving(undefined);
    if (!response.ok) return setNotice({ key, error: result.error ?? "No se pudo guardar el mensaje." });
    setValues((current) => ({ ...current, [key]: body || DEFAULT_PITCHES[key] }));
    setNotice({ key, success: "Mensaje guardado." });
    router.refresh();
  }

  return (
    <section className="mt-4 rounded-lg border border-stone-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-2 font-bold"><Megaphone size={18} className="text-[#ef3f26]" /> Mensajes de presentación</span>
        <ChevronDown size={18} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-stone-200 p-4 lg:grid-cols-2">
          <p className="text-xs text-stone-500 lg:col-span-2">Se usan al pulsar <strong>Presentar TorkeOS</strong> en cada prospecto, según si es de Mérida o de fuera. Antes de enviar puedes ajustarlo para ese taller. Variables: {PITCH_PLACEHOLDERS}.</p>
          {PITCH_KEYS.map((key) => (
            <div key={key} className="grid gap-2">
              <label htmlFor={`pitch-${key}`} className="text-sm font-bold">{PITCH_LABELS[key]}</label>
              <textarea id={`pitch-${key}`} rows={14} maxLength={4000} value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className="rounded-md border border-stone-300 p-3 text-sm" />
              {notice?.key === key && <p className={`text-sm font-semibold ${notice.error ? "text-red-700" : "text-emerald-700"}`}>{notice.error ?? notice.success}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={saving === key} onClick={() => save(key, values[key])} className="flex min-h-10 items-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-60">{saving === key && <LoaderCircle className="animate-spin" size={16} />} Guardar</button>
                <button type="button" disabled={saving === key} onClick={() => { if (window.confirm("¿Restaurar el mensaje original?")) void save(key, ""); }} className="flex min-h-10 items-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-bold"><RotateCcw size={15} /> Restaurar original</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Row action: prepares the pitch for one prospect, lets the admin tweak it and opens WhatsApp. */
export function ProspectPitchButton({ id, name, contactName, phone, status, isLocal, template }: { id: string; name: string; contactName: string | null; phone: string | null; status: ProspectStatus; isLocal: boolean; template: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const digits = phone ? normalizeWhatsAppPhone(phone) : "";

  function start() {
    setMessage(renderPitch(template, { contactName, garageName: name }));
    setOpen(true);
  }

  function send() {
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
    // A first contact moves a new prospect forward.
    if (status === "new") void fetch(`/api/admin/prospects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "contacted" }) }).then(() => router.refresh());
  }

  return (
    <>
      <button type="button" onClick={start} title="Presentar TorkeOS" aria-label={`Presentar TorkeOS a ${name}`} className="grid size-10 place-items-center rounded-md text-stone-500 hover:bg-orange-50 hover:text-[#d9341d]"><MessageSquareText size={17} /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={`pitch-title-${id}`}>
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white text-left sm:max-w-xl sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div><h2 id={`pitch-title-${id}`} className="text-lg font-bold">Presentar TorkeOS a {name}</h2><p className="text-xs font-semibold text-[#d9341d]">{isLocal ? "Taller en Mérida" : "Taller fuera de Mérida"}</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <div className="grid gap-3 p-5">
              <textarea rows={16} value={message} onChange={(event) => setMessage(event.target.value)} className="rounded-md border border-stone-300 p-3 text-sm" />
              <p className="text-xs text-stone-500">Los cambios aquí solo aplican a este envío. Para cambiar el mensaje base usa «Mensajes de presentación».</p>
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
