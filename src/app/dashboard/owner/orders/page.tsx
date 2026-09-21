import { RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { OrderCreateFlowModal } from "@/components/owner/order-create-flow-modal";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatAppointmentDateTime } from "@/lib/appointments";
import { requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import {
  MECHANIC_SPECIALTY_LABELS,
  type MechanicSpecialty,
} from "@/lib/mechanics";
import { getOwnerOrders } from "@/lib/owner-orders";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/types/domain";

const pageSize = 10;

export default async function OwnerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { garage, dataClient, user } = await requireOwnerGarage();
  const { q = "", status = "all", page = "1" } = await searchParams;
  if (!garage) return <MissingGarage email={user.email} />;
  const [
    { rows },
    { data: vehicles },
    { data: mechanicRows },
    { data: clients },
    { data: brands },
    { data: models },
  ] = await Promise.all([
    getOwnerOrders(dataClient, garage.id),
    dataClient
      .from("vehicles")
      .select("id, user_id, brand, model, year, plate")
      .order("plate"),
    dataClient
      .from("mechanics")
      .select("id, profile_id, specialty")
      .eq("garage_id", garage.id)
      .eq("is_active", true),
    dataClient
      .from("profiles")
      .select("id, full_name, document_id")
      .eq("role", "client")
      .order("full_name"),
    dataClient.from("vehicle_brands").select("id, name").eq("is_active", true),
    dataClient
      .from("vehicle_models")
      .select("id, brand_id, name")
      .eq("is_active", true),
  ]);
  const optionProfileIds = [
    ...new Set((mechanicRows ?? []).map((mechanic) => mechanic.profile_id)),
  ];
  const { data: optionProfiles } = optionProfileIds.length
    ? await dataClient
        .from("profiles")
        .select("id, full_name")
        .in("id", optionProfileIds)
    : { data: [] };
  const optionProfileById = new Map(
    (optionProfiles ?? []).map((profile) => [profile.id, profile.full_name]),
  );
  const clientOptions = (clients ?? []).map((client) => ({
    id: client.id,
    name: client.full_name,
    documentId: client.document_id,
  }));
  const vehicleOptions = (vehicles ?? []).map((vehicle) => ({
    id: vehicle.id,
    clientId: vehicle.user_id,
    label: `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}`,
  }));
  const mechanicOptions = (mechanicRows ?? []).map((mechanic) => ({
    id: mechanic.id,
    name: optionProfileById.get(mechanic.profile_id) ?? "Mecánico",
    specialty:
      MECHANIC_SPECIALTY_LABELS[mechanic.specialty as MechanicSpecialty],
  }));
  const brandOptions = (brands ?? []).map((brand) => ({
    id: brand.id,
    name: String(brand.name),
  }));
  const modelOptions = (models ?? []).map((model) => ({
    id: model.id,
    brandId: model.brand_id,
    name: String(model.name),
  }));
  const normalizedQuery = q.trim().toLocaleLowerCase("es");
  const filtered = rows.filter(
    (order) =>
      (status === "all" || order.status === status) &&
      (!normalizedQuery ||
        `${order.vehicle} ${order.plate} ${order.customer} ${order.mechanic}`
          .toLocaleLowerCase("es")
          .includes(normalizedQuery)),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(
    Math.max(Number.parseInt(page, 10) || 1, 1),
    totalPages,
  );
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#d9341d]">
            {garage.name}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Órdenes
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Seguimiento operativo, diagnóstico y presupuesto.
          </p>
        </div>
        <OrderCreateFlowModal
          clients={clientOptions}
          vehicles={vehicleOptions}
          brands={brandOptions}
          models={modelOptions}
          mechanics={mechanicOptions}
        />
      </header>
      <form className="mt-6 grid gap-2 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            size={19}
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Vehículo, placa, cliente o mecánico"
            className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="min-h-12 rounded-md border border-stone-300 bg-white px-4"
        >
          <option value="all">Todos los estados</option>
          {ORDER_STATUSES.map((item) => (
            <option key={item} value={item}>
              {ORDER_STATUS_LABELS[item]}
            </option>
          ))}
        </select>
        <button className="rounded-md bg-stone-900 px-5 font-bold text-white">
          Filtrar
        </button>
        {(q || status !== "all") && (
          <Link
            href="/dashboard/owner/orders"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold"
          >
            <RotateCcw size={18} /> Limpiar
          </Link>
        )}
      </form>
      <section className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-230 w-full text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-500">
              <tr>
                <th className="p-4">Orden</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Cita</th>
                <th className="p-4">Mecánico</th>
                <th className="p-4">Estado</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginated.map((order) => (
                <tr key={order.id}>
                  <td className="p-4">
                    <p className="font-bold">{order.vehicle}</p>
                    <p className="text-xs text-stone-500">
                      {order.plate} · {order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </td>
                  <td className="p-4">{order.customer}</td>
                  <td className="p-4">
                    {formatAppointmentDateTime(order.appointmentDate)}
                  </td>
                  <td className="p-4">{order.mechanic}</td>
                  <td className="p-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/dashboard/owner/orders/${order.id}`}
                      className="inline-flex min-h-10 items-center rounded-md bg-stone-900 px-4 font-bold text-white"
                    >
                      Gestionar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="p-8 text-center text-stone-500">
              No hay órdenes que coincidan con los filtros.
            </p>
          )}
        </div>
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          pathname="/dashboard/owner/orders"
          searchParams={{
            ...(q && { q }),
            ...(status !== "all" && { status }),
          }}
          totalItems={filtered.length}
        />
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs font-bold">
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
function MissingGarage({ email }: { email?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Taller no asignado</h1>
      <p className="mt-2 text-stone-600">
        La cuenta {email ?? "actual"} no está configurada como owner de un
        taller.
      </p>
    </div>
  );
}
