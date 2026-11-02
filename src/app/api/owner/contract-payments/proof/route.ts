import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";
import { MAX_PROOF_BYTES, PROOF_TYPES } from "@/lib/payments";
import { createProofUploadUrl } from "@/lib/payments-data";

const extensions: Record<(typeof PROOF_TYPES)[number], string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Presigned URL for the proof of a plan payment (owner only, also while access is suspended). */
export async function POST(request: Request) {
  const parsed = z.object({ contentType: z.enum(PROOF_TYPES), size: z.number().int().positive().max(MAX_PROOF_BYTES) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "El comprobante debe ser una imagen (JPG, PNG, WebP) o PDF de hasta 8 MB." }, { status: 400 });
  const auth = await authorizeStaffRequest({ ownerOnly: true, allowLocked: true, unavailable: "Los pagos no están configurados." });
  if (!auth.ok) return auth.response;
  const key = `platform/${auth.staff.garageId}/${randomUUID()}.${extensions[parsed.data.contentType]}`;
  const uploadUrl = await createProofUploadUrl(key);
  if (!uploadUrl) return NextResponse.json({ error: "No se pudo preparar la subida. Verifica que exista el bucket payment-proofs." }, { status: 503 });
  return NextResponse.json({ key, uploadUrl });
}
