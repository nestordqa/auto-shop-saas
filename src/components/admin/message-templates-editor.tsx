"use client";

import { Check, ChevronDown, LoaderCircle, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

import { forgetMessageTemplates } from "@/components/messages/use-message-template";
import { MESSAGE_TEMPLATES, TEMPLATE_KEYS, type TemplateKey } from "@/lib/message-templates";

/** Admin: every WhatsApp message, grouped, editable and restorable to its original text. */
export function MessageTemplatesEditor({ templates }: { templates: Record<TemplateKey, string> }) {
  const groups = [...new Set(TEMPLATE_KEYS.map((key) => MESSAGE_TEMPLATES[key].group))];
  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <section key={group}>
          <h2 className="mb-3 text-sm font-bold uppercase text-stone-500">{group}</h2>
          <div className="grid gap-3">
            {TEMPLATE_KEYS.filter((key) => MESSAGE_TEMPLATES[key].group === group).map((key) => <TemplateCard key={key} templateKey={key} initial={templates[key]} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function TemplateCard({ templateKey, initial }: { templateKey: TemplateKey; initial: string }) {
  const definition = MESSAGE_TEMPLATES[templateKey];
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const [savedValue, setSavedValue] = useState(initial);
  const [pending, setPending] = useState<"save" | "restore">();
  const [notice, setNotice] = useState<{ error?: string; success?: string }>();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const customized = savedValue !== definition.body;
  const dirty = value !== savedValue;

  async function save(body: string, mode: "save" | "restore") {
    setPending(mode);
    setNotice(undefined);
    try {
      const response = await fetch("/api/admin/message-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: templateKey, body }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) return setNotice({ error: result.error ?? "No se pudo guardar el mensaje." });
      const stored = body.trim() || definition.body;
      setValue(stored);
      setSavedValue(stored);
      forgetMessageTemplates();
      setNotice({ success: mode === "restore" ? "Mensaje original restaurado." : "Mensaje guardado." });
    } catch {
      setNotice({ error: "Sin conexión. Intenta de nuevo." });
    } finally {
      setPending(undefined);
    }
  }

  // Inserts {variable} at the cursor.
  function insert(name: string) {
    const element = textarea.current;
    const token = `{${name}}`;
    if (!element) return setValue((current) => current + token);
    const { selectionStart, selectionEnd } = element;
    const next = value.slice(0, selectionStart) + token + value.slice(selectionEnd);
    setValue(next);
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(selectionStart + token.length, selectionStart + token.length); });
  }

  return (
    <article className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 font-bold">{definition.label}{customized && <span className="rounded-sm bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Editado</span>}</span>
          <span className="mt-0.5 block text-sm text-stone-500">{definition.description}</span>
        </span>
        <ChevronDown size={18} className={`mt-1 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-3 border-t border-stone-200 p-4">
          {Object.keys(definition.placeholders).length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-xs font-bold text-stone-500">Variables (toca para insertarlas donde está el cursor):</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(definition.placeholders).map(([name, description]) => (
                  <button key={name} type="button" onClick={() => insert(name)} title={description} className="rounded-sm border border-stone-300 bg-stone-50 px-2 py-1 font-mono text-xs hover:border-[#ef3f26]">{`{${name}}`}</button>
                ))}
              </div>
              <ul className="grid gap-0.5 text-xs text-stone-500">{Object.entries(definition.placeholders).map(([name, description]) => <li key={name}><span className="font-mono">{`{${name}}`}</span>: {description}</li>)}</ul>
            </div>
          )}
          <textarea ref={textarea} rows={14} maxLength={4000} value={value} onChange={(event) => setValue(event.target.value)} className="rounded-md border border-stone-300 p-3 text-sm" />
          <p className="text-xs text-stone-500">*texto* se ve en negrita en WhatsApp. {value.length}/4000</p>
          {notice && <p role={notice.error ? "alert" : "status"} className={`text-sm font-semibold ${notice.error ? "text-red-700" : "text-emerald-700"}`}>{notice.error ?? notice.success}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(pending) || !dirty || !value.trim()} onClick={() => save(value, "save")} className="flex min-h-11 items-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-50">{pending === "save" ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />} {pending === "save" ? "Guardando…" : "Guardar"}</button>
            {dirty && <button type="button" disabled={Boolean(pending)} onClick={() => setValue(savedValue)} className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-bold">Descartar cambios</button>}
            {customized && <button type="button" disabled={Boolean(pending)} onClick={() => { if (window.confirm("¿Restaurar el mensaje original? Se perderá tu versión.")) void save("", "restore"); }} className="flex min-h-11 items-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-bold">{pending === "restore" ? <LoaderCircle className="animate-spin" size={15} /> : <RotateCcw size={15} />} Restaurar original</button>}
          </div>
        </div>
      )}
    </article>
  );
}
