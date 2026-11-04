"use client";

import { Check, ExternalLink, HandCoins, LoaderCircle, Wallet, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PAYMENT_KIND_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_STYLES, type OrderPayment } from "@/lib/payments";

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });
const when = (value: string) => new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeZone: "America/Caracas" }).format(new Date(value));

/** Order page: the client's payment; only the owner (`canResolve`) confirms, rejects or marks it received. */
export function OrderPaymentPanel({ orderId, payment, canResolve }: { orderId: string; payment: OrderPayment | null; canResolve: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();

  async function act(action: "confirm" | "reject" | "receive") {
    let note: string | null = null;
    if (action === "reject") {
      note = window.prompt("¿Por qué no se pudo confirmar? (el cliente lo verá)", "No encontramos el pago en nuestra cuenta");
      if (note === null) return;
    } else if (!window.confirm(action === "confirm" ? "¿Confirmas que el pago llegó a tu cuenta?" : "¿Confirmas que recibiste el pago en el taller?")) return;
    setPending(action);
    setError(undefined);
    const response = await fetch(`/api/owner/orders/${orderId}/payment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note: note ?? undefined }) });
    const result = await response.json() as { error?: string };
    setPending(undefined);
    if (!response.ok) return setError(result.error ?? "No se pudo actualizar el pago.");
    router.refresh();
  }

  return (
    <section className="mt-5 rounded-lg border border-stone-200 bg-white p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Wallet size={20} className="text-[#ef3f26]" /> Pago</h2>
      {!payment ? <p className="mt-2 text-sm text-stone-600">El cliente todavía no ha registrado el pago.</p> : (
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-sm px-2 py-1 text-xs font-bold ${PAYMENT_STATUS_STYLES[payment.status]}`}>{PAYMENT_STATUS_LABELS[payment.status]}</span>
            <span className="text-sm text-stone-500">{when(payment.createdAt)}</span>
          </div>
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div><dt className="text-stone-500">Método</dt><dd className="font-semibold">{payment.methodKind ? PAYMENT_KIND_LABELS[payment.methodKind] : "En el taller"}</dd></div>
            <div><dt className="text-stone-500">Monto</dt><dd className="font-semibold">{money.format(payment.amount)}{payment.discountPercent ? <span className="font-normal text-stone-500"> ({payment.discountPercent}% de descuento sobre {money.format(payment.baseAmount)})</span> : null}</dd></div>
            {payment.reference && <div><dt className="text-stone-500">Referencia</dt><dd className="font-semibold">{payment.reference}</dd></div>}
            {payment.note && <div><dt className="text-stone-500">Nota</dt><dd>{payment.note}</dd></div>}
          </dl>
          {payment.proofUrl && <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 justify-self-start text-sm font-bold text-[#d9341d] hover:underline"><ExternalLink size={15} /> Ver comprobante</a>}
          {payment.status === "rejected" && <p className="text-sm text-stone-600">Esperando que el cliente vuelva a reportar el pago.</p>}
          {canResolve && payment.status === "reported" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={Boolean(pending)} onClick={() => act("confirm")} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 font-bold text-white disabled:opacity-60">{pending === "confirm" ? <LoaderCircle className="animate-spin" size={19} /> : <Check size={19} />} Pago confirmado</button>
              <button type="button" disabled={Boolean(pending)} onClick={() => act("reject")} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-red-300 px-5 font-bold text-red-700 disabled:opacity-60">{pending === "reject" ? <LoaderCircle className="animate-spin" size={19} /> : <X size={19} />} No llegó el pago</button>
            </div>
          )}
          {canResolve && payment.status === "pay_at_garage" && (
            <button type="button" disabled={Boolean(pending)} onClick={() => act("receive")} className="flex min-h-12 items-center justify-center gap-2 justify-self-start rounded-md bg-emerald-600 px-5 font-bold text-white disabled:opacity-60">{pending === "receive" ? <LoaderCircle className="animate-spin" size={19} /> : <HandCoins size={19} />} Pago recibido</button>
          )}
          {!canResolve && (payment.status === "reported" || payment.status === "pay_at_garage") && <p className="text-xs text-stone-500">Solo el administrador del taller puede confirmar el pago.</p>}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </section>
  );
}
