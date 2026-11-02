import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { PAYMENT_COLUMNS, PAYMENT_KINDS, type BankAccount, type OrderPayment, type PaymentKind, type PaymentMethod, type PaymentStatus } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export const PAYMENT_PROOFS_BUCKET = "payment-proofs";

const text = (max: number) => z.string().trim().max(max);
// Lengths only: completeness is checked in `paymentMethodsError`, and only for enabled methods.
const accountSchema = z.object({ bank: text(80), number: text(40), type: text(20), holder: text(120), document: text(30) });
const isBlankAccount = (account: z.infer<typeof accountSchema>) => !account.bank && !account.number && !account.holder && !account.document;
const isCompleteAccount = (account: z.infer<typeof accountSchema>) => account.bank.length >= 2 && account.number.length >= 4 && account.holder.length >= 2 && account.document.length >= 4;

/** What the owner saves: every kind, enabled or not (disabled ones keep their data for later). */
export const paymentMethodsSchema = z.array(z.object({
  kind: z.enum(PAYMENT_KINDS),
  enabled: z.boolean(),
  discountPercent: z.number().gt(0).lt(100).nullable(),
  details: z.record(z.string(), text(200)),
  // Rows left empty in the form are dropped.
  accounts: z.array(accountSchema).max(10).transform((accounts) => accounts.filter((account) => !isBlankAccount(account))),
})).max(PAYMENT_KINDS.length);

/** Message for an enabled method missing its data, or null when the payload is complete. */
export function paymentMethodsError(methods: z.infer<typeof paymentMethodsSchema>) {
  for (const method of methods) {
    if (method.enabled && method.kind === "transferencia" && !method.accounts.length) return "Agrega al menos una cuenta bancaria para activar la transferencia.";
    if (method.enabled && method.kind === "transferencia" && !method.accounts.every(isCompleteAccount)) return "Cada cuenta bancaria necesita banco, número (4+ dígitos), titular y cédula o RIF.";
    if (method.enabled && method.kind !== "transferencia" && !Object.values(method.details).some(Boolean)) return "Completa los datos de cada método activo.";
  }
  return null;
}

/** Row to store for one method: transfers keep their accounts inside `details`. */
export const paymentMethodRow = (method: z.infer<typeof paymentMethodsSchema>[number]) => ({
  kind: method.kind,
  enabled: method.enabled,
  discount_percent: method.discountPercent,
  details: method.kind === "transferencia" ? { accounts: method.accounts } : method.details,
});

/**
 * Payment methods in the fixed display order: a garage's (what its clients pay with) or, with `garageId` null,
 * TorkeOS's own (what garages pay their plan with). `enabledOnly` for what payers see.
 */
export async function getPaymentMethods(admin: SupabaseClient, garageId: string | null, { enabledOnly = false } = {}): Promise<PaymentMethod[]> {
  const { data } = garageId
    ? await admin.from("garage_payment_methods").select("kind, enabled, discount_percent, details").eq("garage_id", garageId)
    : await admin.from("platform_payment_methods").select("kind, enabled, discount_percent, details");
  const byKind = new Map((data ?? []).map((row) => [row.kind as PaymentKind, row]));
  return PAYMENT_KINDS.flatMap((kind) => {
    const row = byKind.get(kind);
    if (enabledOnly && !row?.enabled) return [];
    const { accounts, ...details } = (row?.details ?? {}) as Record<string, string> & { accounts?: BankAccount[] };
    return [{ kind, enabled: row?.enabled ?? false, discountPercent: row?.discount_percent === null || row?.discount_percent === undefined ? null : Number(row.discount_percent), details, accounts: accounts ?? [] }];
  });
}

type PaymentRow = { id: string; order_id: string; status: string; method_kind: string | null; discount_percent: number | string | null; base_amount: number | string; amount: number | string; reference: string | null; proof_path: string | null; note: string | null; created_at: string; resolved_at: string | null };

/** Latest payment of each order (the live one, or the last rejected), with signed proof URLs. */
export async function getOrderPayments(admin: SupabaseClient, orderIds: string[]) {
  const result = new Map<string, OrderPayment>();
  if (!orderIds.length) return result;
  const { data } = await admin.from("order_payments").select(PAYMENT_COLUMNS).in("order_id", orderIds).order("created_at", { ascending: false });
  const latest = new Map<string, PaymentRow>();
  for (const row of (data ?? []) as PaymentRow[]) if (!latest.has(row.order_id)) latest.set(row.order_id, row);
  const proofPaths = [...latest.values()].map((row) => row.proof_path).filter((path): path is string => Boolean(path));
  const urls = new Map<string, string>();
  if (proofPaths.length) {
    const { data: signed } = await admin.storage.from(PAYMENT_PROOFS_BUCKET).createSignedUrls(proofPaths, 3600);
    for (const item of signed ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  for (const [orderId, row] of latest) {
    result.set(orderId, {
      id: row.id,
      status: row.status as PaymentStatus,
      methodKind: row.method_kind as PaymentKind | null,
      discountPercent: row.discount_percent === null ? null : Number(row.discount_percent),
      baseAmount: Number(row.base_amount),
      amount: Number(row.amount),
      reference: row.reference,
      proofUrl: row.proof_path ? urls.get(row.proof_path) ?? null : null,
      note: row.note,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    });
  }
  return result;
}

/** Signed URL the browser uses to PUT the proof straight into the private bucket. */
export async function createProofUploadUrl(path: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage.from(PAYMENT_PROOFS_BUCKET).createSignedUploadUrl(path);
  return error || !data ? null : data.signedUrl;
}
