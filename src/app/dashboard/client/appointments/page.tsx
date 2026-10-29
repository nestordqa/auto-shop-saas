import type { Metadata } from "next";

import { AppointmentBooking } from "@/components/client/appointment-booking";
import { EmptyState, OrderRow, PortalHero, SectionHeading } from "@/components/client/client-portal";
import { requireRole } from "@/lib/auth/require-role";
import { loadClientPortal } from "@/lib/client-portal";

export const metadata: Metadata = { title: "Mis citas" };

export default async function ClientAppointmentsPage() {
  const user = await requireRole(["client"]);
  const { orders, vehicles, garages, defaultGarageId } = await loadClientPortal(user.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <PortalHero compact eyebrow="Agenda" title="Mis citas" subtitle="Toca una cita para ver por qué estados ha pasado tu vehículo y cuándo." />

      <section className="py-6">
        <SectionHeading eyebrow="Historial" title="Citas y servicios" count={orders.length} />
        <div className="mt-4 grid gap-3">
          {orders.map((order) => <OrderRow key={order.orderId} order={order} />)}
          {!orders.length && <EmptyState>Aún no tienes citas agendadas.</EmptyState>}
        </div>
      </section>

      <section id="new" className="scroll-mt-20 border-t border-stone-200 py-6">
        <SectionHeading title="Nueva cita" />
        <p className="mt-2 text-stone-600">Elige un horario disponible entre 08:00 y 18:00.</p>
        {vehicles.length ? (
          <AppointmentBooking garages={garages} vehicles={vehicles} defaultGarageId={defaultGarageId} />
        ) : (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">Registra un vehículo para habilitar la agenda.</p>
        )}
      </section>
    </div>
  );
}
