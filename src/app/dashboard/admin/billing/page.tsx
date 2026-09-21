import { BadgePercent, CalendarDays, CircleDollarSign, FileCheck2, RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { TablePagination } from "@/components/ui/table-pagination";
import { aggregateBilling, formatBillingMonth, formatMoney, getBillingCommissionPercent, getBillingMonth, getMonthOptions, getMonthRange } from "@/lib/billing";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const pageSize = 10;

export default async function AdminBillingPage({ searchParams }: { searchParams: Promise<{ month?: string; q?: string; page?: string }> }) {
  await requireRole(["admin"]);
  const { month: requestedMonth, q = "", page = "1" } = await searchParams;
  const month = getBillingMonth(requestedMonth);
  const { start, end } = getMonthRange(month);
  const supabase = createAdminClient() ?? await createClient();
  const [{ data: garages, error: garagesError }, { data: orders, error: ordersError }, { data: budgets, error: budgetsError }] = await Promise.all([
    supabase.from("garages").select("id, name, created_at").lt("created_at", end).order("name"),
    supabase.from("orders").select("id, garage_id"),
    supabase.from("budgets").select("order_id, total_amount").eq("approved", true).gte("decided_at", start).lt("decided_at", end),
  ]);

  if (garagesError || ordersError || budgetsError) {
    return <BillingError />;
  }

  const commissionPercent = getBillingCommissionPercent();
  const totals = aggregateBilling(orders ?? [], budgets ?? [], commissionPercent);
  const normalizedQuery = q.trim().toLocaleLowerCase("es");
  const rows = (garages ?? []).filter((garage) => !normalizedQuery || garage.name.toLocaleLowerCase("es").includes(normalizedQuery)).map((garage) => ({
    ...garage,
    ...(totals.get(garage.id) ?? { acceptedBudgets: 0, acceptedTotal: 0, commission: 0 }),
  }));
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const acceptedBudgets = rows.reduce((total, row) => total + row.acceptedBudgets, 0);
  const acceptedTotal = rows.reduce((total, row) => total + row.acceptedTotal, 0);
  const commissionTotal = rows.reduce((total, row) => total + row.commission, 0);
  const oldestCreation = (garages ?? []).reduce<string | undefined>((oldest, garage) => !oldest || garage.created_at < oldest ? garage.created_at : oldest, undefined);
  const monthOptions = getMonthOptions(oldestCreation ?? start, month);

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header><p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Facturación</h1><p className="mt-1 text-sm text-stone-600">Comisión del {commissionPercent}% sobre presupuestos aceptados por período.</p></header>
    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Talleres del período" value={String(rows.length)} icon={CalendarDays} /><Metric label="Presupuestos aceptados" value={String(acceptedBudgets)} icon={FileCheck2} /><Metric label="Base aceptada" value={formatMoney(acceptedTotal)} icon={CircleDollarSign} /><Metric label={`Comisión ${commissionPercent}%`} value={formatMoney(commissionTotal)} icon={BadgePercent} /></section>
    <form className="mt-5 grid gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[220px_minmax(0,1fr)_auto_auto]"><select name="month" defaultValue={month} className="min-h-12 rounded-md border border-stone-300 bg-white px-4">{monthOptions.map((option) => <option key={option} value={option}>{formatBillingMonth(option)}</option>)}</select><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={19} /><input name="q" defaultValue={q} placeholder="Buscar taller" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4" /></div><button className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Filtrar</button>{(q || requestedMonth) && <Link href="/dashboard/admin/billing" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold text-stone-700"><RotateCcw size={18} /> Limpiar</Link>}</form>
    <section className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-205 w-full text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Taller</th><th className="p-4">Ciclo</th><th className="p-4 text-center">Aceptados</th><th className="p-4 text-right">Base</th><th className="p-4 text-right">Comisión</th></tr></thead><tbody className="divide-y divide-stone-100">{paginatedRows.map((row) => <tr key={row.id}><td className="p-4"><p className="font-bold">{row.name}</p><p className="text-xs text-stone-500">Alta {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(row.created_at))}</p></td><td className="p-4 capitalize">{formatBillingMonth(month)}</td><td className="p-4 text-center font-bold">{row.acceptedBudgets}</td><td className="p-4 text-right font-semibold">{formatMoney(row.acceptedTotal)}</td><td className="p-4 text-right font-bold text-[#d9341d]">{formatMoney(row.commission)}</td></tr>)}</tbody></table>{!rows.length && <p className="p-8 text-center text-stone-500">No hay talleres para este período y búsqueda.</p>}</div><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/admin/billing" searchParams={{ month, ...(q && { q }) }} totalItems={rows.length} /></section>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CalendarDays }) {
  return <article className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"><div className="min-w-0"><p className="text-xs text-stone-500 sm:text-sm">{label}</p><p className="mt-1 truncate font-display text-2xl font-bold sm:text-3xl">{value}</p></div><Icon className="shrink-0 text-stone-400" size={20} /></article>;
}

function BillingError() {
  return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">No se pudo calcular la facturación</h1><p className="mt-2 text-stone-600">Revisa la conexión con Supabase e inténtalo nuevamente.</p></div>;
}