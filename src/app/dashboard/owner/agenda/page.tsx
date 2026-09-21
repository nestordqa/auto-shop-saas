import { CalendarDays, RotateCcw } from "lucide-react";
import Link from "next/link";

import { TablePagination } from "@/components/ui/table-pagination";
import { requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import { formatBillingMonth, getBillingMonth, getMonthOptions } from "@/lib/billing";
import { getOwnerOrders } from "@/lib/owner-orders";
import { ORDER_STATUS_LABELS } from "@/types/domain";

const pageSize = 10;

export default async function OwnerAgendaPage({ searchParams }: { searchParams: Promise<{ month?: string; page?: string }> }) {
  const { garage, dataClient, user } = await requireOwnerGarage();
  const { month: requestedMonth, page = "1" } = await searchParams;
  if (!garage) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Taller no asignado</h1><p className="mt-2 text-stone-600">La cuenta {user.email} no está asociada a un taller.</p></div>;
  const month = getBillingMonth(requestedMonth);
  const { rows } = await getOwnerOrders(dataClient, garage.id);
  const appointments = rows.filter((order) => order.appointmentDate.slice(0, 7) === month).sort((first, second) => first.appointmentDate.localeCompare(second.appointmentDate));
  const totalPages = Math.max(1, Math.ceil(appointments.length / pageSize));
  const currentPage = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
  const paginated = appointments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = appointments.filter((order) => order.appointmentDate.slice(0, 10) === today).length;

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8"><header><p className="text-xs font-bold uppercase text-[#d9341d]">{garage.name}</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Agenda</h1><p className="mt-1 text-sm text-stone-600">Citas y recepciones programadas del taller.</p></header><section className="mt-6 grid grid-cols-2 gap-3"><article className="rounded-lg border border-stone-200 bg-white p-4"><p className="text-sm text-stone-500">Citas del mes</p><p className="text-3xl font-bold">{appointments.length}</p></article><article className="rounded-lg border border-stone-200 bg-white p-4"><p className="text-sm text-stone-500">Citas de hoy</p><p className="text-3xl font-bold">{todayCount}</p></article></section><form className="mt-5 flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 sm:flex-row"><select name="month" defaultValue={month} className="min-h-12 flex-1 rounded-md border border-stone-300 bg-white px-4">{getMonthOptions(garage.created_at, month).map((option) => <option key={option} value={option}>{formatBillingMonth(option)}</option>)}</select><button className="rounded-md bg-stone-900 px-5 font-bold text-white">Ver agenda</button>{requestedMonth && <Link href="/dashboard/owner/agenda" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold"><RotateCcw size={18} /> Limpiar</Link>}</form><section className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white"><div className="overflow-x-auto"><table className="min-w-205 w-full text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Fecha</th><th className="p-4">Vehículo</th><th className="p-4">Cliente</th><th className="p-4">Mecánico</th><th className="p-4">Estado</th></tr></thead><tbody className="divide-y divide-stone-100">{paginated.map((order) => <tr key={order.id}><td className="p-4 font-bold"><span className="flex items-center gap-2"><CalendarDays size={17} /> {new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.appointmentDate))}</span></td><td className="p-4"><Link href={`/dashboard/owner/orders/${order.id}`} className="font-bold hover:underline">{order.vehicle}</Link><p className="text-xs text-stone-500">{order.plate}</p></td><td className="p-4">{order.customer}</td><td className="p-4">{order.mechanic}</td><td className="p-4">{ORDER_STATUS_LABELS[order.status]}</td></tr>)}</tbody></table>{!appointments.length && <p className="p-8 text-center text-stone-500">No hay citas para este mes.</p>}</div><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/owner/agenda" searchParams={{ month }} totalItems={appointments.length} /></section></div>;
}