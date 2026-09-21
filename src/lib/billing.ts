const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export type BillingBudget = {
  order_id: string;
  total_amount: number | string;
};

export type BillingOrder = {
  id: string;
  garage_id: string;
};

export function getBillingCommissionPercent() {
  const configured = Number(process.env.NEXT_PUBLIC_BILLING_COMMISSION_PERCENT ?? "3");
  return Number.isFinite(configured) && configured >= 0 && configured <= 100 ? configured : 3;
}

export function getBillingMonth(value?: string) {
  const currentMonth = formatMonthValue(new Date());
  return value && monthPattern.test(value) && value <= currentMonth ? value : currentMonth;
}

export function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString(),
    end: new Date(Date.UTC(year, monthNumber, 1)).toISOString(),
  };
}

export function getMonthOptions(createdAt: string, selectedMonth: string) {
  const firstMonth = formatMonthValue(new Date(createdAt));
  const currentMonth = formatMonthValue(new Date());
  const start = firstMonth < selectedMonth ? firstMonth : selectedMonth;
  const options: string[] = [];
  const [startYear, startMonth] = start.split("-").map(Number);
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));

  while (formatMonthValue(cursor) <= currentMonth) {
    options.push(formatMonthValue(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return options.reverse();
}

export function aggregateBilling(orders: BillingOrder[], budgets: BillingBudget[], commissionPercent: number) {
  const garageByOrder = new Map(orders.map((order) => [order.id, order.garage_id]));
  const totals = new Map<string, { acceptedBudgets: number; acceptedTotal: number; commission: number }>();

  for (const budget of budgets) {
    const garageId = garageByOrder.get(budget.order_id);
    if (!garageId) continue;
    const current = totals.get(garageId) ?? { acceptedBudgets: 0, acceptedTotal: 0, commission: 0 };
    current.acceptedBudgets += 1;
    current.acceptedTotal += Number(budget.total_amount);
    current.commission = current.acceptedTotal * commissionPercent / 100;
    totals.set(garageId, current);
  }

  return totals;
}

export function formatBillingMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es", { style: "currency", currency: "USD" }).format(value);
}

function formatMonthValue(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}