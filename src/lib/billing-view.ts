import "server-only";

import type { DuePeriodView } from "@/components/owner/platform-payment-panel";
import type { GarageBillingStatus } from "@/lib/billing-status";

/** Plain, serializable view of the periods a garage owes, for the owner's payment panel. */
export function duePeriodViews(status: GarageBillingStatus): DuePeriodView[] {
  return status.due.map((period) => ({
    contractId: period.contract.id,
    start: period.start,
    end: period.end,
    amount: period.amount,
    daysOverdue: period.daysOverdue,
    report: period.report ? { status: period.report.status, amount: Number(period.report.amount), note: period.report.note } : null,
  }));
}
