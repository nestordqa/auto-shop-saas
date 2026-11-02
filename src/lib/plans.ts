import { EXTRA_BRANCH_FEE } from "@/lib/billing-branches";

export const PLAN_KEYS = ["bujia", "alternador", "piston"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export type Plan =
  | { key: PlanKey; kind: "subscription"; name: string; price: number; vehicleLimit: number; audience: string }
  | { key: PlanKey; kind: "commission"; name: string; percent: number; minimum: number; maximum: number; audience: string };

/** Charged per vehicle over a subscription plan's monthly limit. */
export const EXTRA_VEHICLE_FEE = 1.99;

/** Plan prices are in USD, payable in bolívares at the official BCV rate of the payment day. */
export const RATE_NOTE = "tasa BCV";

export const PLANS: Record<PlanKey, Plan> = {
  bujia: { key: "bujia", kind: "subscription", name: "Bujía", price: 30, vehicleLimit: 15, audience: "Talleres pequeños" },
  alternador: { key: "alternador", kind: "subscription", name: "Alternador", price: 48, vehicleLimit: 40, audience: "Talleres medianos" },
  piston: { key: "piston", kind: "commission", name: "Pistón", percent: 2, minimum: 60, maximum: 150, audience: "Talleres grandes" },
};

const usd = (value: number) => `$${Number.isInteger(value) ? value : value.toFixed(2)}`;

/** One line: "Bujía · $30/mes · hasta 15 vehículos al mes". */
export function planSummary(key: PlanKey) {
  const plan = PLANS[key];
  return plan.kind === "subscription"
    ? `${plan.name} · ${usd(plan.price)}/mes · hasta ${plan.vehicleLimit} vehículos al mes`
    : `${plan.name} · ${plan.percent}% de los presupuestos aceptados (mínimo ${usd(plan.minimum)}, máximo ${usd(plan.maximum)} al mes) · vehículos ilimitados`;
}

/** Plan comparison for WhatsApp messages and forms. */
export function plansComparisonLines() {
  return [
    ...PLAN_KEYS.map((key) => {
      const plan = PLANS[key];
      return plan.kind === "subscription"
        ? `🔹 *${plan.name}* (${plan.audience.toLowerCase()}): ${usd(plan.price)} al mes, hasta ${plan.vehicleLimit} vehículos al mes. Si te pasas, cada vehículo extra cuesta ${usd(EXTRA_VEHICLE_FEE)}.`
        : `🔹 *${plan.name}* (${plan.audience.toLowerCase()}): ${plan.percent}% de los presupuestos que tus clientes aprueben, con un mínimo de ${usd(plan.minimum)} y un máximo de ${usd(plan.maximum)} al mes. Vehículos ilimitados: aunque factures mucho, nunca pagas más de ${usd(plan.maximum)}.`;
    }),
    `➕ Cada sucursal adicional suma ${usd(EXTRA_BRANCH_FEE)} al mes en cualquier plan.`,
    `💱 Montos en dólares, pagaderos a ${RATE_NOTE}.`,
  ];
}

/** Vehicles counted for a subscription period: orders created in it. */
export type GarageOrderDate = { garage_id: string; created_at: string };

/**
 * Plan charge for one billing period (branch fee apart). Subscriptions: monthly price plus extra vehicles.
 * Pistón: the commission kept between the minimum and the maximum, both prorated for weekly/biweekly periods.
 */
export function planCharge(key: PlanKey, { base, vehicles, periodDays }: { base: number; vehicles: number; periodDays: number | "month" }) {
  const plan = PLANS[key];
  if (plan.kind === "subscription") {
    const extraVehicles = Math.max(0, vehicles - plan.vehicleLimit);
    return { planFee: plan.price, extraVehicles, vehicleFee: Math.round(extraVehicles * EXTRA_VEHICLE_FEE * 100) / 100, minimumApplied: false, maximumApplied: false, commission: 0 };
  }
  const commission = Math.round(base * plan.percent) / 100;
  const prorate = (value: number) => periodDays === "month" ? value : Math.round(value * periodDays / 30 * 100) / 100;
  const [minimum, maximum] = [prorate(plan.minimum), prorate(plan.maximum)];
  return { planFee: 0, extraVehicles: 0, vehicleFee: 0, minimumApplied: commission < minimum, maximumApplied: commission > maximum, commission: Math.min(Math.max(commission, minimum), maximum) };
}
