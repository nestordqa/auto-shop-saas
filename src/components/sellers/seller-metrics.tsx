import { formatMoney } from "@/lib/billing";
import { PROSPECT_STATUS_LABELS, PROSPECT_STATUS_STYLES, PROSPECT_STATUSES } from "@/lib/prospects";
import type { SellerStats } from "@/lib/sellers";

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <article className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"><p className="text-sm text-stone-500">{label}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p>{hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}</article>;
}

/** Earnings and garage counts. */
export function SellerEarningsCards({ stats }: { stats: SellerStats }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Talleres traídos" value={stats.garages.length} hint={`${stats.payingGarages} ya pagaron`} />
      <StatCard label="Comisiones acumuladas" value={formatMoney(stats.earned)} />
      <StatCard label="Pagado" value={formatMoney(stats.paidOut)} />
      <StatCard label="Saldo por cobrar" value={formatMoney(stats.balance)} />
    </section>
  );
}

/** Prospect funnel: totals and status percentages only — never the prospects themselves. */
export function ProspectFunnel({ stats }: { stats: SellerStats }) {
  const { total, byStatus, conversion } = stats.prospects;
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-bold">Prospectos</h2><p className="text-sm text-stone-600"><strong>{total}</strong> en total · conversión <strong>{conversion}%</strong> de los cerrados</p></div>
      {total > 0 && <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-stone-100">{PROSPECT_STATUSES.filter((status) => byStatus[status]).map((status) => <span key={status} title={`${PROSPECT_STATUS_LABELS[status]}: ${byStatus[status]}`} className={PROSPECT_STATUS_STYLES[status]} style={{ width: `${byStatus[status] / total * 100}%` }} />)}</div>}
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {PROSPECT_STATUSES.map((status) => <li key={status} className="rounded-md border border-stone-100 p-2"><span className={`rounded-sm px-2 py-0.5 text-xs font-bold ${PROSPECT_STATUS_STYLES[status]}`}>{PROSPECT_STATUS_LABELS[status]}</span><p className="mt-1 font-display text-xl font-bold">{byStatus[status]} <span className="text-xs font-normal text-stone-500">{total ? Math.round(byStatus[status] / total * 100) : 0}%</span></p></li>)}
      </ul>
    </section>
  );
}
