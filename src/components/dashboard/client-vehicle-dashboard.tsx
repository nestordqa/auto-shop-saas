import { CalendarDays, CheckCircle2, Clock3, MapPin, XCircle } from "lucide-react";
import Image from "next/image";

import { AppointmentBooking } from "@/components/client/appointment-booking";
import { ClientVehicleCreate } from "@/components/client/client-vehicle-create";
import { BudgetDecisionActions } from "@/components/orders/budget-decision-actions";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

type ClientBudget = {
  orderId: string;
  status: OrderStatus;
  appointmentDate: string;
  vehicle: string;
  garageName: string;
  garageAddress: string;
  includesParts: boolean;
  totalAmount: number;
  approved: boolean | null;
  diagnostics: { description: string; price: number }[];
};

const currency = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" });

export function ClientVehicleDashboard({ customerName, budgets, garages, vehicles, brands, models, defaultGarageId }: { customerName: string; budgets: ClientBudget[]; garages: { id: string; label: string }[]; vehicles: { id: string; label: string }[]; brands: { id: string; name: string }[]; models: { id: string; brandId: string; name: string }[]; defaultGarageId?: string }) {
  const pending = budgets.filter(({ status }) => status === "presupuestado");
  const decided = budgets.filter(({ status }) => status !== "presupuestado");

  return <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="relative min-h-64 overflow-hidden rounded-lg bg-[#171a1f] text-white shadow-sm"><Image src="/vehicle-service.jpg" alt="Vehículo en servicio" fill priority className="object-cover object-center" sizes="(max-width: 768px) 100vw, 80vw" /><div className="absolute inset-0 bg-black/60" /><div className="relative flex min-h-64 flex-col justify-end p-6 sm:p-8"><p className="text-xs font-bold uppercase text-[#ff765f]">Portal del cliente</p><h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Hola, {customerName}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-stone-200 sm:text-base">Tus vehículos, citas y presupuestos en un solo lugar.</p><div className="mt-5 flex flex-wrap gap-3"><a href="#appointments" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><CalendarDays size={19} /> Agendar cita</a><a href="#vehicles" className="flex min-h-12 items-center justify-center rounded-md border border-white/40 bg-black/25 px-5 font-bold text-white backdrop-blur">Mis vehículos</a></div></div></header>

    <section className="py-6"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase text-stone-500">Requieren acción</p><h2 className="mt-1 font-display text-2xl font-bold">Presupuestos activos</h2></div><span className="rounded-md bg-stone-900 px-3 py-2 text-sm font-bold text-white">{pending.length}</span></div><div className="mt-4 grid gap-5">{pending.map((budget) => <BudgetPanel key={budget.orderId} budget={budget} />)}{!pending.length && <p className="rounded-lg border border-stone-200 bg-white p-6 text-stone-600">No tienes presupuestos pendientes por decidir.</p>}</div></section>

    <section className="border-t border-stone-200 py-6"><p className="text-xs font-bold uppercase text-stone-500">Historial</p><h2 className="mt-1 font-display text-2xl font-bold">Presupuestos decididos</h2><div className="mt-4 grid gap-4">{decided.map((budget) => <BudgetPanel key={budget.orderId} budget={budget} />)}{!decided.length && <p className="text-stone-600">Aún no hay decisiones registradas.</p>}</div></section>

    <section id="vehicles" className="border-t border-stone-200 py-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase text-stone-500">Garaje personal</p><h2 className="mt-1 font-display text-2xl font-bold">Mis vehículos</h2></div><ClientVehicleCreate brands={brands} models={models} /></div>{vehicles.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{vehicles.map((vehicle) => <div key={vehicle.id} className="rounded-lg border border-stone-200 bg-white p-4 font-bold">{vehicle.label}</div>)}</div>}</section>
    <section id="appointments" className="border-t border-stone-200 py-6"><h2 className="font-display text-2xl font-bold">Nueva cita</h2><p className="mt-2 text-stone-600">Elige un horario disponible entre 08:00 y 18:00.</p>{vehicles.length ? <AppointmentBooking garages={garages} vehicles={vehicles} defaultGarageId={defaultGarageId} /> : <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">Registra un vehículo para habilitar la agenda.</p>}</section>
  </div>;
}

function BudgetPanel({ budget }: { budget: ClientBudget }) {
  return <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"><header className="flex flex-col gap-3 border-b border-stone-200 p-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#d9341d]">Orden {budget.orderId.slice(0, 8).toUpperCase()}</p><h3 className="mt-1 text-xl font-bold">{budget.vehicle}</h3><p className="mt-1 text-sm text-stone-600">{budget.garageName}</p></div><div className="sm:text-right"><p className="font-display text-2xl font-bold">{currency.format(budget.totalAmount)}</p><p className="text-xs font-semibold text-stone-500">{ORDER_STATUS_LABELS[budget.status]}</p></div></header><div className="grid lg:grid-cols-[minmax(0,1fr)_280px]"><div className="divide-y divide-stone-100">{budget.diagnostics.map((item, index) => <div key={`${item.description}-${index}`} className="flex justify-between gap-5 px-5 py-4"><div><span className="text-xs font-bold text-stone-400">{String(index + 1).padStart(2, "0")}</span><p className="mt-1 font-semibold">{item.description}</p></div><strong className="shrink-0">{currency.format(item.price)}</strong></div>)}</div><aside className="border-t border-stone-200 bg-stone-50 p-5 lg:border-l lg:border-t-0"><dl className="grid gap-3 text-sm"><div className="flex justify-between gap-3"><dt>Incluye repuestos</dt><dd className="font-bold">{budget.includesParts ? "Sí" : "No"}</dd></div><div className="flex justify-between gap-3"><dt>Cita</dt><dd className="font-bold">{new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(new Date(budget.appointmentDate))}</dd></div></dl>{budget.garageAddress && <p className="mt-4 flex gap-2 text-xs text-stone-500"><MapPin size={15} className="shrink-0" />{budget.garageAddress}</p>}{budget.status === "presupuestado" ? <div className="mt-5"><BudgetDecisionActions orderId={budget.orderId} /></div> : <p className={`mt-5 flex items-center gap-2 rounded-md p-3 text-sm font-bold ${budget.approved ? "bg-emerald-100 text-emerald-800" : budget.approved === false ? "bg-red-100 text-red-800" : "bg-stone-200 text-stone-700"}`}>{budget.approved ? <CheckCircle2 size={18} /> : budget.approved === false ? <XCircle size={18} /> : <Clock3 size={18} />}{budget.approved ? "Presupuesto aceptado · En reparación" : budget.approved === false ? "Presupuesto rechazado" : ORDER_STATUS_LABELS[budget.status]}</p>}</aside></div></article>;
}
