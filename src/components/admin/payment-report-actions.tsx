"use client";

import { Check, ExternalLink, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type PaymentReportView = { id: string; period: string; amount: string; method: string; reference: string | null; proofUrl: string | null; status: "reported" | "confirmed" | "rejected"; note: string | null; createdAt: string };

const STATUS = { reported: ["Por revisar", "bg-amber-100 text-amber-800"], confirmed: ["Pago chequeado", "bg-emerald-100 text-emerald-800"], rejected: ["Rechazado", "bg-red-100 text-red-800"] } as const;

/** Admin: owners' plan payment reports with their proof; "Pago chequeado" records the period as paid. */
export function PaymentReportList({ reports }: { reports: PaymentReportView[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();

  async function act(report: PaymentReportView, action: "confirm" | "reject") {
    let note: string | null = null;
    if (action === "reject") {
      note = window.prompt("¿Por qué no se pudo verificar? (el administrador lo verá)", "No encontramos el pago en nuestra cuenta");
      if (note === null) return;
    } else if (!window.confirm(`¿Confirmas que recibiste ${report.amount}?`)) return;
    setPending(report.id);
    setError(undefined);
    const response = await fetch(`/api/admin/contract-payment-reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note: note ?? undefined }) });
    const result = await response.json() as { error?: string };
    setPending(undefined);
    if (!response.ok) return setError(result.error ?? "No se pudo actualizar el pago.");
    router.refresh();
  }

  return (
    <div className="divide-y divide-stone-100">
      {reports.map((report) => (
        <div key={report.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p className="font-bold">{report.period} · {report.amount}</p>
            <p className="text-stone-600">{report.method}{report.reference ? ` · Ref. ${report.reference}` : ""} · {report.createdAt}</p>
            <span className={`mt-1 inline-block rounded-sm px-2 py-0.5 text-xs font-bold ${STATUS[report.status][1]}`}>{STATUS[report.status][0]}</span>
            {report.note && <span className="ml-2 text-xs text-stone-500">{report.note}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.proofUrl && <a href={report.proofUrl} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-1.5 rounded-md border border-stone-300 px-3 text-sm font-bold"><ExternalLink size={15} /> Comprobante</a>}
            {report.status === "reported" && <>
              <button type="button" disabled={Boolean(pending)} onClick={() => act(report, "confirm")} className="flex min-h-10 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-60">{pending === report.id ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />} Pago chequeado</button>
              <button type="button" disabled={Boolean(pending)} onClick={() => act(report, "reject")} className="flex min-h-10 items-center gap-1.5 rounded-md border border-red-300 px-3 text-sm font-bold text-red-700 disabled:opacity-60"><X size={15} /> Rechazar</button>
            </>}
          </div>
        </div>
      ))}
      {error && <p role="alert" className="p-4 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
