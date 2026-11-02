import { BadgePercent, CalendarDays, CircleDollarSign, FileCheck2, RotateCcw } from "lucide-react";
import Link from "next/link";

import { PlatformPaymentPanel } from "@/components/owner/platform-payment-panel";
import { TablePagination } from "@/components/ui/table-pagination";
import { getPaymentMethods } from "@/lib/payments-data";
import { LOCK_AFTER_DAYS } from "@/lib/contracts";
import { duePeriodViews } from "@/lib/billing-view";
import { getGarageBillingStatus } from "@/lib/billing-status";
import { requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import { EXTRA_BRANCH_FEE } from "@/lib/billing-branches";
import { EXTRA_VEHICLE_FEE, PLANS, planCharge, type PlanKey } from "@/lib/plans";
import { aggregateBilling, formatBillingMonth, formatMoney, getBillingCommissionPercent, getBillingMonth, getMonthOptions, getMonthRange } from "@/lib/billing";

const pageSize = 10;

export default async function OwnerBillingPage({ searchParams }: { searchParams: Promise<{ month?: string; page?: string }> }) {
  const { user, garage, dataClient, branches } = await requireOwnerGarage({ ownerOnly: true });
  const { month: requestedMonth, page = "1" } = await searchParams;

  if (!garage) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Taller no asignado</h1><p className="mt-2 text-stone-600">La cuenta {user.email} no coincide con el owner configurado para un taller.</p></div>;

  const month = getBillingMonth(requestedMonth);
  const { start, end } = getMonthRange(month);
  const [{ data: orders }, { data: contract }] = await Promise.all([
    dataClient.from("orders").select("id, garage_id, created_at").eq("garage_id", garage.id),
    dataClient.from("contracts").select("kind, plan, commission_percent, end_date").eq("garage_id", garage.id).eq("status", "active").maybeSingle(),
  ]);
  const orderIds = (orders ?? []).map((order) => order.id);
  const { data: budgets } = orderIds.length
    ? await dataClient.from("budgets").select("id, order_id, total_amount, decided_at").in("order_id", orderIds).eq("approved", true).gte("decided_at", start).lt("decided_at", end).order("decided_at", { ascending: false })
    : { data: [] };
  // Commission shown per budget: Pistón's %, 0 on subscriptions, the contract's % on old contracts.
  const contractPlan = contract?.kind === "paid" && contract.plan ? PLANS[contract.plan as PlanKey] : null;
  const commissionPercent = contractPlan ? (contractPlan.kind === "commission" ? contractPlan.percent : 0) : contract?.kind === "paid" ? Number(contract.commission_percent) : getBillingCommissionPercent();
  const totals = aggregateBilling(orders ?? [], budgets ?? [], commissionPercent).get(garage.id) ?? { acceptedBudgets: 0, acceptedTotal: 0, commission: 0 };
  const totalPages = Math.max(1, Math.ceil((budgets ?? []).length / pageSize));
  const currentPage = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
  const paginatedBudgets = (budgets ?? []).slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const monthOptions = getMonthOptions(garage.created_at, month);
  const [billingStatus, platformMethods] = await Promise.all([getGarageBillingStatus(garage.id), getPaymentMethods(dataClient, null, { enabledOnly: true })]);
  const extraBranches = branches.filter((branch) => branch.is_active && !branch.is_main).length;
  // Plan in force (paid contract) and this month's usage against it.
  const plan = contractPlan;
  const vehicles = (orders ?? []).filter((order) => order.created_at >= start && order.created_at < end).length;
  const estimate = plan ? planCharge(plan.key, { base: totals.acceptedTotal, vehicles, periodDays: "month" }) : null;
  const estimatedTotal = estimate ? estimate.planFee + estimate.vehicleFee + estimate.commission + extraBranches * EXTRA_BRANCH_FEE : null;

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header><p className="text-xs font-bold uppercase text-[#d9341d]">{garage.name}</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Mi facturación</h1><p className="mt-1 text-sm text-stone-600">Tu plan, el consumo del mes y los presupuestos aceptados.</p></header>
    <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
      {contract?.kind === "trial" ? <p className="text-sm"><strong>Mes de prueba</strong>{contract.end_date && ` hasta el ${new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${contract.end_date}T00:00:00Z`))}`}: no pagas nada durante la prueba.</p>
        : !plan ? <p className="text-sm">{contract ? `Contrato por comisión del ${Number(contract.commission_percent)}% sobre los presupuestos aceptados.` : "Aún no tienes un contrato vigente."}</p>
        : <div className="grid gap-3 sm:grid-cols-3">
            <div><p className="text-xs font-bold uppercase text-stone-500">Tu plan</p><p className="font-display text-2xl font-bold">{plan.name}</p><p className="text-xs text-stone-500">{plan.kind === "subscription" ? `${formatMoney(plan.price)}/mes · hasta ${plan.vehicleLimit} vehículos` : `${plan.percent}% · mín. ${formatMoney(plan.minimum)}, máx. ${formatMoney(plan.maximum)}/mes`}</p></div>
            <div><p className="text-xs font-bold uppercase text-stone-500">Vehículos este mes</p><p className={`font-display text-2xl font-bold ${plan.kind === "subscription" && vehicles > plan.vehicleLimit ? "text-[#d9341d]" : ""}`}>{vehicles}{plan.kind === "subscription" && <span className="text-base font-semibold text-stone-500"> / {plan.vehicleLimit}</span>}</p>{estimate?.extraVehicles ? <p className="text-xs font-semibold text-[#d9341d]">{estimate.extraVehicles} extra × {formatMoney(EXTRA_VEHICLE_FEE)}</p> : null}</div>
            <div><p className="text-xs font-bold uppercase text-stone-500">Estimado del mes</p><p className="font-display text-2xl font-bold">{formatMoney(estimatedTotal ?? 0)}</p><p className="text-xs text-stone-500">{estimate?.minimumApplied ? "Se aplica el mínimo del plan" : estimate?.maximumApplied ? "Llegaste al máximo del plan" : "Según lo registrado hasta hoy"}{extraBranches ? ` · incluye ${extraBranches} sucursal(es)` : ""}</p></div>
          </div>}
    </section>
    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Período" value={formatBillingMonth(month)} icon={CalendarDays} /><Metric label="Aceptados" value={String(totals.acceptedBudgets)} icon={FileCheck2} /><Metric label="Base aceptada" value={formatMoney(totals.acceptedTotal)} icon={CircleDollarSign} /><Metric label={`Comisión ${commissionPercent}%`} value={formatMoney(totals.commission)} icon={BadgePercent} /></section>
    <section className="mt-6">
      <h2 className="font-display text-xl font-bold">Pagos a TorkeOS</h2>
      <p className="mb-3 mt-1 text-sm text-stone-600">Cada período se paga a su cierre. Reporta tu pago con el comprobante y te avisaremos cuando lo verifiquemos. Tras {LOCK_AFTER_DAYS} días de mora se suspende el acceso de tu equipo.</p>
      <PlatformPaymentPanel periods={duePeriodViews(billingStatus)} methods={platformMethods} lockAfterDays={LOCK_AFTER_DAYS} />
    </section>
    {extraBranches > 0 && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Además de la comisión, tus <strong>{extraBranches}</strong> sucursal(es) adicional(es) suman <strong>{formatMoney(extraBranches * EXTRA_BRANCH_FEE)}</strong> al mes ({formatMoney(EXTRA_BRANCH_FEE)} c/u).</p>}
    <form className="mt-5 flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:flex-row"><select name="month" defaultValue={month} className="min-h-12 flex-1 rounded-md border border-stone-300 bg-white px-4">{monthOptions.map((option) => <option key={option} value={option}>{formatBillingMonth(option)}</option>)}</select><button className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Ver período</button>{requestedMonth && <Link href="/dashboard/owner/billing" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold text-stone-700"><RotateCcw size={18} /> Limpiar</Link>}</form>
    <section className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"><div className="border-b border-stone-200 p-4"><h2 className="font-bold">Presupuestos aceptados</h2></div><div className="overflow-x-auto"><table className="min-w-155 w-full text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Referencia</th><th className="p-4">Aceptado</th><th className="p-4 text-right">Monto</th><th className="p-4 text-right">Comisión</th></tr></thead><tbody className="divide-y divide-stone-100">{paginatedBudgets.map((budget) => <tr key={budget.id}><td className="p-4 font-bold">{budget.order_id.slice(0, 8).toUpperCase()}</td><td className="p-4">{budget.decided_at ? new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(budget.decided_at)) : "—"}</td><td className="p-4 text-right font-semibold">{formatMoney(Number(budget.total_amount))}</td><td className="p-4 text-right font-bold text-[#d9341d]">{formatMoney(Number(budget.total_amount) * commissionPercent / 100)}</td></tr>)}</tbody></table>{!budgets?.length && <p className="p-8 text-center text-stone-500">No hay presupuestos aceptados en este período.</p>}</div><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/owner/billing" searchParams={{ month }} totalItems={budgets?.length ?? 0} /></section>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CalendarDays }) {
  return <article className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"><div className="min-w-0"><p className="text-xs text-stone-500 sm:text-sm">{label}</p><p className="mt-1 truncate font-display text-xl font-bold capitalize sm:text-2xl">{value}</p></div><Icon className="shrink-0 text-stone-400" size={20} /></article>;
}