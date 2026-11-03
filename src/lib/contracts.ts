/** Contract periods and payment status. Dates are `YYYY-MM-DD` strings handled in UTC. */

import { MESSAGE_TEMPLATES, renderTemplate } from "@/lib/message-templates";
import { branchFeeForPeriod, type ExtraBranch } from "@/lib/billing-branches";
import { planCharge, PLANS, plansComparisonLines, planSummary, type GarageOrderDate, type PlanKey } from "@/lib/plans";

export type ContractKind = "trial" | "paid";
export type BillingCycle = "weekly" | "biweekly" | "monthly";
export type ContractStatus = "active" | "ended" | "cancelled";

export type Contract = {
  id: string;
  number: number;
  garage_id: string;
  owner_id: string;
  kind: ContractKind;
  billing_cycle: BillingCycle | null;
  /** Null on paid contracts created before plans existed (commission only). */
  plan: PlanKey | null;
  commission_percent: number | string;
  start_date: string;
  end_date: string | null;
  status: ContractStatus;
  notes: string | null;
  follow_up: FollowUp | null;
  follow_up_at: string | null;
  created_at: string;
};

export type FollowUp = "contacted" | "interested" | "declined";

export const FOLLOW_UP_LABELS: Record<FollowUp, string> = { contacted: "Seguimiento enviado", interested: "Quiere continuar", declined: "No continúa" };

export type ContractPayment = { contract_id: string; period_start: string; period_end: string; amount: number | string; base_amount: number | string; paid_at: string; reference: string | null };

export type AcceptedBudget = { garage_id: string; total_amount: number | string; decided_at: string };

export const TRIAL_DAYS = 30;
/** A period is due the day it closes (its billing date) and overdue from the next day. */
export const PAYMENT_GRACE_DAYS = 0;
/** Days overdue after which owners, managers and mechanics lose access until the garage pays. */
export const LOCK_AFTER_DAYS = 10;

