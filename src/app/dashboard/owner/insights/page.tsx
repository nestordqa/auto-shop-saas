import { Activity, AlertTriangle, Timer, Wrench } from "lucide-react";
import type { Metadata } from "next";

import { requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import { getDurabilityStats } from "@/lib/vehicle-history";
import { COMPONENTS, componentLabel } from "@/lib/vehicle-systems";

export const metadata: Metadata = { title: "Durabilidad de repuestos" };

const number = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });

export default async function OwnerInsightsPage() {
  const { garage, dataClient } = await requireOwnerGarage();
  if (!garage) {
    return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Taller no asignado</h1></div>;
  }

  const { rows, topComponents, totalInterventions } = await getDurabilityStats(dataClient, garage.id);
  const measured = rows.filter((row) => row.measured > 0);
  const earlyFailures = rows.reduce((sum, row) => sum + row.earlyFailures, 0);
  const maxCount = Math.max(1, ...topComponents.map((item) => item.count));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header>
        <p className="text-xs font-bold uppercase text-[#d9341d]">{garage.name}</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Durabilidad de repuestos</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Calculada con los trabajos aprobados de tu taller: el tiempo y los kilómetros entre dos reemplazos del mismo componente en el mismo vehículo, agrupados por marca del repuesto.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={Wrench} label="Intervenciones registradas" value={number.format(totalInterventions)} />
        <Metric icon={Activity} label="Componentes distintos" value={number.format(topComponents.length)} />
        <Metric icon={Timer} label="Duraciones medidas" value={number.format(measured.reduce((sum, row) => sum + row.measured, 0))} />
        <Metric icon={AlertTriangle} label="Fallas antes de 90 días" value={number.format(earlyFailures)} />
      </section>

      {topComponents.length > 0 && (
        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Componentes más intervenidos</h2>
          <ul className="mt-4 grid gap-3">
            {topComponents.map((item) => (
              <li key={item.component} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[14rem_1fr_auto]">
                <span className="truncate font-semibold">{componentLabel(item.component)}<span className="block text-xs font-normal text-stone-500">{COMPONENTS.get(item.component)?.system.label}</span></span>
                <span className="h-3 overflow-hidden rounded-full bg-stone-100">
                  <span className="block h-full rounded-full bg-gradient-to-r from-[#ff765f] to-[#ef3f26]" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                </span>
                <span className="font-display text-lg font-bold">{item.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 p-4">
          <h2 className="font-bold">Duración por componente y marca</h2>
          <p className="text-xs text-stone-500">Una duración se mide cuando el mismo vehículo vuelve a reemplazar el componente. Más mediciones, más confiable.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-500">
              <tr>
                <th className="p-4">Componente</th>
                <th className="p-4">Marca</th>
                <th className="p-4 text-right">Reemplazos</th>
                <th className="p-4 text-right">Mediciones</th>
                <th className="p-4 text-right">Duración promedio</th>
                <th className="p-4 text-right">Km promedio</th>
                <th className="p-4 text-right">Fallas &lt; 90 días</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row) => (
                <tr key={`${row.component}-${row.partBrand ?? ""}`}>
                  <td className="p-4 font-bold">{componentLabel(row.component)}</td>
                  <td className="p-4">{row.partBrand ?? <span className="text-stone-400">Sin marca</span>}</td>
                  <td className="p-4 text-right">{row.replacements}</td>
                  <td className="p-4 text-right">{row.measured}</td>
                  <td className="p-4 text-right font-semibold">{row.avgMonths !== null ? `${row.avgMonths.toFixed(1)} meses` : "—"}</td>
                  <td className="p-4 text-right">{row.avgKm !== null ? `${number.format(row.avgKm)} km` : "—"}</td>
                  <td className={`p-4 text-right font-bold ${row.earlyFailures ? "text-[#d9341d]" : "text-stone-400"}`}>{row.earlyFailures}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="p-8 text-center text-stone-500">
              Aún no hay reemplazos registrados. Cuando los mecánicos asignen el componente a cada hallazgo y el cliente apruebe el presupuesto, verás aquí la durabilidad de cada repuesto.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <article className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs text-stone-500 sm:text-sm">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      </div>
      <Icon className="shrink-0 text-stone-400" size={20} />
    </article>
  );
}
