import { Search } from "lucide-react";
import Link from "next/link";

import { TablePagination } from "@/components/ui/table-pagination";
import { formatAppointmentDateTime } from "@/lib/appointments";
import { requireMechanic } from "@/lib/auth/require-mechanic";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

const pageSize = 10;

export default async function MechanicDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { mechanic, dataClient } = await requireMechanic();
  const { q = "", page = "1" } = await searchParams;
  if (!mechanic?.is_active)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold">
          Sin acceso al equipo
        </h1>
        <p className="mt-2 text-stone-600">
          Tu perfil no está activo en un taller.
        </p>
      </div>
    );
  const { data: orders } = await dataClient
    .from("orders")
    .select("id, vehicle_id, status, appointment_date")
    .eq("mechanic_id", mechanic.id)
    .order("appointment_date", { ascending: false });
  const vehicleIds = (orders ?? []).map((order) => order.vehicle_id);
  const { data: vehicles } = vehicleIds.length
    ? await dataClient
        .from("vehicles")
        .select("id, brand, model, year, plate")
        .in("id", vehicleIds)
    : { data: [] };
  const vehicleById = new Map(
    (vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]),
  );
  const normalizedQuery = q.trim().toLocaleLowerCase("es");
  const rows = (orders ?? []).filter((order) => {
    const vehicle = vehicleById.get(order.vehicle_id);
    return (
      !normalizedQuery ||
      `${vehicle?.brand} ${vehicle?.model} ${vehicle?.plate}`
        .toLocaleLowerCase("es")
        .includes(normalizedQuery)
    );
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(
    Math.max(Number.parseInt(page, 10) || 1, 1),
    totalPages,
  );
  const paginated = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header>
        <p className="text-xs font-bold uppercase text-[#d9341d]">
          Área técnica
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
          Mis órdenes asignadas
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Solo se muestran trabajos asignados a tu perfil.
        </p>
      </header>
      <form className="mt-6 flex gap-2 rounded-lg border border-stone-200 bg-white p-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            size={19}
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar vehículo o placa"
            className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4"
          />
        </div>
        <button className="rounded-md bg-stone-900 px-5 font-bold text-white">
          Buscar
        </button>
      </form>
      <section className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-180 w-full text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-500">
              <tr>
                <th className="p-4">Vehículo</th>
                <th className="p-4">Cita</th>
                <th className="p-4">Estado</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginated.map((order) => {
                const vehicle = vehicleById.get(order.vehicle_id);
                return (
                  <tr key={order.id}>
                    <td className="p-4">
                      <p className="font-bold">
                        {vehicle
                          ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}`
                          : "Vehículo"}
                      </p>
                      <p className="text-xs text-stone-500">
                        {vehicle?.plate ?? "—"} ·{" "}
                        {order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </td>
                    <td className="p-4">
                      {formatAppointmentDateTime(order.appointment_date)}
                    </td>
                    <td className="p-4">
                      {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/mechanic/orders/${order.id}`}
                        className="inline-flex min-h-10 items-center rounded-md bg-stone-900 px-4 font-bold text-white"
                      >
                        {order.status === "por_ingresar" ||
                        order.status === "ingresado"
                          ? "Trabajar"
                          : "Ver"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <p className="p-8 text-center text-stone-500">
              No tienes órdenes asignadas.
            </p>
          )}
        </div>
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          pathname="/dashboard/mechanic"
          searchParams={{ ...(q && { q }) }}
          totalItems={rows.length}
        />
      </section>
    </div>
  );
}
