import { CalendarDays, CheckCircle2, ChevronDown, ChevronRight, HeartPulse, MapPin, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { IntakeSummary } from "@/components/intake/intake-summary";
import { BudgetDecisionActions } from "@/components/orders/budget-decision-actions";
import { formatAppointmentDateTime } from "@/lib/appointments";
import type { ClientOrder, StatusEvent } from "@/lib/client-portal";
import { ORDER_STATUS_TONES } from "@/lib/order-status";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

const currency = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" });

/** Happy path an order follows; used to show the steps still ahead. */
const FLOW: OrderStatus[] = ["por_ingresar", "ingresado", "diagnosticado", "presupuestado", "en_reparacion", "en_prueba", "listo_para_entregar", "entregado"];

export function PortalHero({ eyebrow = "Portal del cliente", title, subtitle, compact = false, children }: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className={`relative overflow-hidden rounded-lg bg-[#171a1f] text-white shadow-sm ${compact ? "min-h-40" : "min-h-64"}`}>
      <Image src="/vehicle-service.jpg" alt="" fill priority className="object-cover object-center" sizes="(max-width: 768px) 100vw, 80vw" />
      <div className="absolute inset-0 bg-black/60" />
      <div className={`relative flex flex-col justify-end p-6 sm:p-8 ${compact ? "min-h-40" : "min-h-64"}`}>
        <p className="text-xs font-bold uppercase text-[#ff765f]">{eyebrow}</p>
        <h1 className={`mt-2 break-words font-display font-bold ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}`}>{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-200 sm:text-base">{subtitle}</p>
        {children && <div className="mt-5 flex flex-wrap gap-3">{children}</div>}
      </div>
    </header>
  );
}

export function HeroLink({ href, primary = false, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-5 font-bold text-white ${primary ? "bg-[#ef3f26]" : "border border-white/40 bg-black/25 backdrop-blur"}`}>
      {children}
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, count, children }: { eyebrow?: string; title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase text-stone-500">{eyebrow}</p>}
        <h2 className="mt-1 font-display text-2xl font-bold">{title}</h2>
      </div>
      {count !== undefined && <span className="w-fit rounded-md bg-stone-900 px-3 py-2 text-sm font-bold text-white">{count}</span>}
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-stone-200 bg-white p-6 text-stone-600">{children}</p>;
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = ORDER_STATUS_TONES[status];
  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-bold ${tone.badge}`}>
      <span className={`size-2 rounded-full ${tone.dot}`} /> {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

/** Every status the order has gone through with its date and time, then the steps still ahead. */
export function OrderTimeline({ status, history }: { status: OrderStatus; history: StatusEvent[] }) {
  const done: { status: OrderStatus; at?: string }[] = history.length ? history : [{ status }];
  const flowIndex = FLOW.indexOf(status);
  const upcoming = flowIndex >= 0 ? FLOW.slice(flowIndex + 1) : [];

  return (
    <ol className="grid">
      {done.map((event, index) => {
        const current = index === done.length - 1;
        return (
          <li key={`${event.status}-${event.at ?? index}`} className="relative flex gap-3 pb-4 last:pb-0">
            {(index < done.length - 1 || upcoming.length > 0) && <span className="absolute left-[7px] top-4 h-full w-0.5 bg-stone-300" />}
            <span className={`relative mt-1 size-4 shrink-0 rounded-full border-2 border-white ${ORDER_STATUS_TONES[event.status].dot} ${current ? "ring-4 ring-[#ef3f26]/20" : ""}`} />
            <div className="min-w-0">
              <p className={`text-sm ${current ? "font-bold text-stone-950" : "font-semibold text-stone-700"}`}>{ORDER_STATUS_LABELS[event.status]}</p>
              {event.at && <p className="text-xs text-stone-500">{formatAppointmentDateTime(event.at)}</p>}
            </div>
          </li>
        );
      })}
      {upcoming.map((step) => (
        <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
          {step !== upcoming.at(-1) && <span className="absolute left-[7px] top-4 h-full w-0.5 border-l-2 border-dashed border-stone-200" />}
          <span className="relative mt-1 size-4 shrink-0 rounded-full border-2 border-stone-300 bg-white" />
          <p className="text-sm text-stone-400">{ORDER_STATUS_LABELS[step]}</p>
        </li>
      ))}
    </ol>
  );
}

/** Full order card: budget lines on the left, decision + timeline on the right. */
export function OrderCard({ order }: { order: ClientOrder }) {
  const { budget } = order;
  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-stone-200 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[#d9341d]">Orden {order.orderId.slice(0, 8).toUpperCase()}</p>
          <h3 className="mt-1 text-xl font-bold">{order.vehicle}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600"><CalendarDays size={15} className="shrink-0" /> {formatAppointmentDateTime(order.appointmentDate)} · {order.garageName}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {budget ? (
            <>
              <div className="divide-y divide-stone-100">
                {budget.diagnostics.map((item, index) => (
                  <div key={`${item.description}-${index}`} className="flex justify-between gap-5 px-5 py-4">
                    <div>
                      <span className="text-xs font-bold text-stone-400">{String(index + 1).padStart(2, "0")}</span>
                      <p className="mt-1 font-semibold">{item.description}</p>
                    </div>
                    <strong className="shrink-0">{currency.format(item.price)}</strong>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-5 py-4">
                <span className="text-sm text-stone-600">Total {budget.includesParts ? "con repuestos" : "sin repuestos"}</span>
                <strong className="font-display text-2xl">{currency.format(budget.totalAmount)}</strong>
              </div>
              {order.status === "presupuestado" ? (
                <div className="px-5 pb-5"><BudgetDecisionActions orderId={order.orderId} /></div>
              ) : budget.approved !== null && (
                <p className={`mx-5 mb-5 flex items-center gap-2 rounded-md p-3 text-sm font-bold ${budget.approved ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                  {budget.approved ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  {budget.approved ? "Aprobaste este presupuesto" : "Rechazaste este presupuesto"}
                </p>
              )}
            </>
          ) : (
            <p className="p-5 text-sm text-stone-600">El presupuesto aparecerá aquí cuando el taller termine el diagnóstico.</p>
          )}
          {order.garageAddress && <p className="flex gap-2 px-5 pb-5 text-xs text-stone-500"><MapPin size={15} className="shrink-0" /> {order.garageAddress}</p>}
        </div>
        <aside className="border-t border-stone-200 bg-stone-50 p-5 lg:border-l lg:border-t-0">
          <p className="mb-4 text-xs font-bold uppercase text-stone-500">Seguimiento</p>
          <OrderTimeline status={order.status} history={order.history} />
        </aside>
      </div>
      <OrderIntake order={order} />
    </article>
  );
}

/** Compact row that expands to show the order timeline. */
export function OrderRow({ order }: { order: ClientOrder }) {
  return (
    <details className="group rounded-lg border border-stone-200 bg-white">
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[#d9341d]">Orden {order.orderId.slice(0, 8).toUpperCase()}</p>
          <h3 className="mt-1 font-bold">{order.vehicle}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-stone-600"><CalendarDays size={16} className="shrink-0" /> {formatAppointmentDateTime(order.appointmentDate)} · {order.garageName}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <ChevronDown size={18} className="shrink-0 text-stone-400 transition group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-stone-100 bg-stone-50 p-4">
        {order.status === "presupuestado" && order.budget && (
          <div className="mb-5 rounded-lg border border-violet-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-bold">Presupuesto por decidir</p>
              <strong className="font-display text-xl">{currency.format(order.budget.totalAmount)}</strong>
            </div>
            <ul className="mb-4 grid gap-1 text-sm text-stone-600">
              {order.budget.diagnostics.map((item, index) => (
                <li key={`${item.description}-${index}`} className="flex justify-between gap-3"><span>{item.description}</span><span className="shrink-0">{currency.format(item.price)}</span></li>
              ))}
            </ul>
            <BudgetDecisionActions orderId={order.orderId} />
          </div>
        )}
        <OrderTimeline status={order.status} history={order.history} />
        <OrderIntake order={order} />
      </div>
    </details>
  );
}

/** Intake form the garage filled when the vehicle arrived, with its PDF download. */
function OrderIntake({ order }: { order: ClientOrder }) {
  if (!order.intake) return null;
  return (
    <div className="border-t border-stone-200 p-4 sm:p-5 [details_&]:mt-4 [details_&]:border-0 [details_&]:p-0">
      <IntakeSummary intake={order.intake} vehicleLabel={order.vehicle} garageName={order.garageName} orderReference={order.orderId.slice(0, 8).toUpperCase()} />
    </div>
  );
}

export function VehicleLinks({ vehicles }: { vehicles: { id: string; label: string; openOrderLabel?: string | null }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {vehicles.map((vehicle) => (
        <Link key={vehicle.id} href={`/dashboard/client/vehicles/${vehicle.id}`} className="group flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4 font-bold transition hover:border-[#ef3f26]/50 hover:shadow-sm">
          <span className="min-w-0">
            {vehicle.label}
            {vehicle.openOrderLabel && <span className="mt-0.5 block text-xs font-semibold text-stone-500">{vehicle.openOrderLabel}</span>}
            <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-[#d9341d]"><HeartPulse size={14} /> Ver historia del vehículo</span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-stone-400 transition group-hover:translate-x-1" />
        </Link>
      ))}
    </div>
  );
}
