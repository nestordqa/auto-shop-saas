import { CalendarDays } from "lucide-react";

import { EmptyState, HeroLink, OrderCard, PortalHero, SectionHeading } from "@/components/client/client-portal";
import { requireRole } from "@/lib/auth/require-role";
import { loadClientPortal } from "@/lib/client-portal";

export default async function ClientHomePage() {
  const user = await requireRole(["client"]);
  const { orders } = await loadClientPortal(user.id);
  const pending = orders.filter(({ status }) => status === "presupuestado");
  const inProgress = orders.filter(({ status }) => status !== "presupuestado" && status !== "entregado");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <PortalHero title={`Hola, ${user.fullName}`} subtitle="Tus vehículos, citas y presupuestos en un solo lugar.">
        <HeroLink href="/dashboard/client/appointments#new" primary><CalendarDays size={19} /> Agendar cita</HeroLink>
        <HeroLink href="/dashboard/client/vehicles">Mis vehículos</HeroLink>
      </PortalHero>

      <section className="py-6">
        <SectionHeading eyebrow="Requieren acción" title="Presupuestos por decidir" count={pending.length} />
        <div className="mt-4 grid gap-5">
          {pending.map((order) => <OrderCard key={order.orderId} order={order} />)}
          {!pending.length && <EmptyState>No tienes presupuestos pendientes por decidir.</EmptyState>}
        </div>
      </section>

      <section className="border-t border-stone-200 py-6">
        <SectionHeading eyebrow="En el taller" title="Servicios en curso" count={inProgress.length} />
        <div className="mt-4 grid gap-5">
          {inProgress.map((order) => <OrderCard key={order.orderId} order={order} />)}
          {!inProgress.length && <EmptyState>No tienes vehículos en servicio ahora mismo.</EmptyState>}
        </div>
      </section>
    </div>
  );
}
