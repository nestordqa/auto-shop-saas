"use client";

import { CheckCircle2, FileUp, LoaderCircle, Wallet, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { MethodDetails } from "@/components/client/client-payment-panel";
import { discountedAmount, MAX_PROOF_BYTES, PAYMENT_KIND_LABELS, PROOF_TYPES, type PaymentKind, type PaymentMethod } from "@/lib/payments";

export type DuePeriodView = {
  contractId: string;
  start: string;
  end: string;
  amount: number;
  daysOverdue: number;
  report: { status: "reported" | "confirmed" | "rejected"; amount: number; note: string | null } | null;
};

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });
const day = (value: string) => new Intl.DateTimeFormat("es", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

/** Owner: unpaid plan periods and the form to pay them with TorkeOS's methods (proof + reference). */
export function PlatformPaymentPanel({ periods, methods, lockAfterDays }: { periods: DuePeriodView[]; methods: PaymentMethod[]; lockAfterDays: number }) {
  const router = useRouter();
  const [paying, setPaying] = useState<DuePeriodView>();
  const [kind, setKind] = useState<PaymentKind | "">("");
  const [file, setFile] = useState<File>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const method = methods.find((item) => item.kind === kind);

  function open(period: DuePeriodView) {
    setPaying(period);
    setKind(methods[0]?.kind ?? "");
    setFile(undefined);
    setError(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Read the form before any await: React clears event.currentTarget once the handler yields.
    const reference = String(new FormData(event.currentTarget).get("reference") ?? "");
    if (!paying || !method || !file) return setError("Elige el medio de pago y adjunta el comprobante.");
    if (!(PROOF_TYPES as readonly string[]).includes(file.type) || file.size > MAX_PROOF_BYTES) return setError("El comprobante debe ser una imagen o PDF de hasta 8 MB.");
    setPending(true);
    setError(undefined);
    try {
      const urlResponse = await fetch("/api/owner/contract-payments/proof", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentType: file.type, size: file.size }) });
      const upload = await urlResponse.json() as { key?: string; uploadUrl?: string; error?: string };
      if (!urlResponse.ok || !upload.key || !upload.uploadUrl) throw new Error(upload.error ?? "No se pudo subir el comprobante.");
      const put = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("No se pudo subir el comprobante.");
      const response = await fetch("/api/owner/contract-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contractId: paying.contractId, periodStart: paying.start, methodKind: method.kind, reference, proofKey: upload.key }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo registrar el pago.");
      setPaying(undefined);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo registrar el pago.");
    } finally {
      setPending(false);
    }
  }

  if (!periods.length) return <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Estás al día con TorkeOS. ¡Gracias!</p>;

  return (
    <div className="grid gap-3">
      {periods.map((period) => (
        <article key={`${period.contractId}-${period.start}`} className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">{day(period.start)} – {day(period.end)}</p>
            <p className="text-sm text-stone-600"><strong className="text-stone-950">{money.format(period.amount)}</strong>{period.daysOverdue > 0 && <span className="font-semibold text-[#d9341d]"> · vencido hace {period.daysOverdue} día(s){period.daysOverdue < lockAfterDays ? ` · se suspende el acceso en ${lockAfterDays - period.daysOverdue} día(s)` : ""}</span>}</p>
            {period.report?.status === "rejected" && <p className="text-xs font-semibold text-red-700">Tu pago anterior no se pudo verificar{period.report.note ? `: ${period.report.note}` : ""}. Repórtalo de nuevo.</p>}
          </div>
          {period.report?.status === "reported"
            ? <span className="rounded-sm bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800">Pago de {money.format(period.report.amount)} en revisión</span>
            : <button type="button" disabled={!methods.length} onClick={() => open(period)} className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-4 font-bold text-white disabled:opacity-50"><Wallet size={18} /> Pagar</button>}
        </article>
      ))}
      {!methods.length && <p className="text-xs text-stone-500">TorkeOS aún no ha cargado sus medios de pago. Escríbenos a soporte.</p>}

      {paying && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="platform-pay-title">
          <form onSubmit={submit} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white text-left sm:max-w-lg sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <h2 id="platform-pay-title" className="text-lg font-bold">Pagar {day(paying.start)} – {day(paying.end)}</h2>
              <button type="button" onClick={() => setPaying(undefined)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <div className="grid gap-3 p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {methods.map((item) => (
                  <button key={item.kind} type="button" onClick={() => setKind(item.kind)} className={`flex min-h-12 items-center justify-between gap-2 rounded-md border px-3 text-left text-sm font-bold ${kind === item.kind ? "border-emerald-600 ring-2 ring-emerald-600" : "border-stone-300"}`}>
                    {PAYMENT_KIND_LABELS[item.kind]}
                    <span className={item.discountPercent ? "text-emerald-700" : ""}>{money.format(discountedAmount(paying.amount, item.discountPercent))}</span>
                  </button>
                ))}
              </div>
              {method && <>
                <p className="text-sm">Paga <strong>{money.format(discountedAmount(paying.amount, method.discountPercent))}</strong>{method.discountPercent ? ` (incluye ${method.discountPercent}% de descuento)` : ""}, o su equivalente en bolívares a tasa BCV del día, a:</p>
                <MethodDetails method={method} />
              </>}
              <input name="reference" maxLength={120} placeholder="Número de referencia (opcional)" className="min-h-11 rounded-md border border-stone-300 px-3 text-sm" />
              <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-stone-400 px-3 text-sm font-semibold"><FileUp size={18} /> {file ? file.name : "Subir comprobante (imagen o PDF)"}<input type="file" accept={PROOF_TYPES.join(",")} onChange={(event) => setFile(event.target.files?.[0])} className="sr-only" /></label>
              {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
              <button disabled={pending || !file || !method} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={19} /> : <CheckCircle2 size={19} />} Reportar pago</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
