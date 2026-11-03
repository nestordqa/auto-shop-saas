"use client";

import { CheckCircle2, Copy, FileUp, LoaderCircle, Store, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { discountedAmount, MAX_PROOF_BYTES, PAYMENT_FIELDS, PAYMENT_KIND_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_STYLES, PROOF_TYPES, type OrderPayment, type PaymentKind, type PaymentMethod } from "@/lib/payments";

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });

function CopyLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-stone-500">{label}</span>
      <button type="button" onClick={() => navigator.clipboard?.writeText(value)} className="flex min-w-0 items-center gap-1.5 font-semibold hover:text-[#d9341d]" title="Copiar"><span className="truncate">{value}</span><Copy size={13} className="shrink-0" /></button>
    </div>
  );
}

/** How to pay with one method: its data, ready to copy. */
export function MethodDetails({ method }: { method: PaymentMethod }) {
  if (method.kind === "transferencia") {
    return <div className="grid gap-2">{method.accounts.map((account, index) => <div key={index} className="rounded-md border border-stone-200 bg-white px-3 py-1"><CopyLine label="Banco" value={account.bank} /><CopyLine label={`Cuenta ${account.type.toLowerCase()}`} value={account.number} /><CopyLine label="Titular" value={account.holder} /><CopyLine label="Cédula / RIF" value={account.document} /></div>)}</div>;
  }
  return <div className="rounded-md border border-stone-200 bg-white px-3 py-1">{PAYMENT_FIELDS[method.kind].filter((field) => method.details[field.key]).map((field) => <CopyLine key={field.key} label={field.label.replace(" (opcional)", "")} value={method.details[field.key]} />)}</div>;
}

/** Client: pay the approved budget online (with proof) or choose to pay at the garage, then follow its status. */
export function ClientPaymentPanel({ orderId, total, methods, payment }: { orderId: string; total: number; methods: PaymentMethod[]; payment: OrderPayment | null }) {
  const router = useRouter();
  const [kind, setKind] = useState<PaymentKind | "">("");
  const [file, setFile] = useState<File>();
  const [pending, setPending] = useState<"online" | "at_garage">();
  const [error, setError] = useState<string>();
  const method = methods.find((item) => item.kind === kind);

  if (payment && payment.status !== "rejected") {
    return (
      <div className="m-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
        <p className="flex items-center gap-2 text-sm font-bold"><Wallet size={17} /> Pago</p>
        <span className={`mt-2 inline-block rounded-sm px-2 py-1 text-xs font-bold ${PAYMENT_STATUS_STYLES[payment.status]}`}>{PAYMENT_STATUS_LABELS[payment.status]}</span>
        <p className="mt-2 text-sm text-stone-600">{payment.methodKind ? `${PAYMENT_KIND_LABELS[payment.methodKind]} · ` : ""}<strong>{money.format(payment.amount)}</strong>{payment.discountPercent ? ` (incluye ${payment.discountPercent}% de descuento)` : ""}</p>
        {payment.status === "reported" && <p className="mt-1 text-xs text-stone-500">El taller revisará tu comprobante y te avisaremos cuando lo confirme.</p>}
        {payment.status === "pay_at_garage" && <p className="mt-1 text-xs text-stone-500">Paga al retirar tu vehículo; el taller lo registrará en ese momento.</p>}
      </div>
    );
  }

  async function payOnline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Read the form before any await: React clears event.currentTarget once the handler yields.
    const reference = String(new FormData(event.currentTarget).get("reference") ?? "");
    if (!method || !file) return setError("Elige el método y adjunta el comprobante.");
    if (!(PROOF_TYPES as readonly string[]).includes(file.type) || file.size > MAX_PROOF_BYTES) return setError("El comprobante debe ser una imagen o PDF de hasta 8 MB.");
    setPending("online");
    setError(undefined);
    try {
      const urlResponse = await fetch(`/api/orders/${orderId}/payment/proof`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentType: file.type, size: file.size }) });
      const upload = await urlResponse.json() as { key?: string; uploadUrl?: string; error?: string };
      if (!urlResponse.ok || !upload.key || !upload.uploadUrl) throw new Error(upload.error ?? "No se pudo subir el comprobante.");
      const put = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("No se pudo subir el comprobante.");
      const response = await fetch(`/api/orders/${orderId}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "online", methodKind: method.kind, reference, proofKey: upload.key }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo registrar el pago.");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo registrar el pago.");
    } finally {
      setPending(undefined);
    }
  }

  async function payAtGarage() {
    if (!window.confirm("¿Confirmas que pagarás en el taller?")) return;
    setPending("at_garage");
    setError(undefined);
    const response = await fetch(`/api/orders/${orderId}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "at_garage" }) });
    const result = await response.json() as { error?: string };
    setPending(undefined);
    if (!response.ok) return setError(result.error ?? "No se pudo registrar.");
    router.refresh();
  }

  return (
    <form onSubmit={payOnline} className="m-5 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
      <p className="flex items-center gap-2 font-bold"><Wallet size={18} className="text-emerald-700" /> Pagar {money.format(total)}</p>
      {payment?.status === "rejected" && <p className="rounded-md bg-red-50 p-2 text-sm font-semibold text-red-700">El taller no pudo confirmar tu pago anterior{payment.note ? `: ${payment.note}` : ""}. Puedes reportarlo de nuevo.</p>}
      {methods.length > 0 && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {methods.map((item) => (
              <button key={item.kind} type="button" onClick={() => setKind(item.kind)} className={`flex min-h-12 items-center justify-between gap-2 rounded-md border px-3 text-left text-sm font-bold ${kind === item.kind ? "border-emerald-600 bg-white ring-2 ring-emerald-600" : "border-stone-300 bg-white"}`}>
                {PAYMENT_KIND_LABELS[item.kind]}
                <span className="text-right">{item.discountPercent ? <><span className="block text-xs text-stone-400 line-through">{money.format(total)}</span><span className="text-emerald-700">{money.format(discountedAmount(total, item.discountPercent))} · -{item.discountPercent}%</span></> : money.format(total)}</span>
              </button>
            ))}
          </div>
          {method && (
            <div className="grid gap-3">
              <p className="text-sm">Paga <strong>{money.format(discountedAmount(total, method.discountPercent))}</strong> con estos datos y adjunta el comprobante:</p>
              <MethodDetails method={method} />
              <input name="reference" maxLength={120} placeholder="Número de referencia (opcional)" className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm" />
              <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-stone-400 bg-white px-3 text-sm font-semibold"><FileUp size={18} /> {file ? file.name : "Subir comprobante (imagen o PDF)"}<input type="file" accept={PROOF_TYPES.join(",")} onChange={(event) => setFile(event.target.files?.[0])} className="sr-only" /></label>
              <button disabled={pending !== undefined || !file} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 font-bold text-white disabled:opacity-60">{pending === "online" ? <LoaderCircle className="animate-spin" size={19} /> : <CheckCircle2 size={19} />} Marcar como pagado</button>
            </div>
          )}
        </>
      )}
      <button type="button" disabled={pending !== undefined} onClick={payAtGarage} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-5 font-bold disabled:opacity-60">{pending === "at_garage" ? <LoaderCircle className="animate-spin" size={19} /> : <Store size={19} />} Pagaré en el taller</button>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
    </form>
  );
}
