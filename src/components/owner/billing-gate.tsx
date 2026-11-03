import { AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";

import { PlanChooserModal } from "@/components/owner/plan-chooser-modal";
import { PlatformPaymentPanel } from "@/components/owner/platform-payment-panel";
import { EXTRA_BRANCH_FEE } from "@/lib/billing-branches";
import { getGarageBillingStatus } from "@/lib/billing-status";
import { duePeriodViews } from "@/lib/billing-view";
import { LOCK_AFTER_DAYS } from "@/lib/contracts";
import { getPaymentMethods } from "@/lib/payments-data";
import type { PlanKey } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/types/domain";

const money = new Intl.NumberFormat("es", { style: "currency", currency: "USD" });

/**
 * Wraps the garage dashboards with the plan's billing state:
 * - access suspended (LOCK_AFTER_DAYS of arrears): staff see only a notice; the owner can pay right there;
 * - overdue but still within the grace days: a banner inviting the owner to pay;
 * - free trial over without a plan: the owner must choose one (modal).
 */
export async function BillingGate({ garage, role, children }: { garage: { id: string; name: string; plan: string | null } | null; role: AppRole; children: React.ReactNode }) {
  if (!garage) return children;
  const status = await getGarageBillingStatus(garage.id);
  const isOwner = role === "garage_owner";
  const admin = isOwner && (status.locked || status.daysOverdue > 0) ? createAdminClient() : null;
  const methods = admin ? await getPaymentMethods(admin, null, { enabledOnly: true }) : [];

  if (status.locked && status.trialExpired) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-red-700"><Lock size={15} /> Acceso suspendido</p>
          <h1 className="mt-2 font-display text-3xl font-bold">La prueba gratis de {garage.name} terminó</h1>
          <p className="mt-2 text-sm text-stone-600">{isOwner ? `Pasaron más de ${LOCK_AFTER_DAYS} días sin elegir un plan, así que el acceso de tu equipo quedó suspendido. Tus datos están a salvo y tus clientes siguen viendo sus órdenes. Elige tu plan para reactivarlo al instante.` : "El dueño del taller debe elegir un plan para reactivar el acceso."}</p>
        </section>
        {isOwner && <PlanChooserModal garageName={garage.name} suggested={(garage.plan ?? "bujia") as PlanKey} extraBranchFee={EXTRA_BRANCH_FEE} />}
      </div>
    );
  }

  if (status.locked) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-bold uppercase text-red-700"><Lock size={15} /> Acceso suspendido</p>
          <h1 className="mt-2 font-display text-3xl font-bold">{garage.name} tiene pagos vencidos</h1>
          {isOwner
            ? <p className="mt-2 text-sm text-stone-600">Pasaron más de {LOCK_AFTER_DAYS} días sin pagar tu plan, así que el acceso de tu equipo quedó suspendido. Tus datos están a salvo y tus clientes siguen viendo sus órdenes. Reporta tu pago de <strong>{money.format(status.owed)}</strong> y lo reactivamos apenas lo verifiquemos.</p>
            : <p className="mt-2 text-sm text-stone-600">El acceso del taller está suspendido por falta de pago. El dueño del taller debe ponerse al día para reactivarlo.</p>}
          {isOwner && <div className="mt-5"><PlatformPaymentPanel periods={duePeriodViews(status)} methods={methods} lockAfterDays={LOCK_AFTER_DAYS} /></div>}
        </section>
      </div>
    );
  }

  return (
    <>
      {isOwner && status.current?.status === "active" && !status.current.signed_at && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <p className="flex flex-col gap-2 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between">
            <span>Tienes un contrato pendiente de firma{status.current.kind === "trial" ? " (prueba gratis, $0)" : ""}. Revísalo y fírmalo desde tu teléfono.</span>
            <Link href={`/dashboard/owner/contracts/${status.current.id}`} className="shrink-0 rounded-md bg-sky-700 px-4 py-2 text-center font-bold text-white">Firmar contrato</Link>
          </p>
        </div>
      )}
      {isOwner && status.daysOverdue > 0 && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <p className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0" /> Tienes un pago vencido de <strong>{money.format(status.owed)}</strong>. Ponte al día: en {LOCK_AFTER_DAYS - status.daysOverdue} día(s) se suspende el acceso de tu taller.</span>
            <Link href="/dashboard/owner/billing" className="shrink-0 rounded-md bg-amber-600 px-4 py-2 text-center font-bold text-white">Pagar ahora</Link>
          </p>
        </div>
      )}
      {children}
      {isOwner && status.trialExpired && <PlanChooserModal garageName={garage.name} suggested={(garage.plan ?? "bujia") as PlanKey} extraBranchFee={EXTRA_BRANCH_FEE} />}
    </>
  );
}
