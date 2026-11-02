import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { notifyPlatformPaymentResolved } from "@/lib/billing-notifications";
import { contractPeriods } from "@/lib/contracts";
import { loadContractData } from "@/lib/contracts-data";

const actionSchema = z.object({ action: z.enum(["confirm", "reject"]), note: z.string().trim().max(300).optional() });

/** Admin checks an owner's payment report: confirming records the period as paid; rejecting lets the owner report again. */
export async function PATCH(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(reportId).success || !parsed.success) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { data: report } = await auth.admin.from("contract_payment_reports").select("id, contract_id, period_start, period_end, amount, reference, status").eq("id", reportId).maybeSingle();
  if (!report || report.status !== "reported") return NextResponse.json({ error: "El pago ya fue revisado. Recarga la página." }, { status: 409 });
  const { contracts, ...billing } = await loadContractData(auth.admin, { contractId: report.contract_id });
  const contract = contracts[0];
  if (!contract) return NextResponse.json({ error: "El contrato no existe." }, { status: 404 });

  if (parsed.data.action === "confirm") {
    const period = contractPeriods(contract, billing).find((item) => item.start === report.period_start);
    const { error } = await auth.admin.from("contract_payments").insert({
      contract_id: contract.id,
      period_start: report.period_start,
      period_end: report.period_end,
      base_amount: period?.base ?? 0,
      amount: report.amount,
      reference: report.reference,
      recorded_by: auth.user.id,
    });
    if (error && error.code !== "23505") return NextResponse.json({ error: "No se pudo registrar el pago." }, { status: 500 });
  }
  const { error } = await auth.admin.from("contract_payment_reports").update({
    status: parsed.data.action === "confirm" ? "confirmed" : "rejected",
    note: parsed.data.note || null,
    resolved_by: auth.user.id,
    resolved_at: new Date().toISOString(),
  }).eq("id", report.id);
  if (error) return NextResponse.json({ error: "No se pudo actualizar el pago." }, { status: 500 });
  notifyPlatformPaymentResolved(contract.garage_id, parsed.data.action === "confirm", parsed.data.note || null);
  return NextResponse.json({ success: true });
}
