import { AlertTriangle, BadgeCheck, CircleDollarSign, FileSignature, Hourglass, PenLine, RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { ContractCreateModal } from "@/components/admin/contract-create-modal";
import { RequirementsShareModal } from "@/components/admin/requirements-share-modal";
import { TablePagination } from "@/components/ui/table-pagination";
import { PLANS, type PlanKey } from "@/lib/plans";
import { requireRole } from "@/lib/auth/require-role";
import { formatMoney } from "@/lib/billing";
import { addDays, contractCode, contractPeriods, CYCLE_LABELS, formatDate, FOLLOW_UP_LABELS, garageStanding, STANDING_LABELS, STANDING_STYLES, todayDate, type Contract, type GarageStanding } from "@/lib/contracts";
import { loadContractData } from "@/lib/contracts-data";
import { createAdminClient } from "@/lib/supabase/admin";

const pageSize = 10;

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ q?: string; standing?: string; page?: string; signed?: string }> }) {
  await requireRole(["admin"]);
  const { q = "", standing = "all", page = "1", signed = "all" } = await searchParams;
  const admin = createAdminClient();
  if (!admin) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Contratos</h1><p className="mt-2 text-stone-600">Configura SUPABASE_SECRET_KEY para gestionar contratos.</p></div>;

  const today = todayDate();
  const [{ data: garages }, { data: owners }, { contracts, ...billing }] = await Promise.all([
    admin.from("garages").select("id, name, owner_id, plan").order("name"),
    admin.from("profiles").select("id, full_name").eq("role", "garage_owner"),
    loadContractData(admin),
  ]);
  const ownerName = new Map((owners ?? []).map((owner) => [owner.id, owner.full_name as string]));

  const rows = (garages ?? []).map((garage) => {
    const garageContracts = contracts.filter((contract) => contract.garage_id === garage.id);
    const current: Contract | undefined = garageContracts.find((contract) => contract.status === "active") ?? garageContracts[0];
    const periods = garageContracts.flatMap((contract) => contractPeriods(contract, billing, today));
    const unpaid = periods.filter((period) => period.status === "pending" || period.status === "overdue");
    const open = current?.status === "active" ? periods.find((period) => period.status === "open") : undefined;
    return {
      garage,
      owner: ownerName.get(garage.owner_id) ?? "Sin administrador",
      current,
      standing: garageStanding(current, periods, today),
      owed: unpaid.reduce((total, period) => total + period.amount, 0),
      nextDue: unpaid[0]?.dueDate ?? open?.dueDate,
      accrued: open?.amount ?? 0,
      overLimit: open?.extraVehicles ?? 0,
    };
  });

  const count = (target: GarageStanding) => rows.filter((row) => row.standing === target).length;
  const query = q.trim().toLocaleLowerCase("es");
  const filtered = rows.filter((row) => (standing === "all" || row.standing === standing) && (signed === "all" || (signed === "yes") === Boolean(row.current?.signed_at)) && (!query || `${row.garage.name} ${row.owner}`.toLocaleLowerCase("es").includes(query)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const garageOptions = rows.map(({ garage, owner, current }) => {
    const trialEnd = current?.status === "active" && current.kind === "trial" && current.end_date ? addDays(current.end_date, 1) : undefined;
    return { id: garage.id, name: garage.name, ownerName: owner, suggestedKind: current ? "paid" as const : "trial" as const, suggestedStart: trialEnd && trialEnd > today ? trialEnd : today, suggestedPlan: (current?.plan ?? garage.plan ?? "bujia") as PlanKey };
  });

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Contratos</h1><p className="mt-1 text-sm text-stone-600">Pruebas, planes de pago y estado de cobro de cada taller.</p></div><div className="flex flex-wrap gap-2"><Link href="/dashboard/admin/contracts/signatures" className="flex min-h-12 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 font-bold"><PenLine size={18} /> Gestionar firmas</Link><RequirementsShareModal /></div></header>
    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5"><Metric label="Al día" value={String(count("up_to_date"))} icon={BadgeCheck} /><Metric label="Por cobrar" value={String(count("pending"))} icon={CircleDollarSign} /><Metric label="Vencidos" value={String(count("overdue"))} icon={AlertTriangle} /><Metric label="En prueba" value={String(count("trial"))} icon={Hourglass} /><Metric label="Total pendiente" value={formatMoney(rows.reduce((total, row) => total + row.owed, 0))} icon={FileSignature} /></section>
    {count("trial_expired") > 0 && <p className="mt-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-900">{count("trial_expired")} taller(es) terminaron su mes de prueba y necesitan su contrato de pago.</p>}
    <form className="mt-5 grid gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_200px_180px_auto_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={19} /><input name="q" defaultValue={q} placeholder="Taller o administrador" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4" /></div><select name="standing" defaultValue={standing} className="min-h-12 rounded-md border border-stone-300 bg-white px-4"><option value="all">Todos los estados</option>{Object.entries(STANDING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select name="signed" defaultValue={signed} aria-label="Firma" className="min-h-12 rounded-md border border-stone-300 bg-white px-4"><option value="all">Firmados y pendientes</option><option value="yes">Firmados</option><option value="no">Pendientes de firma</option></select><button className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Filtrar</button>{(q || standing !== "all" || signed !== "all") && <Link href="/dashboard/admin/contracts" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold text-stone-700"><RotateCcw size={18} /> Limpiar</Link>}</form>
    <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-230 text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Taller</th><th className="p-4">Contrato</th><th className="p-4">Estado</th><th className="p-4 text-right">Pendiente</th><th className="p-4 text-right">Período en curso</th><th className="p-4">Próximo vencimiento</th><th className="p-4"><span className="sr-only">Acciones</span></th></tr></thead><tbody className="divide-y divide-stone-100">{paginated.map((row) => <tr key={row.garage.id}>
      <td className="p-4"><p className="font-bold">{row.garage.name}</p><p className="text-xs text-stone-500">{row.owner}</p></td>
      <td className="p-4">{row.current ? <><p className="font-semibold">{contractCode(row.current.number)} · {row.current.kind === "trial" ? "Prueba" : (row.current.plan ? PLANS[row.current.plan].name : `${CYCLE_LABELS[row.current.billing_cycle!]} ${Number(row.current.commission_percent)}%`)}</p>{row.overLimit > 0 && <p className="text-xs font-bold text-[#d9341d]">+{row.overLimit} vehículos sobre su plan este período</p>}<p className="text-xs text-stone-500">{row.current.kind === "trial" ? `Hasta ${formatDate(row.current.end_date!)}` : `Desde ${formatDate(row.current.start_date)}`}{row.current.status !== "active" && " · finalizado"}</p><span className={`mt-1 inline-block rounded-sm px-2 py-0.5 text-xs font-bold ${row.current.signed_at ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{row.current.signed_at ? "Firmado" : "Sin firmar"}</span></> : <span className="text-stone-500">—</span>}</td>
      <td className="p-4"><span className={`rounded-sm px-2 py-1 text-xs font-bold ${STANDING_STYLES[row.standing]}`}>{STANDING_LABELS[row.standing]}</span>{row.standing === "trial_expired" && row.current?.follow_up && <p className="mt-1 text-xs font-semibold text-stone-600">{FOLLOW_UP_LABELS[row.current.follow_up]}</p>}</td>
      <td className={`p-4 text-right font-bold ${row.owed ? "text-[#d9341d]" : ""}`}>{formatMoney(row.owed)}</td>
      <td className="p-4 text-right">{formatMoney(row.accrued)}</td>
      <td className="p-4">{row.nextDue ? formatDate(row.nextDue) : "—"}</td>
      <td className="p-4 text-right">{row.current ? <Link href={`/dashboard/admin/contracts/${row.current.id}`} className="inline-flex min-h-10 items-center rounded-md border border-stone-300 px-3 text-sm font-bold">Ver</Link> : <span className="text-xs text-stone-500">Crea su prueba</span>}</td>
    </tr>)}</tbody></table>{!filtered.length && <p className="p-8 text-center text-stone-500">No hay talleres que coincidan con los filtros.</p>}</div><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/admin/contracts" searchParams={{ ...(q && { q }), ...(standing !== "all" && { standing }), ...(signed !== "all" && { signed }) }} totalItems={filtered.length} /></div>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BadgeCheck }) {
  return <article className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"><div className="min-w-0"><p className="text-xs text-stone-500 sm:text-sm">{label}</p><p className="mt-1 truncate font-display text-2xl font-bold sm:text-3xl">{value}</p></div><Icon className="shrink-0 text-stone-400" size={20} /></article>;
}
