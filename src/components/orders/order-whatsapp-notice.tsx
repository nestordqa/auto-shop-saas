"use client";

import { MessageCircle } from "lucide-react";

import { useMessageTemplate } from "@/components/messages/use-message-template";
import { buildWhatsAppStatusMessage, buildWhatsAppStatusUrl } from "@/lib/whatsapp";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

type OrderWhatsAppNoticeProps = {
  phone: string | null;
  customerName: string;
  garageName: string;
  vehicleLabel: string;
  orderReference: string;
  status: OrderStatus;
  intakeUrl?: string;
  budget?: { diagnostics: { description: string; detail?: string; price: number }[]; includesParts: boolean; totalAmount: number };
  /** Client registered without email: WhatsApp is the only way they hear about the order. */
  noAppAccess?: boolean;
};

/** Key moments of an order (ingresado, presupuestado, listo para entregar): tell the client by WhatsApp. */
export function OrderWhatsAppNotice({ phone, noAppAccess, ...input }: OrderWhatsAppNoticeProps) {
  const template = useMessageTemplate("order_status");
  const message = buildWhatsAppStatusMessage(input, template);

  return (
    <section className="mt-5 overflow-hidden rounded-lg border border-emerald-200 bg-[#eaf8ef] shadow-sm">
      <div className="flex items-center gap-3 border-b border-emerald-200 px-4 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#1f9d55] text-white"><MessageCircle size={21} /></span>
        <div className="min-w-0">
          <p className="font-bold">Avisar al cliente por WhatsApp · {ORDER_STATUS_LABELS[input.status]}</p>
          <p className="text-xs text-emerald-800">{noAppAccess ? "Este cliente no usa la app: WhatsApp es la única forma de que se entere." : "Además de la notificación en la app."}</p>
        </div>
      </div>
      <pre className="m-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-white p-4 font-sans text-sm leading-6 text-stone-700 shadow-sm">{message}</pre>
      <div className="p-4 pt-0">
        {phone
          ? <a href={buildWhatsAppStatusUrl({ ...input, phone }, template)} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#1f9d55] px-4 font-bold text-white hover:bg-[#178247]"><MessageCircle size={18} /> Enviar por WhatsApp</a>
          : <p className="text-sm font-semibold text-amber-800">El cliente no tiene teléfono registrado.</p>}
      </div>
    </section>
  );
}