/** Whole days from `from` to `to` (YYYY-MM-DD). */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const CYCLE_LABELS: Record<BillingCycle, string> = { weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual" };
export const CYCLE_DESCRIPTIONS: Record<BillingCycle, string> = { weekly: "cada 7 días", biweekly: "cada 15 días", monthly: "cada mes calendario" };

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function nextPeriodStart(start: string, cycle: BillingCycle) {
  if (cycle === "weekly") return addDays(start, 7);
  if (cycle === "biweekly") return addDays(start, 15);
  const value = new Date(`${start}T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  return value.toISOString().slice(0, 10);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export type PeriodStatus = "paid" | "pending" | "overdue" | "open";

/** Billing inputs loaded by `loadContractData`. */
export type ContractBillingData = { budgets: AcceptedBudget[]; payments: ContractPayment[]; extraBranches: ExtraBranch[]; orders: GarageOrderDate[] };

/**
 * `amount` = plan charge + `branchFee`. With a plan: subscription price + extra vehicles, or Pistón's
 * commission (never below its minimum). Contracts without a plan (before plans existed) charge the commission only.
 */
export type ContractPeriod = {
  start: string; end: string; dueDate: string;
  base: number; commission: number;
  planFee: number; vehicles: number; extraVehicles: number; vehicleFee: number; minimumApplied: boolean; maximumApplied: boolean;
  branchFee: number; extraBranches: number;
  amount: number; status: PeriodStatus; payment?: ContractPayment;
};

/** Every period of a paid contract up to today; the last one is `open` while it has not closed. */
export function contractPeriods(contract: Contract, data: ContractBillingData, today = todayDate()): ContractPeriod[] {
  if (contract.kind !== "paid" || !contract.billing_cycle) return [];
  const percent = Number(contract.commission_percent);
  const paidByStart = new Map(data.payments.filter((payment) => payment.contract_id === contract.id).map((payment) => [payment.period_start, payment]));
  const garageBudgets = data.budgets.filter((budget) => budget.garage_id === contract.garage_id);
  const garageOrders = data.orders.filter((order) => order.garage_id === contract.garage_id);
  const lastDay = contract.end_date && contract.end_date < today ? contract.end_date : today;
  const periodDays = contract.billing_cycle === "monthly" ? "month" : contract.billing_cycle === "weekly" ? 7 : 15;
  const periods: ContractPeriod[] = [];

  for (let start = contract.start_date; start <= lastDay; start = nextPeriodStart(start, contract.billing_cycle)) {
    const naturalEnd = addDays(nextPeriodStart(start, contract.billing_cycle), -1);
    const end = contract.end_date && contract.end_date < naturalEnd ? contract.end_date : naturalEnd;
    const inPeriod = (timestamp: string) => { const day = timestamp.slice(0, 10); return day >= start && day <= end; };
    const base = garageBudgets.filter((budget) => inPeriod(budget.decided_at)).reduce((total, budget) => total + Number(budget.total_amount), 0);
    const vehicles = garageOrders.filter((order) => inPeriod(order.created_at)).length;
    const charge = contract.plan
      ? planCharge(contract.plan, { base, vehicles, periodDays })
      : { planFee: 0, extraVehicles: 0, vehicleFee: 0, minimumApplied: false, maximumApplied: false, commission: Math.round(base * percent) / 100 };
    const { count, fee: branchFee } = branchFeeForPeriod(data.extraBranches, contract.garage_id, start, end, periodDays);
    const amount = Math.round((charge.planFee + charge.vehicleFee + charge.commission + branchFee) * 100) / 100;
    const dueDate = addDays(end, PAYMENT_GRACE_DAYS);
    const payment = paidByStart.get(start);
    const status: PeriodStatus = payment ? "paid" : end >= today ? "open" : today > dueDate ? "overdue" : "pending";
    periods.push({ start, end, dueDate, base, vehicles, ...charge, branchFee, extraBranches: count, amount, status, payment });
  }
  return periods;
}

/** "Plan $15 + 3 vehículos extra $2.25 + 1 sucursal $10" style detail of a period's amount. */
export function periodBreakdown(period: ContractPeriod, money: (value: number) => string) {
  const parts = [
    period.planFee ? `Plan ${money(period.planFee)}` : "",
    period.vehicleFee ? `${period.extraVehicles} vehículo(s) extra ${money(period.vehicleFee)}` : "",
    !period.planFee ? `${period.minimumApplied ? "Mínimo" : period.maximumApplied ? "Máximo" : "Comisión"} ${money(period.commission)}` : "",
    period.branchFee ? `${period.extraBranches} sucursal(es) ${money(period.branchFee)}` : "",
  ];
  return parts.filter(Boolean).join(" + ");
}

export type GarageStanding = "up_to_date" | "pending" | "overdue" | "trial" | "trial_expired" | "no_contract";

export const STANDING_LABELS: Record<GarageStanding, string> = {
  up_to_date: "Al día",
  pending: "Por cobrar",
  overdue: "Vencido",
  trial: "En prueba",
  trial_expired: "Prueba finalizada",
  no_contract: "Sin contrato",
};

export const STANDING_STYLES: Record<GarageStanding, string> = {
  up_to_date: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  trial: "bg-sky-100 text-sky-800",
  trial_expired: "bg-orange-100 text-orange-800",
  no_contract: "bg-stone-100 text-stone-600",
};

/** Debts (from any of the garage's contracts) come first; otherwise the contract in force decides. */
export function garageStanding(current: Contract | undefined, periods: ContractPeriod[], today = todayDate()): GarageStanding {
  if (periods.some((period) => period.status === "overdue")) return "overdue";
  if (periods.some((period) => period.status === "pending")) return "pending";
  if (!current || current.status !== "active") return "no_contract";
  if (current.kind === "trial") return current.end_date && current.end_date < today ? "trial_expired" : "trial";
  return "up_to_date";
}

export function contractTitle(contract: Pick<Contract, "kind">) {
  return contract.kind === "trial" ? "Contrato de prueba gratuita" : "Contrato de servicio";
}

export function contractCode(number: number) {
  return `TK-${String(number).padStart(4, "0")}`;
}

/** Text sent to the owner (WhatsApp or email) announcing a new contract. `template` is the admin-edited body. */
export function buildContractMessage({ contract, garageName, ownerName, pdfUrl }: { contract: Contract; garageName: string; ownerName: string; pdfUrl: string }, template = MESSAGE_TEMPLATES.contract_new.body) {
  const terms = contract.kind === "trial"
    ? [`Te damos la bienvenida con un primer mes de prueba por *$0*, del ${formatDate(contract.start_date)} al ${formatDate(contract.end_date!)}, con todas las funciones.`, "Cuando venza, elige tu plan (Bujía, Alternador o Pistón) desde tu panel en TorkeOS; te lo recordaremos al entrar."]
    : [contract.plan ? `Plan ${PLANS[contract.plan].name}: ${planSummary(contract.plan).split(" · ").slice(1).join(", ")}, vigente desde el ${formatDate(contract.start_date)}.` : `Comisión del ${Number(contract.commission_percent)}% sobre los presupuestos aceptados, vigente desde el ${formatDate(contract.start_date)}.`, `Se cobra ${CYCLE_DESCRIPTIONS[contract.billing_cycle!]}; el pago vence al cierre de cada período y, tras ${LOCK_AFTER_DAYS} días de mora, se suspende el acceso hasta ponerse al día.`];
  return renderTemplate(template, { owner: ownerName, taller: garageName, codigo: contractCode(contract.number), condiciones: terms.join("\n"), enlace: pdfUrl });
}

/** Sent to a prospect: everything we need to create their garage in TorkeOS. */
export function buildRequirementsMessage(name?: string, template = MESSAGE_TEMPLATES.prospect_requirements.body) {
  return renderTemplate(template, { contacto: name ?? "", planes: plansComparisonLines().join("\n") });
}

/** Sent once the contract is signed: the garage is live, its links, and how to install the app for notifications. */
export function buildWelcomeMessage({ ownerName, garageName, garageUrl, loginUrl }: { ownerName: string; garageName: string; garageUrl: string; loginUrl: string }, template = MESSAGE_TEMPLATES.owner_welcome.body) {
  return renderTemplate(template, { owner: ownerName, taller: garageName, panel: loginUrl, enlace: garageUrl });
}

/** Sent to the owner once the trial has ended, to ask whether they want to continue. */
export function buildTrialFollowUpMessage({ contract, garageName, ownerName }: { contract: Contract; garageName: string; ownerName: string }, template = MESSAGE_TEMPLATES.trial_follow_up.body) {
  return renderTemplate(template, { owner: ownerName, taller: garageName, fin: formatDate(contract.end_date!), planes: plansComparisonLines().join("\n") });
}
