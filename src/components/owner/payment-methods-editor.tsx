"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ACCOUNT_TYPES, PAYMENT_FIELDS, PAYMENT_KIND_LABELS, type BankAccount, type PaymentMethod } from "@/lib/payments";

const input = "min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm";
const emptyAccount: BankAccount = { bank: "", number: "", type: ACCOUNT_TYPES[0], holder: "", document: "" };

/**
 * Which payment methods payers see, their data and optional discount. Owners edit their garage's
 * (`/api/owner/payment-methods`); admins edit TorkeOS's own (`/api/admin/payment-methods`).
 */
export function PaymentMethodsEditor({ methods: initial, endpoint = "/api/owner/payment-methods" }: { methods: PaymentMethod[]; endpoint?: string }) {
  const router = useRouter();
  const [methods, setMethods] = useState(initial);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error?: string; success?: string }>({});

  const patch = (index: number, change: Partial<PaymentMethod>) => setMethods((current) => current.map((method, position) => position === index ? { ...method, ...change } : method));
  const patchAccount = (index: number, accountIndex: number, change: Partial<BankAccount>) =>
    patch(index, { accounts: methods[index].accounts.map((account, position) => position === accountIndex ? { ...account, ...change } : account) });

  async function save() {
    setPending(true);
    setNotice({});
    const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ methods }) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setNotice({ error: result.error ?? "No se pudieron guardar los métodos de pago." });
    setNotice({ success: "Métodos de pago guardados." });
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {methods.map((method, index) => (
        <section key={method.kind} className={`rounded-lg border bg-white p-4 sm:p-5 ${method.enabled ? "border-stone-300" : "border-stone-200"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-lg font-bold"><input type="checkbox" checked={method.enabled} onChange={(event) => patch(index, { enabled: event.target.checked, accounts: event.target.checked && method.kind === "transferencia" && !method.accounts.length ? [{ ...emptyAccount }] : method.accounts })} className="size-5 accent-[#ef3f26]" /> {PAYMENT_KIND_LABELS[method.kind]}</label>
            {method.enabled && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={method.discountPercent !== null} onChange={(event) => patch(index, { discountPercent: event.target.checked ? 5 : null })} className="size-4 accent-[#ef3f26]" /> Descuento
                {method.discountPercent !== null && <span className="flex items-center gap-1"><input type="number" min={0.5} max={99} step={0.5} value={method.discountPercent} onChange={(event) => patch(index, { discountPercent: Number(event.target.value) || null })} className="min-h-9 w-20 rounded-md border border-stone-300 px-2" />%</span>}
              </label>
            )}
          </div>
          {method.enabled && method.kind !== "transferencia" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {PAYMENT_FIELDS[method.kind].map((field) => <label key={field.key} className="grid gap-1 text-xs font-bold text-stone-600">{field.label}<input value={method.details[field.key] ?? ""} maxLength={200} placeholder={field.placeholder} onChange={(event) => patch(index, { details: { ...method.details, [field.key]: event.target.value } })} className={input} /></label>)}
            </div>
          )}
          {method.enabled && method.kind === "transferencia" && (
            <div className="mt-4 grid gap-3">
              {method.accounts.map((account, accountIndex) => (
                <div key={accountIndex} className="grid gap-2 rounded-md border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[1fr_1.4fr_auto] lg:grid-cols-[1fr_1.4fr_120px_1fr_140px_auto]">
                  <input aria-label="Banco" value={account.bank} placeholder="Banco" onChange={(event) => patchAccount(index, accountIndex, { bank: event.target.value })} className={input} />
                  <input aria-label="Número de cuenta" value={account.number} inputMode="numeric" placeholder="Número de cuenta" onChange={(event) => patchAccount(index, accountIndex, { number: event.target.value })} className={input} />
                  <select aria-label="Tipo de cuenta" value={account.type} onChange={(event) => patchAccount(index, accountIndex, { type: event.target.value })} className={`${input} bg-white`}>{ACCOUNT_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
                  <input aria-label="Titular" value={account.holder} placeholder="Titular" onChange={(event) => patchAccount(index, accountIndex, { holder: event.target.value })} className={input} />
                  <input aria-label="Cédula o RIF" value={account.document} placeholder="Cédula / RIF" onChange={(event) => patchAccount(index, accountIndex, { document: event.target.value })} className={input} />
                  <button type="button" onClick={() => patch(index, { accounts: method.accounts.filter((_, position) => position !== accountIndex) })} aria-label="Quitar cuenta" className="grid size-11 place-items-center rounded-md text-red-600 hover:bg-red-50"><Trash2 size={17} /></button>
                </div>
              ))}
              {method.accounts.length < 10 && <button type="button" onClick={() => patch(index, { accounts: [...method.accounts, { ...emptyAccount }] })} className="flex min-h-10 items-center gap-2 justify-self-start rounded-md border border-stone-300 px-3 text-sm font-bold"><Plus size={16} /> Agregar banco</button>}
            </div>
          )}
        </section>
      ))}
      {notice.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{notice.error}</p>}
      {notice.success && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice.success}</p>}
      <button type="button" disabled={pending} onClick={save} className="flex min-h-12 items-center justify-center gap-2 justify-self-start rounded-md bg-[#ef3f26] px-6 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Guardar métodos de pago</button>
    </div>
  );
}
