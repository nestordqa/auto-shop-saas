"use client";

import { ClipboardList, LoaderCircle, MessageCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useMessageTemplate } from "@/components/messages/use-message-template";
import { buildRequirementsMessage } from "@/lib/contracts";
import { PROSPECT_STATUS_LABELS, PROSPECT_STATUS_STYLES, PROSPECT_STATUSES, type ProspectStatus } from "@/lib/prospects";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

const ADMIN_API = "/api/admin/prospects";

async function patchStatus(id: string, status: ProspectStatus, apiBase = ADMIN_API) {
  const response = await fetch(`${apiBase}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  return response.ok;
}

/** Inline status picker for the prospects table. */
export function ProspectStatusSelect({ id, status, apiBase = ADMIN_API }: { id: string; status: ProspectStatus; apiBase?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function change(next: ProspectStatus) {
    setPending(true);
    const ok = await patchStatus(id, next, apiBase);
    setPending(false);
    if (!ok) return window.alert("No se pudo cambiar el estado.");
    router.refresh();
  }

  return <select aria-label="Estado" disabled={pending} value={status} onChange={(event) => change(event.target.value as ProspectStatus)} className={`min-h-9 rounded-md border-0 px-2 text-xs font-bold disabled:opacity-60 ${PROSPECT_STATUS_STYLES[status]}`}>{PROSPECT_STATUSES.map((value) => <option key={value} value={value}>{PROSPECT_STATUS_LABELS[value]}</option>)}</select>;
}

/** WhatsApp chat, "send requirements" (moves the prospect forward) and delete. */
export function ProspectRowActions({ id, name, contactName, phone, status, apiBase = ADMIN_API }: { id: string; name: string; contactName: string | null; phone: string | null; status: ProspectStatus; apiBase?: string }) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const digits = phone ? normalizeWhatsAppPhone(phone) : "";
  const requirementsTemplate = useMessageTemplate("prospect_requirements");
  const requirements = `https://wa.me/${digits}?text=${encodeURIComponent(buildRequirementsMessage(contactName ?? undefined, requirementsTemplate))}`;
  const canAdvance = ["new", "contacted", "interested"].includes(status);

  async function remove() {
    if (!window.confirm(`¿Eliminar el prospecto ${name}?`)) return;
    setRemoving(true);
    const response = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    setRemoving(false);
    if (!response.ok) return window.alert("No se pudo eliminar el prospecto.");
    router.refresh();
  }

  return (
    <>
      {digits && <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" title={`Abrir chat (${phone})`} aria-label={`Abrir chat con ${name}`} className="grid size-10 place-items-center rounded-md text-stone-500 hover:bg-emerald-50 hover:text-emerald-700"><MessageCircle size={17} /></a>}
      <a href={requirements} target="_blank" rel="noreferrer" onClick={() => { if (canAdvance) void patchStatus(id, "requirements_sent", apiBase).then(() => router.refresh()); }} title="Enviar requisitos por WhatsApp" aria-label={`Enviar requisitos a ${name}`} className="grid size-10 place-items-center rounded-md text-stone-500 hover:bg-amber-50 hover:text-amber-700"><ClipboardList size={17} /></a>
      <button type="button" disabled={removing} onClick={remove} title="Eliminar" aria-label={`Eliminar ${name}`} className="grid size-10 place-items-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-60">{removing ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={17} />}</button>
    </>
  );
}
