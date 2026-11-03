"use client";

import { LoaderCircle, MessageCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useMessageTemplate } from "@/components/messages/use-message-template";
import { buildTrialFollowUpMessage, FOLLOW_UP_LABELS, type Contract, type FollowUp } from "@/lib/contracts";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";

type TrialFollowUpProps = { contract: Contract; garageName: string; owner: { fullName: string; phone: string | null } };

/** Expired trial: message the owner, then record their answer (contacted → wants to continue / declines). */
export function TrialFollowUp({ contract, garageName, owner }: TrialFollowUpProps) {
  const router = useRouter();
  const [pending, setPending] = useState<FollowUp | "reset">();
  const template = useMessageTemplate("trial_follow_up");
  const message = buildTrialFollowUpMessage({ contract, garageName, ownerName: owner.fullName }, template);
  const phone = owner.phone ? normalizeWhatsAppPhone(owner.phone) : "";

  async function save(value: FollowUp | null) {
    setPending(value ?? "reset");
    const response = await fetch(`/api/admin/contracts/${contract.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "follow_up", value }) });
    setPending(undefined);
    if (!response.ok) return window.alert("No se pudo guardar el seguimiento.");
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-stone-50 p-4 font-sans text-sm text-stone-700">{message}</pre>
      <a href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" onClick={() => { if (!contract.follow_up) void save("contacted"); }} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1f9d55] px-4 font-bold text-white hover:bg-[#178247]"><MessageCircle size={18} /> {contract.follow_up ? "Reenviar seguimiento" : "Enviar seguimiento por WhatsApp"}</a>
      <div>
        <p className="text-xs font-bold uppercase text-stone-500">Respuesta del owner</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(["interested", "declined"] as const).map((value) => (
            <button key={value} type="button" disabled={Boolean(pending)} onClick={() => save(value)} className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold disabled:opacity-60 ${contract.follow_up === value ? value === "interested" ? "border-emerald-600 bg-emerald-600 text-white" : "border-red-600 bg-red-600 text-white" : "border-stone-300"}`}>{pending === value && <LoaderCircle className="animate-spin" size={16} />} {FOLLOW_UP_LABELS[value]}</button>
          ))}
        </div>
        {contract.follow_up && <button type="button" disabled={Boolean(pending)} onClick={() => save(null)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-900"><RotateCcw size={13} /> Reiniciar seguimiento</button>}
      </div>
    </div>
  );
}
