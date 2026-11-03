import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";

import { formatMoney } from "@/lib/billing";
import { computeBillingStatuses, loadReports } from "@/lib/billing-status";
import { addDays, LOCK_AFTER_DAYS, todayDate } from "@/lib/contracts";
import { loadContractData } from "@/lib/contracts-data";
import { sendPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

const OWNER_BILLING_URL = "/dashboard/owner/billing";

async function adminIds(admin: SupabaseClient) {
  const { data } = await admin.from("profiles").select("id").eq("role", "admin");
  return (data ?? []).map((profile) => profile.id as string);
}

async function garageOwner(admin: SupabaseClient, garageId: string) {
  const { data } = await admin.from("garages").select("name, owner_id").eq("id", garageId).maybeSingle();
  return data as { name: string; owner_id: string } | null;
}

/** Runs after the response; a failed push never breaks the action. */
function schedule(task: (admin: SupabaseClient) => Promise<void>) {
  after(async () => {
    const admin = createAdminClient();
    if (!admin) return;
    try {
      await task(admin);
    } catch (error) {
      console.error("Billing notification failed", error);
    }
  });
}

/** Owner reported the payment of a period: every admin hears about it. */
export function notifyPlatformPaymentReported(garageId: string, contractId: string, amount: number) {
  schedule(async (admin) => {
    const garage = await garageOwner(admin, garageId);
    await sendPush(admin, await adminIds(admin), { title: "Pago de plan recibido", body: `${garage?.name ?? "Un taller"} reportó un pago de ${formatMoney(amount)}. Revisa el comprobante.`, url: `/dashboard/admin/contracts/${contractId}`, tag: `platform-payment-${contractId}` });
  });
}

/** Admin checked or rejected the owner's payment report. */
export function notifyPlatformPaymentResolved(garageId: string, confirmed: boolean, note: string | null) {
  schedule(async (admin) => {
    const garage = await garageOwner(admin, garageId);
    if (!garage) return;
    await sendPush(admin, [garage.owner_id], confirmed
      ? { title: "Pago confirmado", body: "TorkeOS verificó tu pago. ¡Gracias por estar al día!", url: OWNER_BILLING_URL, tag: `platform-payment-${garageId}` }
      : { title: "No pudimos verificar tu pago", body: `Revisa los datos y vuelve a reportarlo${note ? `: ${note}` : "."}`, url: OWNER_BILLING_URL, tag: `platform-payment-${garageId}` });
  });
}

/** Owner picked a plan after the trial: admins are told. */
export function notifyPlanChosen(garageId: string, contractId: string, planName: string) {
  schedule(async (admin) => {
    const garage = await garageOwner(admin, garageId);
    await sendPush(admin, await adminIds(admin), { title: "Nuevo plan elegido", body: `${garage?.name ?? "Un taller"} eligió el plan ${planName} tras su prueba.`, url: `/dashboard/admin/contracts/${contractId}`, tag: `plan-${contractId}` });
  });
}

/**
 * Daily billing notices to owners (the cron runs every 15 minutes; each notice is claimed once per day):
 * - trial ended without a paid contract: a single notice;
 * - a period overdue: every day during the LOCK_AFTER_DAYS of grace, inviting to pay;
 * - access suspended: once, the day it happens.
 */
export async function sendBillingReminders(admin: SupabaseClient, today = todayDate()) {
  const sent = { trial: 0, overdue: 0, suspended: 0 };
  const { contracts, ...billing } = await loadContractData(admin);
  const statuses = computeBillingStatuses(contracts, billing, await loadReports(admin, contracts.map((contract) => contract.id)), today);

  async function claim(garageId: string, kind: string, sentOn: string) {
    const { data } = await admin.from("billing_notification_log").upsert({ garage_id: garageId, kind, sent_on: sentOn }, { onConflict: "garage_id,kind,sent_on", ignoreDuplicates: true }).select("id");
    return Boolean(data?.length);
  }

  for (const [garageId, status] of statuses) {
    const owner = status.trialExpired || status.daysOverdue > 0 ? await garageOwner(admin, garageId) : null;
    if (!owner) continue;
    if (status.trialExpired && status.current?.end_date && await claim(garageId, "trial_ended", addDays(status.current.end_date, 1))) {
      await sendPush(admin, [owner.owner_id], { title: "Tu mes de prueba terminó", body: `El plan gratuito de ${owner.name} ya no está disponible. Entra y elige el plan que mejor se ajuste a tu taller.`, url: "/dashboard/owner", tag: `trial-${garageId}` });
      sent.trial += 1;
    }
    if (status.locked) {
      // The suspension notice is keyed to the day it started, so it goes out only once.
      const lockedSince = addDays(today, LOCK_AFTER_DAYS - status.daysOverdue);
      if (await claim(garageId, "access_suspended", lockedSince)) {
        await sendPush(admin, [owner.owner_id], { title: "Acceso suspendido por falta de pago", body: `Tienes ${formatMoney(status.owed)} pendientes. Entra a TorkeOS y reporta tu pago para reactivar el acceso de tu equipo.`, url: OWNER_BILLING_URL, tag: `billing-${garageId}` });
        sent.suspended += 1;
      }
    } else if (status.daysOverdue > 0 && await claim(garageId, "payment_overdue", today)) {
      const left = LOCK_AFTER_DAYS - status.daysOverdue;
      await sendPush(admin, [owner.owner_id], { title: "Tienes un pago vencido", body: `Debes ${formatMoney(status.owed)} de tu plan TorkeOS. Ponte al día: ${left === 1 ? "mañana" : `en ${left} días`} se suspende el acceso de tu taller.`, url: OWNER_BILLING_URL, tag: `billing-${garageId}` });
      sent.overdue += 1;
    }
  }
  return sent;
}

/** Owner signed a contract in the app: admins are told. */
export function notifyContractSigned(garageId: string, contractId: string, code: string) {
  schedule(async (admin) => {
    const garage = await garageOwner(admin, garageId);
    await sendPush(admin, await adminIds(admin), { title: "Contrato firmado", body: `${garage?.name ?? "Un taller"} firmó el contrato ${code}.`, url: `/dashboard/admin/contracts/${contractId}`, tag: `contract-signed-${contractId}` });
  });
}
