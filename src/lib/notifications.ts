import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";

import { formatAppointmentDateTime } from "@/lib/appointments";
import { sendPush, type PushPayload } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole, OrderStatus } from "@/types/domain";

/**
 * Who receives what (never the person who triggered the event):
 * - Mechanic: only when an order is assigned to them, while active in that garage.
 * - Owner + active managers of the order's garage: new appointment, check-in, client budget decision,
 *   and mechanic progress (diagnosis finished, testing, ready).
 * - Client: only for orders of their own vehicles.
 */
export type Actor = { id: string; role: AppRole };

type OrderContext = {
  id: string;
  reference: string;
  garageId: string;
  garageName: string;
  vehicleLabel: string;
  clientId: string;
  mechanicId: string | null;
  appointmentDate: string;
};

type Message = { userIds: string[]; payload: PushPayload };

export async function loadOrderContext(admin: SupabaseClient, orderId: string): Promise<OrderContext | null> {
  const { data: order } = await admin.from("orders").select("id, garage_id, vehicle_id, mechanic_id, appointment_date").eq("id", orderId).maybeSingle();
  if (!order) return null;
  const [{ data: vehicle }, { data: garage }] = await Promise.all([
    admin.from("vehicles").select("brand, model, year, plate, user_id").eq("id", order.vehicle_id).maybeSingle(),
    admin.from("garages").select("name").eq("id", order.garage_id).maybeSingle(),
  ]);
  if (!vehicle) return null;
  return {
    id: order.id,
    reference: order.id.slice(0, 8).toUpperCase(),
    garageId: order.garage_id,
    garageName: garage?.name ?? "el taller",
    vehicleLabel: `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}`,
    clientId: vehicle.user_id,
    mechanicId: order.mechanic_id,
    appointmentDate: order.appointment_date,
  };
}

/** Owner plus the garage's active managers. */
async function garageStaffIds(admin: SupabaseClient, garageId: string) {
  const [{ data: garage }, { data: managers }] = await Promise.all([
    admin.from("garages").select("owner_id").eq("id", garageId).maybeSingle(),
    admin.from("garage_managers").select("profile_id").eq("garage_id", garageId).eq("is_active", true),
  ]);
  return [garage?.owner_id, ...(managers ?? []).map((manager) => manager.profile_id)].filter((id): id is string => Boolean(id));
}

async function profileName(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return (data?.full_name as string | undefined) ?? "El mecánico";
}

const staffUrl = (order: OrderContext) => `/dashboard/owner/orders/${order.id}`;
const CLIENT_URL = "/dashboard/client";

async function deliver(admin: SupabaseClient, messages: Message[], actor?: Actor) {
  await Promise.all(messages.map(({ userIds, payload }) =>
    sendPush(admin, userIds.filter((id) => id !== actor?.id), payload),
  ));
}

/** Runs after the response is sent; a notification failure never breaks the user's action. */
function schedule(task: (admin: SupabaseClient) => Promise<void>) {
  after(async () => {
    const admin = createAdminClient();
    if (!admin) return;
    try {
      await task(admin);
    } catch (error) {
      console.error("[notifications]", error);
    }
  });
}

export function notifyAppointmentCreated(orderId: string, actor: Actor) {
  schedule(async (admin) => {
    const order = await loadOrderContext(admin, orderId);
    if (!order) return;
    await deliver(admin, [{
      userIds: await garageStaffIds(admin, order.garageId),
      payload: { title: "Nueva cita agendada", body: `${order.vehicleLabel} · ${formatAppointmentDateTime(order.appointmentDate, "long")}`, url: staffUrl(order), tag: `appointment-${order.id}` },
    }], actor);
  });
}

export function notifyMechanicAssigned(orderId: string, mechanicId: string, actor: Actor) {
  schedule(async (admin) => {
    const [order, { data: mechanic }] = await Promise.all([
      loadOrderContext(admin, orderId),
      admin.from("mechanics").select("profile_id, garage_id").eq("id", mechanicId).eq("is_active", true).maybeSingle(),
    ]);
    // The mechanic must still be assigned, active and in the order's garage when this runs.
    if (!order || !mechanic || order.mechanicId !== mechanicId || mechanic.garage_id !== order.garageId) return;
    await deliver(admin, [{
      userIds: [mechanic.profile_id],
      payload: { title: "Se te asignó un vehículo", body: `Orden ${order.reference} · ${order.vehicleLabel} · ${formatAppointmentDateTime(order.appointmentDate)}`, url: `/dashboard/mechanic/orders/${order.id}`, tag: `assigned-${order.id}` },
    }], actor);
  });
}

export function notifyBudgetDecision(orderId: string, approved: boolean, actor: Actor) {
  schedule(async (admin) => {
    const order = await loadOrderContext(admin, orderId);
    if (!order) return;
    const messages: Message[] = [];
    if (actor.role === "client") {
      messages.push({
        userIds: await garageStaffIds(admin, order.garageId),
        payload: { title: approved ? "Presupuesto aceptado" : "Presupuesto rechazado", body: `El cliente ${approved ? "aceptó" : "rechazó"} el presupuesto de la orden ${order.reference} · ${order.vehicleLabel}`, url: staffUrl(order), tag: `decision-${order.id}` },
      });
    } else if (approved) {
      messages.push(clientStatusMessage(order, "en_reparacion")!);
    }
    await deliver(admin, messages, actor);
  });
}

