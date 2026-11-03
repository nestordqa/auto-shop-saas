"use client";

import { CarFront, CheckCircle2, Circle, ExternalLink, History, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { OrderStatus } from "@/types/domain";

export type VehicleHistoryOrder = {
  id: string;
  reference: string;
  status: OrderStatus;
  date: string;
  deliveredAt: string | null;
  branch: string | null;
  mechanic: string | null;
  jobs: { description: string; price: string | null; done: boolean }[];
  budget: { total: string; approved: boolean | null; includesParts: boolean } | null;
};

type Vehicle = { plate: string; label: string; color: string; clientName: string; clientPhone: string | null };

const budgetLabel = (approved: boolean | null) => (approved === true ? "Aprobado" : approved === false ? "Rechazado" : "Pendiente");

/** "Ver historial" button and modal with every order of the vehicle in this garage, newest first. */
export function VehicleHistoryButton({ vehicle, history }: { vehicle: Vehicle; history: VehicleHistoryOrder[] }) {
  const [open, setOpen] = useState(false);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-stone-300 px-3 font-bold hover:bg-stone-50"><History size={16} /> Ver historial</button>
    {open && <div className="fixed inset-0 z-50 flex items-end bg-black/55 text-left sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="vehicle-history-title" onClick={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-2xl sm:max-w-2xl sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-stone-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-stone-900 text-white"><CarFront size={20} /></span>
            <div>
              <h2 id="vehicle-history-title" className="text-xl font-bold">{vehicle.label}</h2>
              <p className="text-sm text-stone-600"><span className="font-mono font-bold">{vehicle.plate}</span> · {vehicle.color} · {vehicle.clientName}{vehicle.clientPhone ? ` · ${vehicle.clientPhone}` : ""}</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-md hover:bg-stone-100"><X /></button>
        </div>

        <div className="grid gap-4 p-5">
          <p className="text-sm font-bold text-stone-500">{history.length} {history.length === 1 ? "visita" : "visitas"} al taller</p>
          {history.map((order) => (
            <article key={order.id} className="rounded-lg border border-stone-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{order.date} · Orden {order.reference}</p>
                  <p className="text-xs text-stone-500">{[order.branch, order.mechanic && `Mecánico: ${order.mechanic}`, order.deliveredAt && `Entregado: ${order.deliveredAt}`].filter(Boolean).join(" · ")}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              {order.jobs.length > 0 ? (
                <ul className="mt-3 divide-y divide-stone-100 text-sm">
                  {order.jobs.map((job, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 py-2">
                      <span className="flex items-start gap-2">{job.done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Realizado" /> : <Circle size={16} className="mt-0.5 shrink-0 text-stone-300" aria-label="Pendiente" />}{job.description}</span>
                      {job.price && <span className="shrink-0 font-semibold">{job.price}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-stone-500">Sin diagnóstico registrado.</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 text-sm">
                <span>{order.budget ? <>Presupuesto: <strong>{order.budget.total}</strong> · {budgetLabel(order.budget.approved)}{order.budget.includesParts ? " · incluye repuestos" : ""}</> : <span className="text-stone-500">Sin presupuesto</span>}</span>
                <Link href={`/dashboard/owner/orders/${order.id}`} className="inline-flex items-center gap-1 font-bold text-[#d9341d]">Ver orden <ExternalLink size={14} /></Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>}
  </>;
}
