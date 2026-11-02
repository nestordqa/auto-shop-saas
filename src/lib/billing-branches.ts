/** Flat monthly fee (USD) for each active branch beyond the main one. Plans will replace this later. */
export const EXTRA_BRANCH_FEE = 10;

/** `deactivated_at` is null while the branch is active. */
export type ExtraBranch = { garage_id: string; created_at: string; deactivated_at: string | null };

/**
 * Branch fee for one billing period: every extra branch active at some point of [start, end] pays
 * $10 a month; weekly and biweekly periods pay the proportional share (7/30, 15/30).
 */
export function branchFeeForPeriod(extraBranches: ExtraBranch[], garageId: string, start: string, end: string, periodDays: number | "month") {
  const count = extraBranches.filter((branch) => branch.garage_id === garageId && branch.created_at.slice(0, 10) <= end && (!branch.deactivated_at || branch.deactivated_at.slice(0, 10) >= start)).length;
  if (!count) return { count, fee: 0 };
  const fee = periodDays === "month" ? count * EXTRA_BRANCH_FEE : Math.round(count * EXTRA_BRANCH_FEE * periodDays / 30 * 100) / 100;
  return { count, fee };
}