function clientStatusMessage(order: OrderContext, status: OrderStatus): Message | null {
  const copy: Partial<Record<OrderStatus, Omit<PushPayload, "url" | "tag">>> = {
    ingresado: { title: "Tu vehículo ingresó al taller", body: `${order.vehicleLabel} fue recibido en ${order.garageName}.` },
    diagnosticado: { title: "Diagnóstico terminado", body: `Ya revisamos tu ${order.vehicleLabel}. Pronto recibirás el presupuesto.` },
    presupuestado: { title: "Tu presupuesto está listo", body: `Revisa y decide el presupuesto de tu ${order.vehicleLabel} en la app.` },
    en_reparacion: { title: "Tu vehículo está en reparación", body: `${order.garageName} está trabajando en tu ${order.vehicleLabel}.` },
    en_prueba: { title: "Tu vehículo está en pruebas", body: `Estamos probando tu ${order.vehicleLabel} para confirmar la reparación.` },
    listo_para_entregar: { title: "Tu vehículo está listo", body: `Ya puedes retirar tu ${order.vehicleLabel} en ${order.garageName}.` },
  };
  const message = copy[status];
  return message ? { userIds: [order.clientId], payload: { ...message, url: CLIENT_URL, tag: `status-${order.id}` } } : null;
}

/** Call after a successful status change, with the status the order had before it. */
export function notifyStatusChange(orderId: string, from: OrderStatus, to: OrderStatus, actor: Actor) {
  if (from === to) return;
  schedule(async (admin) => {
    const order = await loadOrderContext(admin, orderId);
    if (!order) return;
    const messages: Message[] = [];

    // Client: only forward progress, not reopenings (e.g. diagnosticado → ingresado).
    const clientEvent =
      (from === "por_ingresar" && to === "ingresado") ||
      (from === "ingresado" && to === "diagnosticado") ||
      to === "presupuestado" || to === "en_reparacion" || to === "en_prueba" || to === "listo_para_entregar";
    const clientMessage = clientEvent ? clientStatusMessage(order, to) : null;
    if (clientMessage) messages.push(clientMessage);

    const staff = () => garageStaffIds(admin, order.garageId);
    if (from === "por_ingresar" && to === "ingresado") {
      messages.push({ userIds: await staff(), payload: { title: "Vehículo ingresado", body: `Orden ${order.reference} · ${order.vehicleLabel}`, url: staffUrl(order), tag: `status-${order.id}` } });
    } else if (actor.role === "mechanic" && (to === "diagnosticado" || to === "en_prueba" || to === "listo_para_entregar")) {
      const name = await profileName(admin, actor.id);
      const title = to === "diagnosticado" ? "Diagnóstico finalizado" : to === "en_prueba" ? "Vehículo en prueba" : "Vehículo listo para entregar";
      const body = to === "diagnosticado"
        ? `${name} finalizó el diagnóstico de la orden ${order.reference} · ${order.vehicleLabel}`
        : `${name} pasó la orden ${order.reference} · ${order.vehicleLabel} a «${to === "en_prueba" ? "En prueba" : "Listo para entregar"}»`;
      messages.push({ userIds: await staff(), payload: { title, body, url: staffUrl(order), tag: `status-${order.id}` } });
    }

    await deliver(admin, messages, actor);
  });
}

/** Scheduled reminders. Each one is claimed in notification_log first, so it goes out once per order, kind and day. */
export async function sendScheduledReminders(admin: SupabaseClient, now = new Date()) {
  const caracas = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => caracas.find((item) => item.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const sent = { appointment: 0, budget: 0, pickup: 0 };

  async function claim(orderId: string, kind: string, sentOn: string) {
    const { data } = await admin.from("notification_log").upsert({ order_id: orderId, kind, sent_on: sentOn }, { onConflict: "order_id,kind,sent_on", ignoreDuplicates: true }).select("id");
    return Boolean(data?.length);
  }

  // 1 hour before the appointment (the job runs every 15 minutes, so it arrives 45–60 min before).
  const { data: upcoming } = await admin.from("orders").select("id")
    .eq("status", "por_ingresar")
    .gt("appointment_date", now.toISOString())
    .lte("appointment_date", new Date(now.getTime() + 60 * 60_000).toISOString());
  for (const { id } of upcoming ?? []) {
    if (!(await claim(id, "appointment_reminder", today))) continue;
    const order = await loadOrderContext(admin, id);
    if (!order) continue;
    await sendPush(admin, [order.clientId], { title: "Tu cita es en 1 hora", body: `${order.vehicleLabel} · ${formatAppointmentDateTime(order.appointmentDate)} en ${order.garageName}.`, url: CLIENT_URL, tag: `reminder-${order.id}` });
    sent.appointment += 1;
  }

  // Daily at 10:00 (Caracas) while the client has not decided the budget or picked up the vehicle.
  if (Number(part("hour")) === 10) {
    const daily: { status: OrderStatus; kind: "budget_pending" | "pickup_pending"; title: string; body: (order: OrderContext) => string }[] = [
      { status: "presupuestado", kind: "budget_pending", title: "Tienes un presupuesto por decidir", body: (order) => `El presupuesto de tu ${order.vehicleLabel} sigue esperando tu decisión.` },
      { status: "listo_para_entregar", kind: "pickup_pending", title: "Tu vehículo te espera", body: (order) => `Tu ${order.vehicleLabel} está listo para retirar en ${order.garageName}.` },
    ];
    for (const reminder of daily) {
      const { data: orders } = await admin.from("orders").select("id").eq("status", reminder.status);
      for (const { id } of orders ?? []) {
        if (!(await claim(id, reminder.kind, today))) continue;
        const order = await loadOrderContext(admin, id);
        if (!order) continue;
        await sendPush(admin, [order.clientId], { title: reminder.title, body: reminder.body(order), url: CLIENT_URL, tag: `reminder-${order.id}` });
        sent[reminder.kind === "budget_pending" ? "budget" : "pickup"] += 1;
      }
    }
  }
  return sent;
}
