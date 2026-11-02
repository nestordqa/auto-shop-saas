/** Contract periods and payment status. Dates are `YYYY-MM-DD` strings handled in UTC. */

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
/** Days after a period closes before its payment is overdue. */
export const PAYMENT_GRACE_DAYS = 5;

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

export type ContractPeriod = { start: string; end: string; dueDate: string; base: number; amount: number; status: PeriodStatus; payment?: ContractPayment };

/** Every period of a paid contract up to today; the last one is `open` while it has not closed. */
export function contractPeriods(contract: Contract, budgets: AcceptedBudget[], payments: ContractPayment[], today = todayDate()): ContractPeriod[] {
  if (contract.kind !== "paid" || !contract.billing_cycle) return [];
  const percent = Number(contract.commission_percent);
  const paidByStart = new Map(payments.filter((payment) => payment.contract_id === contract.id).map((payment) => [payment.period_start, payment]));
  const garageBudgets = budgets.filter((budget) => budget.garage_id === contract.garage_id);
  const lastDay = contract.end_date && contract.end_date < today ? contract.end_date : today;
  const periods: ContractPeriod[] = [];

  for (let start = contract.start_date; start <= lastDay; start = nextPeriodStart(start, contract.billing_cycle)) {
    const naturalEnd = addDays(nextPeriodStart(start, contract.billing_cycle), -1);
    const end = contract.end_date && contract.end_date < naturalEnd ? contract.end_date : naturalEnd;
    const base = garageBudgets
      .filter((budget) => { const day = budget.decided_at.slice(0, 10); return day >= start && day <= end; })
      .reduce((total, budget) => total + Number(budget.total_amount), 0);
    const amount = Math.round(base * percent) / 100;
    const dueDate = addDays(end, PAYMENT_GRACE_DAYS);
    const payment = paidByStart.get(start);
    const status: PeriodStatus = payment ? "paid" : end >= today ? "open" : today > dueDate ? "overdue" : "pending";
    periods.push({ start, end, dueDate, base, amount, status, payment });
  }
  return periods;
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

/** Text sent to the owner (WhatsApp or email) announcing a new contract. */
export function buildContractMessage({ contract, garageName, ownerName, pdfUrl }: { contract: Contract; garageName: string; ownerName: string; pdfUrl: string }) {
  const terms = contract.kind === "trial"
    ? [`Te damos la bienvenida con un primer mes de prueba sin costo, del ${formatDate(contract.start_date)} al ${formatDate(contract.end_date!)}.`, "Al finalizar te enviaremos el contrato con el plan de pago."]
    : [`Plan ${CYCLE_LABELS[contract.billing_cycle!].toLowerCase()} con una comisión del ${Number(contract.commission_percent)}% sobre los presupuestos aceptados, vigente desde el ${formatDate(contract.start_date)}.`, `El pago de cada período vence ${PAYMENT_GRACE_DAYS} días después de su cierre.`];
  return [
    `Hola ${ownerName},`,
    "",
    `Tienes un nuevo contrato de TorkeOS para ${garageName} (${contractCode(contract.number)}).`,
    ...terms,
    "",
    `Puedes verlo y descargarlo aquí (inicia sesión con tu cuenta): ${pdfUrl}`,
    "",
    "Cualquier duda, respóndenos por aquí.",
  ].join("\n");
}

/** Sent to a prospect: everything we need to create their garage in TorkeOS. */
export function buildRequirementsMessage(name?: string) {
  return [
    `¡Hola${name ? ` ${name}` : ""}! Gracias por tu interés en TorkeOS.`,
    "",
    "Para crear tu taller solo necesitamos estos datos:",
    "",
    "*Del taller*",
    "1. Nombre comercial",
    "2. Especialidad (opcional), por ejemplo: frenos y suspensión",
    "3. Dirección completa",
    "4. Ubicación en Google Maps (opcional)",
    "",
    "*Del dueño*",
    "5. Nombre completo",
    "6. Cédula o RIF",
    "7. Correo electrónico (será tu usuario para entrar)",
    "8. Teléfono",
    "",
    "Con eso es suficiente. Una vez creado tu taller te enviaremos tu acceso y el contrato de tu *primer mes de prueba, sin costo*.",
  ].join("\n");
}

/** Sent once the contract is signed: the garage is live, its links, and how owner and clients install the app for notifications. */
export function buildWelcomeMessage({ ownerName, garageName, garageUrl, loginUrl }: { ownerName: string; garageName: string; garageUrl: string; loginUrl: string }) {
  return [
    `¡Hola ${ownerName}! Todo listo ✅`,
    "",
    `${garageName} ya está activo en TorkeOS.`,
    "",
    `*Tu panel:* ${loginUrl}`,
    "Entra con tu correo y tu contraseña.",
    "",
    `*Enlace para tus clientes:* ${garageUrl}`,
    "Compártelo por WhatsApp, redes o en el taller: desde ahí se registran y agendan sus citas.",
    "",
    "*Importante: notificaciones*",
    "Para recibir avisos (citas nuevas, presupuestos aprobados, vehículos listos), tanto tú como tus clientes deben instalar la app y activar las notificaciones. Es gratis y no ocupa espacio:",
    "",
    "*Android (Chrome)*",
    "1. Abre el enlace en Chrome.",
    "2. Toca el menú ⋮ (arriba a la derecha).",
    "3. Elige «Instalar app» o «Agregar a pantalla principal».",
    "",
    "*iPhone (Safari)*",
    "1. Abre el enlace en Safari (no funciona desde otros navegadores).",
    "2. Toca el botón Compartir (cuadro con flecha hacia arriba).",
    "3. Elige «Agregar a inicio» y luego «Agregar».",
    "4. Abre TorkeOS desde el ícono nuevo: en iPhone las notificaciones solo funcionan desde la app instalada.",
    "",
    "*Computadora (Chrome o Edge)*",
    "1. Abre el enlace.",
    "2. Haz clic en el ícono de instalar en la barra de direcciones (o menú ⋮ → «Instalar TorkeOS»).",
    "",
    "🔔 *Muy importante: activa las notificaciones*",
    "Instalar la app no es suficiente: si no activas las notificaciones, no te llegará ningún aviso.",
    "1. Abre TorkeOS desde el ícono instalado e inicia sesión.",
    "2. Abre el menú y toca «Activar notificaciones».",
    "3. Cuando el teléfono pregunte, elige «Permitir».",
    "Si el botón dice «Notificaciones activas», ya quedó listo.",
    "",
    "Tus clientes deben hacer lo mismo con el enlace de tu taller: instalar la app *y activar las notificaciones*. ¡Bienvenido a TorkeOS!",
  ].join("\n");
}

/** Sent to the owner once the trial has ended, to ask whether they want to continue. */
export function buildTrialFollowUpMessage({ contract, garageName, ownerName }: { contract: Contract; garageName: string; ownerName: string }) {
  return [
    `Hola ${ownerName},`,
    "",
    `El mes de prueba de ${garageName} en TorkeOS terminó el ${formatDate(contract.end_date!)}. ¡Gracias por acompañarnos!`,
    "",
    "Nos gustaría saber qué te pareció: qué te sirvió, qué mejorarías y si quieres seguir usando la plataforma.",
    "",
    `Si continúas, te enviamos tu contrato. Tú eliges el plan de pago (semanal, quincenal o mensual) y solo pagas una comisión sobre los presupuestos que tus clientes aceptan.`,
    "",
    "Quedamos atentos a tu respuesta.",
  ].join("\n");
}
