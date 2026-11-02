import type { OrderStatus } from "@/types/domain";

export const PAYMENT_KINDS = ["pago_movil", "transferencia", "binance", "zelle", "paypal"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  pago_movil: "Pago móvil",
  transferencia: "Transferencia bancaria",
  binance: "Binance",
  zelle: "Zelle",
  paypal: "PayPal",
};

/** Fields the owner fills for each kind (transfers use `accounts` instead). */
export const PAYMENT_FIELDS: Record<Exclude<PaymentKind, "transferencia">, { key: string; label: string; placeholder: string }[]> = {
  pago_movil: [
    { key: "bank", label: "Banco", placeholder: "Ej.: Banesco" },
    { key: "phone", label: "Teléfono", placeholder: "0412-1234567" },
    { key: "document", label: "Cédula / RIF", placeholder: "V-12345678" },
  ],
  binance: [
    { key: "account", label: "Binance Pay ID o correo", placeholder: "123456789" },
    { key: "holder", label: "Titular (opcional)", placeholder: "Nombre" },
  ],
  zelle: [
    { key: "account", label: "Correo o teléfono Zelle", placeholder: "pagos@taller.com" },
    { key: "holder", label: "Titular", placeholder: "Nombre como aparece en Zelle" },
  ],
  paypal: [
    { key: "account", label: "Correo PayPal", placeholder: "pagos@taller.com" },
  ],
};

export type BankAccount = { bank: string; number: string; type: string; holder: string; document: string };
export const ACCOUNT_TYPES = ["Corriente", "Ahorro"];

export type PaymentMethod = {
  kind: PaymentKind;
  enabled: boolean;
  discountPercent: number | null;
  details: Record<string, string>;
  accounts: BankAccount[];
};

export const PAYMENT_STATUSES = ["reported", "confirmed", "rejected", "pay_at_garage", "received"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  reported: "Pago reportado · por confirmar",
  confirmed: "Pago confirmado",
  rejected: "Pago rechazado",
  pay_at_garage: "Pagará en el taller",
  received: "Pago recibido",
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  reported: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  pay_at_garage: "bg-sky-100 text-sky-800",
  received: "bg-emerald-100 text-emerald-800",
};

export type OrderPayment = {
  id: string;
  status: PaymentStatus;
  methodKind: PaymentKind | null;
  discountPercent: number | null;
  baseAmount: number;
  amount: number;
  reference: string | null;
  proofUrl: string | null;
  note: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export const PAYMENT_COLUMNS = "id, order_id, status, method_kind, discount_percent, base_amount, amount, reference, proof_path, note, created_at, resolved_at";

/** Payment opens once the client approved the budget and the car is ready to be repaired (or later). */
const PAYABLE_STATUSES: OrderStatus[] = ["en_reparacion", "en_prueba", "listo_para_entregar", "entregado"];
export function canPayOrder(status: OrderStatus, budgetApproved: boolean | null | undefined) {
  return budgetApproved === true && PAYABLE_STATUSES.includes(status);
}

/** Amount after the method's discount, rounded to cents. */
export function discountedAmount(base: number, discountPercent: number | null | undefined) {
  return Math.round(base * (1 - (discountPercent ?? 0) / 100) * 100) / 100;
}

export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const MAX_PROOF_BYTES = 8 * 1024 * 1024;
