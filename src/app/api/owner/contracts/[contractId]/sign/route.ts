import { NextResponse } from "next/server";
import { z } from "zod";

import { notifyContractSigned } from "@/lib/billing-notifications";
import { contractCode } from "@/lib/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const signSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre completo.").max(120),
  signature: z.string().startsWith("data:image/png;base64,", "Dibuja tu firma.").max(300000, "La firma es demasiado grande."),
  accept: z.literal(true, "Debes aceptar el contrato."),
});

/** The owner it was issued to signs the contract (once). */
export async function POST(request: Request, { params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const parsed = signSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(contractId).success || !parsed.success) return NextResponse.json({ error: parsed.error?.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });

  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La firma de contratos no está configurada." }, { status: 503 });

  const { data: contract } = await admin.from("contracts").select("id, number, garage_id, owner_id, status, signed_at").eq("id", contractId).maybeSingle();
  if (!contract || contract.owner_id !== user.id) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  if (contract.signed_at) return NextResponse.json({ error: "Este contrato ya está firmado." }, { status: 409 });
  if (contract.status === "cancelled") return NextResponse.json({ error: "Este contrato fue anulado." }, { status: 409 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
  const { error } = await admin.from("contracts").update({ owner_signature: parsed.data.signature, owner_signed_name: parsed.data.name, signed_at: new Date().toISOString(), signed_ip: ip?.slice(0, 64) ?? null }).eq("id", contract.id).is("signed_at", null);
  if (error) return NextResponse.json({ error: "No se pudo guardar la firma. ¿Ejecutaste la migración 038?" }, { status: 500 });

  notifyContractSigned(contract.garage_id, contract.id, contractCode(contract.number));
  return NextResponse.json({ ok: true });
}
