"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, CheckCircle2, ExternalLink, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { buildWhatsAppStatusMessage, buildWhatsAppStatusUrl } from "@/lib/whatsapp";
import { ORDER_STATUS_LABELS, type Diagnostic } from "@/types/domain";

const budgetSchema = z.object({
  includesParts: z.boolean(),
  diagnostics: z.array(z.object({
    id: z.string(),
    description: z.string(),
    price: z.number({ error: "Indica un precio válido." }).min(0, "El precio no puede ser negativo."),
  })),
});

type BudgetInput = z.infer<typeof budgetSchema>;

const currency = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" });

type OwnerBudgetEditorProps = {
  orderId: string;
  orderReference: string;
  vehicleLabel: string;
  customerName: string;
  customerPhone: string;
  garageName: string;
  initialDiagnostics: Diagnostic[];
  initialIncludesParts: boolean;
};

export function OwnerBudgetEditor({
  orderId,
  orderReference,
  vehicleLabel,
  customerName,
  customerPhone,
  garageName,
  initialDiagnostics,
  initialIncludesParts,
}: OwnerBudgetEditorProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [requestError, setRequestError] = useState<string>();
  const { control, register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      includesParts: initialIncludesParts,
      diagnostics: initialDiagnostics.map(({ id, description, price }) => ({ id, description, price: price ?? 0 })),
    },
  });
  const { fields } = useFieldArray({ control, name: "diagnostics" });
  const values = useWatch({ control });
  const status = "presupuestado" as const;
  const total = (values.diagnostics ?? []).reduce(
    (sum, diagnostic) => sum + (Number(diagnostic.price) || 0),
    0,
  );
  const messageInput = {
    phone: customerPhone,
    customerName,
    garageName,
    vehicleLabel,
    orderReference,
    status,
    budget: {
      diagnostics: (values.diagnostics ?? []).map((diagnostic) => ({
        description: diagnostic.description ?? "Hallazgo",
        price: Number(diagnostic.price) || 0,
      })),
      includesParts: Boolean(values.includesParts),
      totalAmount: total,
    },
  };

  async function saveBudget(input: BudgetInput) {
    setRequestError(undefined);
    setSaved(true);
    const response = await fetch(`/api/orders/${orderId}/budget`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setSaved(false);
      setRequestError(result.error ?? "No se pudo guardar el presupuesto.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
      <form onSubmit={handleSubmit(saveBudget)} className="min-w-0 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase text-[#d9341d]">Orden {orderReference}</p>
          <h2 className="mt-1 text-xl font-bold">Tarifación del diagnóstico</h2>
          <p className="mt-2 text-sm text-stone-600">{vehicleLabel}</p>
        </div>

        <div className="divide-y divide-stone-100">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center sm:px-6">
              <div className="min-w-0">
                <span className="text-xs font-bold text-stone-400">0{index + 1}</span>
                <p className="mt-1 wrap-break-word text-sm font-semibold leading-5">{field.description}</p>
              </div>
              <div>
                <label htmlFor={`diagnostic-${index}`} className="text-xs font-bold text-stone-600">Precio USD</label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-stone-500">$</span>
                  <input id={`diagnostic-${index}`} inputMode="decimal" type="number" step="0.01" className="min-h-12 w-full rounded-md border border-stone-300 bg-white pl-8 pr-3 text-right text-base font-bold outline-none focus:border-[#ef3f26] focus:ring-2 focus:ring-[#ef3f26]/20" {...register(`diagnostics.${index}.price`, { valueAsNumber: true })} />
                </div>
                {errors.diagnostics?.[index]?.price && <p className="mt-1 text-xs font-medium text-red-700">{errors.diagnostics[index]?.price?.message}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 border-t border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 sm:p-6">
          <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-md border border-stone-300 bg-white px-4 py-3">
            <span>
              <span className="block text-sm font-bold">Incluye repuestos</span>
              <span className="block text-xs text-stone-500">Indícalo en el presupuesto</span>
            </span>
            <input type="checkbox" className="size-6 accent-[#ef3f26]" {...register("includesParts")} />
          </label>
          <div className="flex min-h-14 items-center justify-between rounded-md bg-stone-900 px-4 py-3 text-white">
            <span className="flex items-center gap-2 text-sm font-semibold"><Calculator size={18} /> Total</span>
            <strong className="text-xl">{currency.format(total)}</strong>
          </div>
          <button disabled={isSubmitting} type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white hover:bg-[#d9341d] disabled:opacity-60 sm:col-span-2">
            <CheckCircle2 size={20} /> Guardar y publicar presupuesto
          </button>
          {saved && <p role="status" className="text-center text-sm font-semibold text-emerald-700 sm:col-span-2">Presupuesto actualizado correctamente.</p>}
          {requestError && <p role="alert" className="text-center text-sm font-semibold text-red-700 sm:col-span-2">{requestError}</p>}
        </div>
      </form>

      <aside className="min-w-0 self-start overflow-hidden rounded-lg border border-emerald-200 bg-[#eaf8ef] shadow-sm xl:sticky xl:top-6">
        <div className="flex items-center gap-3 border-b border-emerald-200 px-4 py-4">
          <span className="grid size-10 place-items-center rounded-md bg-[#1f9d55] text-white"><MessageCircle size={21} /></span>
          <div>
            <p className="font-bold">Vista previa WhatsApp</p>
            <p className="text-xs text-emerald-800">{ORDER_STATUS_LABELS[status]}</p>
          </div>
        </div>
        <div className="m-4 rounded-md bg-white p-4 text-sm leading-6 text-stone-700 shadow-sm">
          {buildWhatsAppStatusMessage(messageInput).split("\n").map((line, index) => <span key={`${line}-${index}`}>{line || <br />}<br /></span>)}
        </div>
        <div className="p-4 pt-0">
          <a href={buildWhatsAppStatusUrl(messageInput)} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1f9d55] px-4 font-bold text-white hover:bg-[#178247]">
            Abrir WhatsApp <ExternalLink size={18} />
          </a>
        </div>
      </aside>
    </div>
  );
}