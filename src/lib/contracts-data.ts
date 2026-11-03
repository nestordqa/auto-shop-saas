import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ExtraBranch } from "@/lib/billing-branches";
import { CONTRACT_COLUMNS, type AcceptedBudget, type Contract, type ContractPayment } from "@/lib/contracts";
import type { GarageOrderDate } from "@/lib/plans";

/** Contracts plus what `contractPeriods` needs: payments, accepted budgets, extra (billable) branches and orders (vehicles per period). */
export async function loadContractData(supabase: SupabaseClient, filter?: { contractId?: string; garageId?: string }) {
  let contractsQuery = supabase.from("contracts").select(CONTRACT_COLUMNS).order("created_at", { ascending: false });
  if (filter?.contractId) contractsQuery = contractsQuery.eq("id", filter.contractId);
  if (filter?.garageId) contractsQuery = contractsQuery.eq("garage_id", filter.garageId);
  const { data: contracts, error } = await contractsQuery;
  if (error) throw new Error(`No se pudieron cargar los contratos: ${error.message}`);
  const paid = (contracts ?? []).filter((contract) => contract.kind === "paid");
  if (!paid.length) return { contracts: (contracts ?? []) as Contract[], payments: [] as ContractPayment[], budgets: [] as AcceptedBudget[], extraBranches: [] as ExtraBranch[], orders: [] as GarageOrderDate[] };

  const since = paid.reduce((oldest, contract) => contract.start_date < oldest ? contract.start_date : oldest, paid[0].start_date);
  const garageIds = [...new Set(paid.map((contract) => contract.garage_id))];
  const [paymentsResult, ordersResult, budgetsResult, branchesResult] = await Promise.all([
    supabase.from("contract_payments").select("contract_id, period_start, period_end, amount, base_amount, paid_at, reference").in("contract_id", paid.map((contract) => contract.id)),
    supabase.from("orders").select("id, garage_id, created_at").in("garage_id", garageIds),
    supabase.from("budgets").select("order_id, total_amount, decided_at").eq("approved", true).gte("decided_at", `${since}T00:00:00Z`),
    supabase.from("garage_branches").select("garage_id, created_at, deactivated_at").in("garage_id", garageIds).eq("is_main", false),
  ]);
  if (paymentsResult.error || ordersResult.error || budgetsResult.error) throw new Error("No se pudieron cargar los cobros de los contratos.");
  const garageByOrder = new Map((ordersResult.data ?? []).map((order) => [order.id, order.garage_id as string]));
  const budgets = (budgetsResult.data ?? []).flatMap((budget) => {
    const garageId = garageByOrder.get(budget.order_id);
    return garageId && budget.decided_at ? [{ garage_id: garageId, total_amount: budget.total_amount, decided_at: budget.decided_at }] : [];
  });
  return { contracts: (contracts ?? []) as Contract[], payments: (paymentsResult.data ?? []) as ContractPayment[], budgets, extraBranches: (branchesResult.data ?? []) as ExtraBranch[], orders: (ordersResult.data ?? []) as GarageOrderDate[] };
}
