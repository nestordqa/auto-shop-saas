import { MESSAGE_TEMPLATES, renderTemplate } from "@/lib/message-templates";
import { whatsAppDigits } from "@/lib/phone";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

type WhatsAppStatusMessage = {
  phone: string;
  customerName: string;
  garageName: string;
  vehicleLabel: string;
  orderReference: string;
  status: OrderStatus;
  /** Signed link to the intake PDF, added to the "ingresado" message. */
  intakeUrl?: string;
  budget?: {
    diagnostics: { description: string; detail?: string; price: number }[];
    includesParts: boolean;
    totalAmount: number;
  };
};

const currency = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" });

const statusCopy: Record<OrderStatus, string> = {
  por_ingresar: "Tu cita está agendada. Te esperamos en la fecha acordada.",
  ingresado: "Tu vehículo fue recibido y ya se encuentra en el taller.",
  diagnosticado: "Finalizamos el diagnóstico. Revisa el presupuesto para continuar.",
  presupuestado: "Tu presupuesto está listo. Revisa el detalle y respóndenos por aquí para aprobarlo o rechazarlo.",
  en_reparacion: "Tu presupuesto fue aprobado y comenzamos la reparación.",
  en_prueba: "Estamos probando tu vehículo para confirmar que la reparación quedó bien.",
  presupuesto_rechazado: "Registramos el rechazo del presupuesto. Contáctanos para coordinar los próximos pasos.",
  listo_para_entregar: "El trabajo terminó y tu vehículo está listo para retirar.",
  entregado: "La orden fue cerrada con la entrega de tu vehículo. Gracias por elegirnos.",
};

export function normalizeWhatsAppPhone(phone: string) {
  return whatsAppDigits(phone);
}

/** `template` is the admin-edited body of "order_status". */
export function buildWhatsAppStatusMessage({
  customerName,
  garageName,
  vehicleLabel,
  orderReference,
  status,
  intakeUrl,
  budget,
}: Omit<WhatsAppStatusMessage, "phone">, template = MESSAGE_TEMPLATES.order_status.body) {
  const budgetText = budget ? [
    "Detalle del presupuesto:",
    ...budget.diagnostics.map((item, index) => `${index + 1}. ${item.description}${item.detail ? ` (${item.detail})` : ""}: ${currency.format(item.price)}`),
    `Repuestos incluidos: ${budget.includesParts ? "Sí" : "No"}`,
    `Total: ${currency.format(budget.totalAmount)}`,
  ].join("\n") : "";
  return renderTemplate(template, { cliente: customerName, taller: garageName, vehiculo: vehicleLabel, orden: orderReference, estado: ORDER_STATUS_LABELS[status], mensaje_estado: intakeUrl ? `${statusCopy[status]}

Formato de ingreso (fotos, kilometraje y estado del vehículo): ${intakeUrl}` : statusCopy[status], presupuesto: budgetText });
}

export function buildWhatsAppStatusUrl(input: WhatsAppStatusMessage, template?: string) {
  const phone = normalizeWhatsAppPhone(input.phone);
  const message = buildWhatsAppStatusMessage(input, template);

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
