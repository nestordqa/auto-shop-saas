"use client";

import { Check, Copy, Download, Mail, MessageCircle } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { useMessageTemplate } from "@/components/messages/use-message-template";
import { buildContractMessage, contractCode, type Contract } from "@/lib/contracts";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

type ContractShareProps = { contract: Contract; garageName: string; owner: { fullName: string; phone: string | null; email: string | null } };

const noopSubscribe = () => () => {};

function useOrigin() {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => process.env.NEXT_PUBLIC_SITE_URL ?? "");
}

/** Download the PDF and send the owner a ready-made message by WhatsApp, email or clipboard. */
export function ContractShare({ contract, garageName, owner }: ContractShareProps) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const pdfPath = `/api/contracts/${contract.id}/pdf`;
  const template = useMessageTemplate("contract_new");
  const message = buildContractMessage({ contract, garageName, ownerName: owner.fullName, pdfUrl: `${origin}${pdfPath}` }, template);
  const phone = owner.phone ? normalizeWhatsAppPhone(owner.phone) : "";
  const subject = `Nuevo contrato TorkeOS ${contractCode(contract.number)} · ${garageName}`;

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
    <div className="grid gap-3">
      <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-stone-50 p-4 font-sans text-sm text-stone-700">{message}</pre>
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={`${pdfPath}?download`} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 font-bold text-white"><Download size={18} /> Descargar PDF</a>
        <a href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1f9d55] px-4 font-bold text-white hover:bg-[#178247]"><MessageCircle size={18} /> {phone ? "Enviar por WhatsApp" : "WhatsApp (elegir contacto)"}</a>
        <a href={`mailto:${owner.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold"><Mail size={18} /> Enviar por correo</a>
        <button type="button" onClick={copy} className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-4 font-bold transition ${copied ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300"}`}>{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copiado" : "Copiar mensaje"}</button>
      </div>
    </div>
  );
}
