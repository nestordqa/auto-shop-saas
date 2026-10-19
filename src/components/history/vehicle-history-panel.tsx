import { Activity, CalendarDays, Gauge, HeartPulse, Lightbulb, Wrench } from "lucide-react";

import { formatElapsed, monthsBetween, type VehicleHistory } from "@/lib/vehicle-history";
import { VEHICLE_SYSTEMS, componentLabel, interventionLabel } from "@/lib/vehicle-systems";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

const currency = new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" });
const dateFormat = new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeZone: "America/Caracas" });

/** Months under which an intervention is considered recent enough to rule a component out first. */
const RECENT_MONTHS = 12;

type VehicleHistoryPanelProps = {
  history: VehicleHistory;
  currentMileage?: number | null;
  /** Diagnostic hints are meant for the workshop, not for the client. */
  showHints?: boolean;
  title?: string;
};

function recencyTone(months: number) {
  if (months < 6) return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (months < 18) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-stone-200 bg-stone-50 text-stone-700";
}

export function VehicleHistoryPanel({ history, currentMileage, showHints = true, title = "Historia clínica del vehículo" }: VehicleHistoryPanelProps) {
  const { visits, lastByComponent } = history;
  const systems = VEHICLE_SYSTEMS
    .map((system) => ({
      system,
      touched: system.components.filter((component) => lastByComponent.has(component.key)),
      untouched: system.components.filter((component) => !lastByComponent.has(component.key)),
    }))
    .filter(({ touched }) => touched.length > 0);

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-gradient-to-r from-[#171a1f] to-[#2a2e36] px-4 py-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-[#ef3f26]"><HeartPulse size={20} /></span>
          <div>
            <h2 className="font-bold">{title}</h2>
            <p className="text-xs text-stone-300">
              {visits.length ? `${visits.length} ${visits.length === 1 ? "visita registrada" : "visitas registradas"} · desde ${dateFormat.format(new Date(visits.at(-1)!.date))}` : "Sin visitas anteriores"}
            </p>
          </div>
        </div>
        {currentMileage != null && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-bold"><Gauge size={15} /> {currentMileage.toLocaleString("es-VE")} km hoy</span>}
      </header>

      {!visits.length && (
        <p className="p-5 text-sm text-stone-600">Es la primera visita de este vehículo en TorkeOS. Desde hoy, cada diagnóstico con componente asignado alimenta su historia clínica.</p>
      )}

      {systems.length > 0 && (
        <div className="border-b border-stone-200 p-4 sm:p-6">
          <h3 className="flex items-center gap-2 font-bold"><Activity size={18} className="text-[#ef3f26]" /> Mapa por sistema</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {systems.map(({ system, touched, untouched }) => {
              const recent = touched.filter((component) => monthsBetween(lastByComponent.get(component.key)!.date) < RECENT_MONTHS);
              return (
                <article key={system.key} className="rounded-md border border-stone-200 p-3">
                  <h4 className="text-sm font-bold uppercase text-stone-500">{system.label}</h4>
                  <ul className="mt-2 grid gap-1.5">
                    {touched.map((component) => {
                      const record = lastByComponent.get(component.key)!;
                      const months = monthsBetween(record.date);
                      const kmSince = currentMileage != null && record.mileage != null && currentMileage >= record.mileage ? currentMileage - record.mileage : null;
                      return (
                        <li key={component.key} className={`rounded-md border px-3 py-2 text-sm ${recencyTone(months)}`}>
                          <p className="font-bold">{component.label}</p>
                          <p className="text-xs">
                            {interventionLabel(record.interventionType) ?? "Intervención"} {formatElapsed(months)}
                            {kmSince !== null && ` · hace ${kmSince.toLocaleString("es-VE")} km`}
                            {record.partBrand && ` · ${record.partBrand}`}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  {untouched.length > 0 && (
                    <p className="mt-2 text-xs text-stone-500">Sin registro: {untouched.map((component) => component.label).join(", ")}</p>
                  )}
                  {showHints && recent.length > 0 && untouched.length > 0 && (
                    <p className="mt-3 flex gap-2 rounded-md bg-[#ef3f26]/10 p-2.5 text-xs leading-5 text-stone-800">
                      <Lightbulb size={16} className="mt-0.5 shrink-0 text-[#d9341d]" />
                      <span>
                        <strong>Pista:</strong> {recent.map((component) => component.label).join(", ")} {recent.length === 1 ? "es reciente" : "son recientes"}. Si la falla es de {system.label.toLocaleLowerCase("es")}, empieza revisando {untouched.slice(0, 3).map((component) => component.label.toLocaleLowerCase("es")).join(", ")}.
                      </span>
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {visits.length > 0 && (
        <ol className="relative grid gap-0 p-4 sm:p-6">
          {visits.map((visit, index) => (
            <li key={visit.orderId} className="relative grid grid-cols-[28px_1fr] gap-3 pb-5 last:pb-0">
              {index < visits.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-stone-200" aria-hidden />}
              <span className={`relative z-10 mt-0.5 grid size-7 place-items-center rounded-full ${visit.approved ? "bg-[#ef3f26] text-white" : "bg-stone-200 text-stone-500"}`}><Wrench size={14} /></span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1 font-bold"><CalendarDays size={14} /> {dateFormat.format(new Date(visit.date))}</span>
                  <span className="text-stone-500">{visit.garageName}</span>
                  {visit.mileage != null && <span className="text-stone-500">· {visit.mileage.toLocaleString("es-VE")} km</span>}
                  <OrderStatusBadge status={visit.status} />
                </p>
                {visit.reportedIssue && <p className="mt-1 text-sm text-stone-700">“{visit.reportedIssue}”</p>}
                {visit.items.length > 0 && (
                  <ul className="mt-2 grid gap-1">
                    {visit.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                        <span className="min-w-0">
                          {item.component && <span className="mr-1.5 rounded bg-stone-900 px-1.5 py-0.5 text-[11px] font-bold text-white">{componentLabel(item.component)}{item.interventionType ? ` · ${interventionLabel(item.interventionType)}` : ""}</span>}
                          {item.description}
                          {item.partBrand && <span className="text-stone-500"> · {item.partBrand}</span>}
                        </span>
                        {item.price !== null && <span className="font-semibold">{currency.format(item.price)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {visit.approved === false && <p className="mt-1 text-xs font-bold text-red-700">Presupuesto rechazado: estos trabajos no se realizaron.</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
