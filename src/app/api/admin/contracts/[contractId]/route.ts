import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { todayDate } from "@/lib/contracts";

const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("follow_up"), value: z.enum(["contacted", "interested", "declined"]).nullable() }),
]);

/** Ends a contract today, or records the follow-up of an expired trial. */
export async function PATCH(request: Request, { params }: { params: Promise<{ contractId: string }> }) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { contractId } = await params;

  const { data: contract } = await auth.admin.from("contracts").select("id, kind, start_date, end_date, status").eq("id", contractId).maybeSingle();
  if (!contract) return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });

  if (parsed.data.action === "follow_up") {
    if (contract.kind !== "trial") return NextResponse.json({ error: "El seguimiento es solo para pruebas." }, { status: 400 });
    const value = parsed.data.value;
    const { error } = await auth.admin.from("contracts").update({ follow_up: value, follow_up_at: value ? new Date().toISOString() : null }).eq("id", contractId);
    if (error) return NextResponse.json({ error: "No se pudo guardar el seguimiento." }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (contract.status !== "active") return NextResponse.json({ error: "El contrato no está vigente." }, { status: 400 });
  const today = todayDate();
  const endDate = contract.end_date && contract.end_date < today ? contract.end_date : today < contract.start_date ? contract.start_date : today;
  const { error } = await auth.admin.from("contracts").update({ status: "ended", end_date: endDate }).eq("id", contractId);
  if (error) return NextResponse.json({ error: "No se pudo finalizar el contrato." }, { status: 500 });
  return NextResponse.json({ success: true });
}
