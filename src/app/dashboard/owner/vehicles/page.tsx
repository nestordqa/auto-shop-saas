import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { BranchTabs } from "@/components/owner/branch-tabs";
import { VehicleHistoryButton, type VehicleHistoryOrder } from "@/components/owner/vehicle-history-modal";
import { TablePagination } from "@/components/ui/table-pagination";
import { branchScope, requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import { formatMoney } from "@/lib/billing";
import type { OrderStatus } from "@/types/domain";

const pageSize = 15;
const PATH = "/dashboard/owner/vehicles";
const dateFormat = new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeZone: "America/Caracas" });

type Filters = { q?: string; brand?: string; model?: string; year?: string; page?: string; branch?: string };

/** Every vehicle that has had an order in this garage (managers: their branch), with its full repair history. */
export default async function OwnerVehiclesPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { garage, dataClient, user, branches, staffBranchId } = await requireOwnerGarage();
  const { q = "", brand = "", model = "", year = "", page = "1", branch } = await searchParams;
  if (!garage) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Taller no asignado</h1><p className="mt-2 text-stone-600">La cuenta {user.email ?? "actual"} no está configurada en un taller.</p></div>;
  const { multiBranch, branchId, branchById } = branchScope(branches, staffBranchId, branch);

  let query = dataClient.from("orders").select("id, vehicle_id, branch_id, status, appointment_date, received_at, delivered_at, created_at, mechanic_id").eq("garage_id", garage.id).order("appointment_date", { ascending: false });
  if (branchId) query = query.eq("branch_id", branchId);
  const { data: orders } = await query;
  const orderRows = orders ?? [];
  const orderIds = orderRows.map((order) => order.id);
  const vehicleIds = [...new Set(orderRows.map((order) => order.vehicle_id))];
  const mechanicIds = [...new Set(orderRows.map((order) => order.mechanic_id).filter((id): id is string => Boolean(id)))];

  // `in` lists are chunked so a garage with a long history does not overflow the request URL.
  const chunk = <T,>(items: T[]) => Array.from({ length: Math.ceil(items.length / 150) }, (_, index) => items.slice(index * 150, (index + 1) * 150));
  const [vehicleResults, diagnosticResults, budgetResults, mechanicResults] = await Promise.all([
    Promise.all(chunk(vehicleIds).map((ids) => dataClient.from("vehicles").select("id, user_id, brand, model, year, color, plate").in("id", ids))),
    Promise.all(chunk(orderIds).map((ids) => dataClient.from("diagnostics").select("order_id, description, price, is_completed, created_at").in("order_id", ids).order("created_at"))),
    Promise.all(chunk(orderIds).map((ids) => dataClient.from("budgets").select("order_id, total_amount, approved, includes_parts").in("order_id", ids))),
    Promise.all(chunk(mechanicIds).map((ids) => dataClient.from("mechanics").select("id, profile_id").in("id", ids))),
  ]);
  const vehicles = vehicleResults.flatMap((result) => result.data ?? []);
  const diagnostics = diagnosticResults.flatMap((result) => result.data ?? []);
  const budgets = new Map(budgetResults.flatMap((result) => result.data ?? []).map((budget) => [budget.order_id, budget]));
  const mechanics = mechanicResults.flatMap((result) => result.data ?? []);
  const profileIds = [...new Set([...vehicles.map((vehicle) => vehicle.user_id), ...mechanics.map((mechanic) => mechanic.profile_id)])];
  const profileResults = await Promise.all(chunk(profileIds).map((ids) => dataClient.from("profiles").select("id, full_name, phone").in("id", ids)));
  const profiles = new Map(profileResults.flatMap((result) => result.data ?? []).map((profile) => [profile.id, profile]));
  const mechanicName = new Map(mechanics.map((mechanic) => [mechanic.id, profiles.get(mechanic.profile_id)?.full_name ?? "Mecánico"]));

  const ordersByVehicle = new Map<string, typeof orderRows>();
  for (const order of orderRows) ordersByVehicle.set(order.vehicle_id, [...(ordersByVehicle.get(order.vehicle_id) ?? []), order]);

  const rows = vehicles.map((vehicle) => {
    const vehicleOrders = ordersByVehicle.get(vehicle.id) ?? [];
    const history: VehicleHistoryOrder[] = vehicleOrders.map((order) => {
      const budget = budgets.get(order.id);
      return {
        id: order.id,
        reference: order.id.slice(0, 8).toUpperCase(),
        status: order.status as OrderStatus,
        date: dateFormat.format(new Date(order.received_at ?? order.appointment_date)),
        deliveredAt: order.delivered_at ? dateFormat.format(new Date(order.delivered_at)) : null,
        branch: multiBranch || branches.length > 1 ? branchById.get(order.branch_id)?.name ?? null : null,
        mechanic: order.mechanic_id ? mechanicName.get(order.mechanic_id) ?? null : null,
        jobs: diagnostics.filter((item) => item.order_id === order.id).map((item) => ({ description: item.description, price: item.price === null ? null : formatMoney(Number(item.price)), done: item.is_completed })),
        budget: budget ? { total: formatMoney(Number(budget.total_amount)), approved: budget.approved, includesParts: budget.includes_parts } : null,
      };
    });
    const owner = profiles.get(vehicle.user_id);
    return { ...vehicle, clientName: owner?.full_name ?? "Cliente", clientPhone: owner?.phone ?? null, visits: vehicleOrders.length, lastVisit: history[0]?.date ?? "", lastVisitAt: vehicleOrders[0]?.appointment_date ?? "", history };
  }).sort((a, b) => b.lastVisitAt.localeCompare(a.lastVisitAt));

  // Filter options come from the vehicles that actually passed through the garage.
  const brands = [...new Set(rows.map((row) => row.brand))].sort((a, b) => a.localeCompare(b, "es"));
  const models = [...new Set(rows.filter((row) => !brand || row.brand === brand).map((row) => row.model))].sort((a, b) => a.localeCompare(b, "es"));
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => b - a);

  const plate = q.trim().toUpperCase().replace(/[\s-]/g, "");
  const filtered = rows.filter((row) =>
    (!plate || row.plate.toUpperCase().replace(/[\s-]/g, "").includes(plate))
    && (!brand || row.brand === brand)
    && (!model || row.model === model)
    && (!year || String(row.year) === year));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), Math.max(1, Math.ceil(filtered.length / pageSize)));
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const params = Object.fromEntries(Object.entries({ q, brand, model, year, branch: staffBranchId ? "" : branchId ?? "" }).filter(([, value]) => value));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header>
        <p className="text-xs font-bold uppercase text-[#d9341d]">{garage.name}</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Vehículos</h1>
        <p className="mt-1 text-sm text-stone-600">Todos los vehículos que han pasado por tu taller y sus reparaciones.</p>
      </header>
      {multiBranch && <BranchTabs branches={branches} current={branchId} href={(id) => `${PATH}${id ? `?branch=${id}` : ""}`} />}
      <form className="mt-6 grid gap-2 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_170px_120px_auto_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={19} />
          <input name="q" defaultValue={q} placeholder="Buscar por placa" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4 uppercase placeholder:normal-case" />
        </div>
        {branchId && !staffBranchId && <input type="hidden" name="branch" value={branchId} />}
        <select name="brand" defaultValue={brand} aria-label="Marca" className="min-h-12 rounded-md border border-stone-300 bg-white px-3"><option value="">Todas las marcas</option>{brands.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select name="model" defaultValue={model} aria-label="Modelo" className="min-h-12 rounded-md border border-stone-300 bg-white px-3"><option value="">Todos los modelos</option>{models.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select name="year" defaultValue={year} aria-label="Año" className="min-h-12 rounded-md border border-stone-300 bg-white px-3"><option value="">Todos los años</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <button className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Filtrar</button>
        <Link href={`${PATH}${branchId && !staffBranchId ? `?branch=${branchId}` : ""}`} aria-label="Limpiar filtros" className="grid min-h-12 place-items-center rounded-md border border-stone-300 px-4"><RotateCcw size={18} /></Link>
      </form>

      <p className="mt-4 text-sm text-stone-600">{filtered.length} {filtered.length === 1 ? "vehículo" : "vehículos"}</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="w-full min-w-180 text-left text-sm">
          <thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Placa</th><th className="p-4">Vehículo</th><th className="p-4">Cliente</th><th className="p-4">Visitas</th><th className="p-4">Última visita</th><th className="p-4 text-right">Detalle</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {visible.map((row) => (
              <tr key={row.id}>
                <td className="p-4 font-mono font-bold">{row.plate}</td>
                <td className="p-4"><p className="font-bold">{row.brand} {row.model}</p><p className="text-xs text-stone-500">{row.year} · {row.color}</p></td>
                <td className="p-4"><p>{row.clientName}</p>{row.clientPhone && <p className="text-xs text-stone-500">{row.clientPhone}</p>}</td>
                <td className="p-4">{row.visits}</td>
                <td className="p-4">{row.lastVisit}</td>
                <td className="p-4 text-right"><VehicleHistoryButton vehicle={{ plate: row.plate, label: `${row.brand} ${row.model} ${row.year}`, color: row.color, clientName: row.clientName, clientPhone: row.clientPhone }} history={row.history} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <p className="p-8 text-center text-stone-500">{rows.length ? "Ningún vehículo coincide con los filtros." : "Todavía no ha pasado ningún vehículo por tu taller."}</p>}
      </div>
      <TablePagination currentPage={currentPage} pageSize={pageSize} pathname={PATH} searchParams={params} totalItems={filtered.length} />
    </div>
  );
}
