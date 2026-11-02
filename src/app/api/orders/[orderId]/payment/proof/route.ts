import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientPayableOrder } from "@/lib/auth/client-order-access";
import { canPayOrder, MAX_PROOF_BYTES, PROOF_TYPES } from "@/lib/payments";
import { createProofUploadUrl } from "@/lib/payments-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const extensions: Record<(typeof PROOF_TYPES)[number], string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Presigned URL so the client uploads the payment proof straight to the private bucket. */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const parsed = z.object({ contentType: z.enum(PROOF_TYPES), size: z.number().int().positive().max(MAX_PROOF_BYTES) }).safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(orderId).success || !parsed.success) return NextResponse.json({ error: "El comprobante debe ser una imagen (JPG, PNG, WebP) o PDF de hasta 8 MB." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata.role !== "client") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Los pagos no están configurados." }, { status: 503 });
  const order = await getClientPayableOrder(admin, user.id, orderId);
  if (!order || !canPayOrder(order.status, order.budgetApproved)) return NextResponse.json({ error: "Esta orden todavía no se puede pagar." }, { status: 403 });
  const key = `${order.garageId}/${order.id}/${randomUUID()}.${extensions[parsed.data.contentType]}`;
  const uploadUrl = await createProofUploadUrl(key);
  if (!uploadUrl) return NextResponse.json({ error: "No se pudo preparar la subida. Verifica que exista el bucket payment-proofs." }, { status: 503 });
  return NextResponse.json({ key, uploadUrl });
}
