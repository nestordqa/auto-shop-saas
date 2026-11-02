import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EndContractButton, RegisterPaymentButton } from "@/components/admin/contract-actions";
import { ContractCreateModal } from "@/components/admin/contract-create-modal";
import { ContractShare } from "@/components/admin/contract-share";
import { TrialFollowUp } from "@/components/admin/trial-follow-up";
import { WelcomeShare } from "@/components/admin/welcome-share";
import { requireRole } from "@/lib/auth/require-role";
import { formatMoney, getBillingCommissionPercent } from "@/lib/billing";
import { addDays, contractCode, contractPeriods, contractTitle, CYCLE_LABELS, formatDate, PAYMENT_GRACE_DAYS, todayDate, type PeriodStatus } from "@/lib/contracts";
import { loadContractData } from "@/lib/contracts-data";
import { createAdminClient } from "@/lib/supabase/admin";

const periodLabels: Record<PeriodStatus, [string, string]> = {
  paid: ["Pagado", "bg-emerald-100 text-emerald-800"],
  pending: ["Por cobrar", "bg-amber-100 text-amber-800"],
  overdue: ["Vencido", "bg-red-100 text-red-800"],
  open: ["En curso", "bg-sky-100 text-sky-800"],
};

export default async function ContractDetailPage({ params, searchParams }: { params: Promise<{ contractId: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireRole(["admin"]);
  const [{ contractId }, { created }] = await Promise.all([params, searchParams]);
  const admin = createAdminClient();
  if (!admin) notFound();
  const { contracts, payments, budgets } = await loadContractData(admin, { contractId });
  const contract = contracts[0];
  if (!contract) notFound();

  const today = todayDate();
  const [{ data: garage }, { data: owner }, { data: ownerAuth }, { data: history }] = await Promise.all([
    admin.from("garages").select("name, address, slug").eq("id", contract.garage_id).single(),
    admin.from("profiles").select("full_name, phone, document_id").eq("id", contract.owner_id).single(),
    admin.auth.admin.getUserById(contract.owner_id),
    admin.from("contracts").select("id, number, kind, status, start_date, end_date").eq("garage_id", contract.garage_id).order("start_date", { ascending: false }),
  ]);
  if (!garage || !owner) notFound();
  const periods = contractPeriods(contract, budgets, payments, today).reverse();
  const isTrialEnding = contract.status === "active" && contract.kind === "trial";
  const trialExpired = isTrialEnding && Boolean(contract.end_date && contract.end_date < today);
  const nextStart = contract.end_date && addDays(contract.end_date, 1) > today ? addDays(contract.end_date, 1) : today;

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <Link href="/dashboard/admin/contracts" className="inline-flex items-center gap-1 text-sm font-bold text-stone-600 hover:text-stone-900"><ArrowLeft size={16} /> Contratos</Link>
    <header className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase text-[#d9341d]">{contractCode(contract.number)} · {contract.status === "active" ? "Vigente" : contract.status === "ended" ? "Finalizado" : "Cancelado"}</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{garage.name}</h1><p className="mt-1 text-sm text-stone-600">{contractTitle(contract)} · {owner.full_name}</p></div>
      <div className="flex flex-wrap gap-2">
        {isTrialEnding && <ContractCreateModal garages={[{ id: contract.garage_id, name: garage.name, ownerName: owner.full_name, suggestedKind: "paid", suggestedStart: nextStart }]} preselectedGarageId={contract.garage_id} defaultCommission={getBillingCommissionPercent()} today={today} label="Generar contrato de pago" />}
        {contract.status === "active" && <EndContractButton contractId={contract.id} />}
      </div>
    </header>
    {created && <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Contrato generado. Descarga el PDF y envíale el mensaje al owner.</p>}

    {trialExpired && <section className="mt-6 rounded-lg border border-orange-200 bg-orange-50/50 p-5 shadow-sm">
      <h2 className="font-display text-xl font-bold">La prueba terminó el {formatDate(contract.end_date!)}</h2>
      <p className="mt-1 text-sm text-stone-600">Pregúntale al owner cómo le fue y si quiere continuar. Si sigue, genera su contrato de pago; si no, finaliza este contrato.</p>
      <div className="mt-4 max-w-2xl"><TrialFollowUp contract={contract} garageName={garage.name} owner={{ fullName: owner.full_name, phone: owner.phone }} /></div>
    </section>}
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold">Condiciones</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <Item label="Tipo" value={contract.kind === "trial" ? "Mes de prueba (cortesía)" : "Contrato de pago"} />
          <Item label="Vigencia" value={`${formatDate(contract.start_date)} → ${contract.end_date ? formatDate(contract.end_date) : "indefinida"}`} />
          {contract.kind === "paid" && <><Item label="Plan" value={CYCLE_LABELS[contract.billing_cycle!]} /><Item label="Comisión" value={`${Number(contract.commission_percent)}% sobre presupuestos aceptados`} /><Item label="Vencimiento" value={`${PAYMENT_GRACE_DAYS} días tras cerrar cada período`} /></>}
          <Item label="Owner" value={[owner.full_name, owner.document_id, ownerAuth.user?.email, owner.phone].filter(Boolean).join(" · ")} />
          {contract.notes && <Item label="Notas internas" value={contract.notes} />}
        </dl>
        <a href={`/api/contracts/${contract.id}/pdf`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#d9341d] hover:underline"><ExternalLink size={16} /> Ver PDF</a>
      </section>
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold">Enviar al taller</h2>
        <div className="mt-4"><ContractShare contract={contract} garageName={garage.name} owner={{ fullName: owner.full_name, phone: owner.phone, email: ownerAuth.user?.email ?? null }} /></div>
        {contract.status === "active" && <div className="mt-5 border-t border-stone-200 pt-5"><p className="mb-3 text-sm text-stone-600">Cuando el contrato esté firmado, avísale que todo está listo y cómo instalar la app para recibir notificaciones.</p><WelcomeShare garageName={garage.name} garageSlug={garage.slug} owner={{ fullName: owner.full_name, phone: owner.phone, email: ownerAuth.user?.email ?? null }} /></div>}
      </section>
    </div>

    {contract.kind === "paid" && <section className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <h2 className="p-5 font-display text-xl font-bold">Cobros por período</h2>
      <div className="overflow-x-auto"><table className="w-full min-w-205 text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Período</th><th className="p-4 text-right">Presupuestos aceptados</th><th className="p-4 text-right">Comisión</th><th className="p-4">Vence</th><th className="p-4">Estado</th><th className="p-4"><span className="sr-only">Acciones</span></th></tr></thead><tbody className="divide-y divide-stone-100">{periods.map((period) => {
        const amount = period.payment ? Number(period.payment.amount) : period.amount;
        return <tr key={period.start}>
          <td className="p-4 font-semibold">{formatDate(period.start)} – {formatDate(period.end)}</td>
          <td className="p-4 text-right">{formatMoney(period.payment ? Number(period.payment.base_amount) : period.base)}</td>
          <td className="p-4 text-right font-bold">{formatMoney(amount)}</td>
          <td className="p-4">{formatDate(period.dueDate)}</td>
          <td className="p-4"><span className={`rounded-sm px-2 py-1 text-xs font-bold ${periodLabels[period.status][1]}`}>{periodLabels[period.status][0]}</span>{period.payment && <p className="mt-1 text-xs text-stone-500">{new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(period.payment.paid_at))}{period.payment.reference && ` · ${period.payment.reference}`}</p>}</td>
          <td className="p-4 text-right">{(period.status === "pending" || period.status === "overdue") && <RegisterPaymentButton contractId={contract.id} periodStart={period.start} amountLabel={formatMoney(amount)} />}</td>
        </tr>;
      })}</tbody></table>{!periods.length && <p className="p-8 text-center text-stone-500">El primer período empieza el {formatDate(contract.start_date)}.</p>}</div>
    </section>}

    {(history ?? []).length > 1 && <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-xl font-bold">Historial del taller</h2>
      <ul className="mt-3 divide-y divide-stone-100 text-sm">{(history ?? []).map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-3"><span><strong>{contractCode(item.number)}</strong> · {item.kind === "trial" ? "Prueba" : "Pago"} · {formatDate(item.start_date)}{item.end_date && ` → ${formatDate(item.end_date)}`}</span>{item.id === contract.id ? <span className="text-xs font-bold text-stone-500">Actual</span> : <Link href={`/dashboard/admin/contracts/${item.id}`} className="font-bold text-[#d9341d] hover:underline">Ver</Link>}</li>)}</ul>
    </section>}
  </div>;
}

function Item({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-bold uppercase text-stone-500">{label}</dt><dd className="mt-1">{value}</dd></div>;
}
