import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AcceptedBudget, Contract, ContractPayment } from "@/lib/contracts";

/** Contracts, their payments and the accepted budgets needed to compute what each garage owes. */
export async function loadContractData(supabase: SupabaseClient, filter?: { contractId?: string }) {
  let contractsQuery = supabase.from("contracts").select("id, number, garage_id, owner_id, kind, billing_cycle, commission_percent, start_date, end_date, status, notes, follow_up, follow_up_at, created_at").order("created_at", { ascending: false });
  if (filter?.contractId) contractsQuery = contractsQuery.eq("id", filter.contractId);
  const { data: contracts, error } = await contractsQuery;
  if (error) throw new Error(`No se pudieron cargar los contratos: ${error.message}`);
  const paid = (contracts ?? []).filter((contract) => contract.kind === "paid");
  if (!paid.length) return { contracts: (contracts ?? []) as Contract[], payments: [] as ContractPayment[], budgets: [] as AcceptedBudget[] };

  const since = paid.reduce((oldest, contract) => contract.start_date < oldest ? contract.start_date : oldest, paid[0].start_date);
  const garageIds = [...new Set(paid.map((contract) => contract.garage_id))];
  const [paymentsResult, ordersResult, budgetsResult] = await Promise.all([
    supabase.from("contract_payments").select("contract_id, period_start, period_end, amount, base_amount, paid_at, reference").in("contract_id", paid.map((contract) => contract.id)),
    supabase.from("orders").select("id, garage_id").in("garage_id", garageIds),
    supabase.from("budgets").select("order_id, total_amount, decided_at").eq("approved", true).gte("decided_at", `${since}T00:00:00Z`),
  ]);
  if (paymentsResult.error || ordersResult.error || budgetsResult.error) throw new Error("No se pudieron cargar los cobros de los contratos.");
  const garageByOrder = new Map((ordersResult.data ?? []).map((order) => [order.id, order.garage_id as string]));
  const budgets = (budgetsResult.data ?? []).flatMap((budget) => {
    const garageId = garageByOrder.get(budget.order_id);
    return garageId && budget.decided_at ? [{ garage_id: garageId, total_amount: budget.total_amount, decided_at: budget.decided_at }] : [];
  });
  return { contracts: (contracts ?? []) as Contract[], payments: (paymentsResult.data ?? []) as ContractPayment[], budgets };
}
