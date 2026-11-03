import { ArrowLeft, CheckCircle2, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { SignContractForm } from "@/components/contracts/sign-contract-form";
import { requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import { CONTRACT_COLUMNS, contractCode, contractTitle, formatDate, type Contract } from "@/lib/contracts";
import { planSummary } from "@/lib/plans";

const dateTime = new Intl.DateTimeFormat("es-VE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Caracas" });

/** Owner: read the contract (PDF) and sign it from the phone. */
export default async function OwnerContractPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  if (!z.uuid().safeParse(contractId).success) notFound();
  const { user, dataClient } = await requireOwnerGarage({ ownerOnly: true });
  const { data: contract } = await dataClient.from("contracts").select(CONTRACT_COLUMNS).eq("id", contractId).eq("owner_id", user.id).maybeSingle<Contract>();
  if (!contract) notFound();
  const { data: profile } = await dataClient.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const pdf = `/api/contracts/${contract.id}/pdf`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
      <Link href="/dashboard/owner/billing" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"><ArrowLeft size={18} /> Facturación</Link>
      <header className="my-5">
        <p className="text-xs font-bold uppercase text-[#d9341d]">{contractCode(contract.number)}</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{contractTitle(contract)}</h1>
        <p className="mt-1 text-sm text-stone-600">{contract.kind === "trial" ? `Prueba gratis por $0 del ${formatDate(contract.start_date)} al ${formatDate(contract.end_date!)}.` : `${contract.plan ? planSummary(contract.plan) : "Plan por comisión"} · desde el ${formatDate(contract.start_date)}.`}</p>
      </header>
      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        <a href={pdf} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 font-bold"><ExternalLink size={18} /> Leer contrato</a>
        <a href={`${pdf}?download`} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 font-bold"><Download size={18} /> Descargar PDF</a>
      </div>
      {contract.signed_at
        ? <p className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><CheckCircle2 className="mt-0.5 shrink-0" /> <span>Firmado por <strong>{contract.owner_signed_name}</strong> el {dateTime.format(new Date(contract.signed_at))}. El PDF ya incluye tu firma.</span></p>
        : contract.status === "cancelled"
          ? <p className="rounded-lg border border-stone-200 bg-stone-50 p-5 text-stone-600">Este contrato fue anulado y ya no requiere firma.</p>
          : <SignContractForm contractId={contract.id} defaultName={profile?.full_name ?? ""} />}
    </div>
  );
}
