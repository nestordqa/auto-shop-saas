import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { appointmentDateKey, formatAppointmentDate, formatTime12 } from "@/lib/appointments";
import { requireMechanic } from "@/lib/auth/require-mechanic";
import type { OrderStatus } from "@/types/domain";

/** Upcoming appointments: the mechanic's own, plus every one of their branch for reception mechanics. */
export default async function MechanicAgendaPage() {
  const { mechanic, dataClient } = await requireMechanic();
  if (!mechanic?.is_active) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Sin acceso al equipo</h1><p className="mt-2 text-stone-600">Tu perfil no está activo en un taller.</p></div>;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const query = dataClient.from("orders").select("id, vehicle_id, mechanic_id, status, appointment_date").eq("garage_id", mechanic.garage_id).eq("status", "por_ingresar").gte("appointment_date", startOfToday.toISOString());
  const { data: orders } = await (mechanic.can_receive ? query.or(`mechanic_id.eq.${mechanic.id},branch_id.eq.${mechanic.branch_id}`) : query.eq("mechanic_id", mechanic.id)).order("appointment_date");
  const vehicleIds = [...new Set((orders ?? []).map((order) => order.vehicle_id))];
  const { data: vehicles } = vehicleIds.length ? await dataClient.from("vehicles").select("id, brand, model, year, plate").in("id", vehicleIds) : { data: [] };
  const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));

  const days = new Map<string, NonNullable<typeof orders>>();
  for (const order of orders ?? []) {
    const key = appointmentDateKey(order.appointment_date);
    days.set(key, [...(days.get(key) ?? []), order]);
  }

  return <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header><p className="text-xs font-bold uppercase text-[#d9341d]">Área técnica</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Agenda</h1><p className="mt-1 text-sm text-stone-600">{mechanic.can_receive ? "Próximas citas de tu sucursal y las asignadas a ti." : "Próximas citas asignadas a ti."}</p></header>
    <div className="mt-6 grid gap-5">
      {[...days.entries()].map(([key, dayOrders]) => <section key={key} className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-3 font-bold capitalize"><CalendarDays size={18} /> {formatAppointmentDate(dayOrders[0].appointment_date, "long")}</h2>
        <ul className="divide-y divide-stone-100">{dayOrders.map((order) => {
          const vehicle = vehicleById.get(order.vehicle_id);
          return <li key={order.id}><Link href={`/dashboard/mechanic/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-stone-50">
            <span className="min-w-0"><span className="block font-bold">{formatTime12(order.appointment_date)} · {vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}` : "Vehículo"}</span><span className="text-xs text-stone-500">{vehicle?.plate ?? "—"} · {order.mechanic_id === mechanic.id ? "Asignada a ti" : order.mechanic_id ? "Asignada a otro mecánico" : "Sin mecánico asignado"}</span></span>
            <OrderStatusBadge status={order.status as OrderStatus} />
          </Link></li>;
        })}</ul>
      </section>)}
      {!days.size && <p className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-500">No hay citas próximas.</p>}
    </div>
  </div>;
}
