import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { contractPeriods } from "@/lib/contracts";
import { loadContractData } from "@/lib/contracts-data";

const paymentSchema = z.object({ periodStart: z.iso.date(), reference: z.string().trim().max(200).optional() });

/** Marks a closed period as paid; the amount is recomputed on the server, never taken from the client. */
export async function POST(request: Request, { params }: { params: Promise<{ contractId: string }> }) {
  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos del pago inválidos." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { contractId } = await params;

  const { contracts, budgets, payments } = await loadContractData(auth.admin, { contractId });
  const contract = contracts[0];
  if (!contract) return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });
  const period = contractPeriods(contract, budgets, payments).find((item) => item.start === parsed.data.periodStart);
  if (!period) return NextResponse.json({ error: "El período no existe." }, { status: 400 });
  if (period.status === "paid") return NextResponse.json({ error: "Este período ya está pagado." }, { status: 409 });
  if (period.status === "open") return NextResponse.json({ error: "El período aún no ha cerrado." }, { status: 400 });

  const { error } = await auth.admin.from("contract_payments").insert({
    contract_id: contract.id,
    period_start: period.start,
    period_end: period.end,
    base_amount: period.base,
    amount: period.amount,
    reference: parsed.data.reference || null,
    recorded_by: auth.user.id,
  });
  if (error) return NextResponse.json({ error: "No se pudo registrar el pago." }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
