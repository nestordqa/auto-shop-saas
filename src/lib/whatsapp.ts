import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

type WhatsAppStatusMessage = {
  phone: string;
  customerName: string;
  garageName: string;
  vehicleLabel: string;
  orderReference: string;
  status: OrderStatus;
  budget?: {
    diagnostics: { description: string; price: number }[];
    includesParts: boolean;
    totalAmount: number;
  };
};

const currency = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" });

const statusCopy: Record<OrderStatus, string> = {
  por_ingresar: "Tu cita está agendada. Te esperamos en la fecha acordada.",
  ingresado: "Tu vehículo fue recibido y ya se encuentra en el taller.",
  diagnosticado: "Finalizamos el diagnóstico. Revisa el presupuesto para continuar.",
  presupuestado: "Tu presupuesto está listo. Revisa el detalle para aprobarlo o rechazarlo.",
  en_reparacion: "Tu presupuesto fue aprobado y comenzamos la reparación.",
  presupuesto_rechazado: "Registramos el rechazo del presupuesto. Contáctanos para coordinar los próximos pasos.",
  listo_para_entregar: "El trabajo terminó y tu vehículo está listo para retirar.",
  entregado: "La orden fue cerrada con la entrega de tu vehículo. Gracias por elegirnos.",
};

export function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  return digits.startsWith("58") ? digits : `58${digits}`;
}

export function buildWhatsAppStatusMessage({
  customerName,
  garageName,
  vehicleLabel,
  orderReference,
  status,
  budget,
}: Omit<WhatsAppStatusMessage, "phone">) {
  const lines = [
    `Hola ${customerName},`,
    "",
    `Actualización de ${garageName}`,
    `Vehículo: ${vehicleLabel}`,
    `Orden: ${orderReference}`,
    `Estado: ${ORDER_STATUS_LABELS[status]}`,
    "",
    statusCopy[status],
  ];

  if (budget) {
    lines.push(
      "",
      "Detalle del presupuesto:",
      ...budget.diagnostics.map((item, index) => `${index + 1}. ${item.description}: ${currency.format(item.price)}`),
      `Repuestos incluidos: ${budget.includesParts ? "Sí" : "No"}`,
      `Total: ${currency.format(budget.totalAmount)}`,
    );
  }

  return lines.join("\n");
}

export function buildWhatsAppStatusUrl(input: WhatsAppStatusMessage) {
  const phone = normalizeWhatsAppPhone(input.phone);
  const message = buildWhatsAppStatusMessage(input);

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}