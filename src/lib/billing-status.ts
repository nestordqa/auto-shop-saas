import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import { contractPeriods, daysBetween, LOCK_AFTER_DAYS, todayDate, type Contract, type ContractBillingData, type ContractPeriod } from "@/lib/contracts";
import { loadContractData } from "@/lib/contracts-data";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReportStatus = "reported" | "confirmed" | "rejected";
export type PaymentReport = { id: string; contract_id: string; period_start: string; period_end: string; amount: number | string; method_kind: string; reference: string | null; proof_path: string; status: ReportStatus; note: string | null; created_at: string };
export const REPORT_COLUMNS = "id, contract_id, period_start, period_end, amount, method_kind, reference, proof_path, status, note, created_at";

/** A period the garage still owes, with the owner's latest report on it (if any). */
export type DuePeriod = ContractPeriod & { contract: Contract; daysOverdue: number; report: PaymentReport | null };

export type GarageBillingStatus = {
  /** Contract in force, if any. */
  current: Contract | null;
  /** The free trial ended and no paid contract replaced it: the owner must choose a plan. */
  trialExpired: boolean;
  /** Closed, unpaid periods (oldest first). */
  due: DuePeriod[];
  owed: number;
  /** Days overdue of the oldest period nobody reported a payment for (0 when up to date). */
  daysOverdue: number;
  /** Access suspended for staff: LOCK_AFTER_DAYS or more of arrears without a pending payment report. */
  locked: boolean;
};

/** Billing status of every garage in `data` (one `loadContractData` round), keyed by garage id. */
export function computeBillingStatuses(contracts: Contract[], billing: ContractBillingData, reports: PaymentReport[], today = todayDate()) {
  const byGarage = new Map<string, GarageBillingStatus>();
  const garageIds = [...new Set(contracts.map((contract) => contract.garage_id))];
  for (const garageId of garageIds) {
    const garageContracts = contracts.filter((contract) => contract.garage_id === garageId);
    const current = garageContracts.find((contract) => contract.status === "active") ?? null;
    const due = garageContracts.flatMap((contract) => contractPeriods(contract, billing, today)
      .filter((period) => period.status === "overdue" || period.status === "pending")
      .map((period) => {
        const periodReports = reports.filter((report) => report.contract_id === contract.id && report.period_start === period.start);
        const report = periodReports.find((item) => item.status === "reported") ?? periodReports.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
        return { ...period, contract, daysOverdue: Math.max(0, daysBetween(period.dueDate, today)), report };
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
    // A payment under review does not count against the garage.
    const unreported = due.filter((period) => period.report?.status !== "reported");
    const daysOverdue = unreported.reduce((max, period) => Math.max(max, period.daysOverdue), 0);
    byGarage.set(garageId, {
      current,
      trialExpired: current?.kind === "trial" && Boolean(current.end_date && current.end_date < today),
      due,
      owed: Math.round(due.reduce((total, period) => total + period.amount, 0) * 100) / 100,
      daysOverdue,
      locked: daysOverdue >= LOCK_AFTER_DAYS,
    });
  }
  return byGarage;
}

const EMPTY: GarageBillingStatus = { current: null, trialExpired: false, due: [], owed: 0, daysOverdue: 0, locked: false };

/** Billing status of one garage. Cached per request: layouts, pages and guards share it. */
export const getGarageBillingStatus = cache(async (garageId: string): Promise<GarageBillingStatus> => {
  const admin = createAdminClient();
  if (!admin) return EMPTY;
  try {
    const { contracts, ...billing } = await loadContractData(admin, { garageId });
    const reports = await loadReports(admin, contracts.map((contract) => contract.id));
    return computeBillingStatuses(contracts, billing, reports).get(garageId) ?? EMPTY;
  } catch {
    // Never lock anyone out because billing data failed to load (e.g. before migration 034).
    return EMPTY;
  }
});

export async function loadReports(admin: SupabaseClient, contractIds: string[]) {
  if (!contractIds.length) return [] as PaymentReport[];
  const { data } = await admin.from("contract_payment_reports").select(REPORT_COLUMNS).in("contract_id", contractIds);
  return (data ?? []) as PaymentReport[];
}
