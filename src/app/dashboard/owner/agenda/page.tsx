import { CalendarDays, RotateCcw } from "lucide-react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { BranchTabs } from "@/components/owner/branch-tabs";
import { ScheduleEditor } from "@/components/owner/schedule-editor";
import { UnavailabilityManager } from "@/components/owner/unavailability-manager";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  appointmentDateKey,
  appointmentMonthKey,
  formatAppointmentDate,
  formatAppointmentDateTime,
  GARAGE_TIME_ZONE,
} from "@/lib/appointments";
import { branchScope, requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import {
  formatBillingMonth,
  getBillingMonth,
  getMonthOptions,
} from "@/lib/billing";
import { getOwnerOrders } from "@/lib/owner-orders";
import { parseSchedule, scheduleSummary } from "@/lib/schedule";

const pageSize = 10;

export default async function OwnerAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; page?: string; branch?: string }>;
}) {
  const { garage, dataClient, user, branches, staffBranchId } = await requireOwnerGarage();
  const { month: requestedMonth, page = "1", branch } = await searchParams;
  if (!garage)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold">Taller no asignado</h1>
        <p className="mt-2 text-stone-600">
          La cuenta {user.email} no está asociada a un taller.
        </p>
      </div>
    );
  const month = getBillingMonth(requestedMonth);
  const { multiBranch, branchId, branchById } = branchScope(branches, staffBranchId, branch);
  let blocksQuery = dataClient
    .from("garage_unavailability")
    .select("id, branch_id, starts_at, ends_at, reason")
    .eq("garage_id", garage.id)
    .gt("ends_at", new Date().toISOString());
  // A branch sees its own blocks plus the ones for the whole garage.
  if (branchId) blocksQuery = blocksQuery.or(`branch_id.is.null,branch_id.eq.${branchId}`);
  const [{ rows }, { data: blockRows }] = await Promise.all([
    getOwnerOrders(dataClient, garage.id, branchId),
    blocksQuery.order("starts_at"),
  ]);
  const now = new Date();
  // Hours are edited per branch: the one in view, or the only one. "Todas" lists a summary instead.
  const scheduleBranch = branchId ? branchById.get(branchId) : branches.length === 1 ? branches[0] : undefined;
  const blocks = (blockRows ?? []).map((block) => ({
    id: block.id as string,
    label: formatBlockRange(block.starts_at, block.ends_at),
    reason: block.reason as string | null,
    scope: branches.length > 1 ? (block.branch_id ? branchById.get(block.branch_id)?.name ?? "Sucursal" : "Todas las sucursales") : null,
    // Managers can only remove the blocks of their own branch.
    canRemove: !staffBranchId || block.branch_id === staffBranchId,
    active: new Date(block.starts_at) <= now,
  }));
  const appointments = rows
    .filter((order) => appointmentMonthKey(order.appointmentDate) === month)
    .sort((first, second) =>
      first.appointmentDate.localeCompare(second.appointmentDate),
    );
  const totalPages = Math.max(1, Math.ceil(appointments.length / pageSize));
  const currentPage = Math.min(
    Math.max(Number.parseInt(page, 10) || 1, 1),
    totalPages,
  );
  const paginated = appointments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const today = appointmentDateKey(new Date());
  const todayCount = appointments.filter(
    (order) => appointmentDateKey(order.appointmentDate) === today,
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header>
        <p className="text-xs font-bold uppercase text-[#d9341d]">
          {garage.name}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
          Agenda
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Citas y recepciones programadas del taller.
        </p>
      </header>
      <section className="mt-6 grid grid-cols-2 gap-3">
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Citas del mes</p>
          <p className="text-3xl font-bold">{appointments.length}</p>
        </article>
        <article className="rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Citas de hoy</p>
          <p className="text-3xl font-bold">{todayCount}</p>
        </article>
      </section>
      {multiBranch && <BranchTabs branches={branches} current={branchId} href={(id) => `/dashboard/owner/agenda?month=${month}${id ? `&branch=${id}` : ""}`} />}
      {scheduleBranch ? (
        <ScheduleEditor key={scheduleBranch.id} branchId={scheduleBranch.id} branchName={branches.length > 1 ? scheduleBranch.name : null} schedule={parseSchedule(scheduleBranch.schedule)} />
      ) : (
        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="font-display text-xl font-bold">Horario de atención</h2>
          <p className="mt-1 text-sm text-stone-600">Elige una sucursal arriba para editar su horario.</p>
          <ul className="mt-3 grid gap-2 text-sm">{branches.filter((item) => item.is_active).map((item) => <li key={item.id}><strong>{item.name}:</strong> {scheduleSummary(parseSchedule(item.schedule))}</li>)}</ul>
        </section>
      )}
      <UnavailabilityManager blocks={blocks} today={today} branches={staffBranchId || branches.length < 2 ? [] : branches.filter((item) => item.is_active).map((item) => ({ id: item.id, name: item.name }))} />
      <form className="mt-5 flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 sm:flex-row">
        <select
          name="month"
          defaultValue={month}
          className="min-h-12 flex-1 rounded-md border border-stone-300 bg-white px-4"
        >
          {getMonthOptions(garage.created_at, month).map((option) => (
            <option key={option} value={option}>
              {formatBillingMonth(option)}
            </option>
          ))}
        </select>
        {branchId && !staffBranchId && <input type="hidden" name="branch" value={branchId} />}
        <button className="rounded-md bg-stone-900 px-5 font-bold text-white">
          Ver agenda
        </button>
        {requestedMonth && (
          <Link
            href="/dashboard/owner/agenda"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold"
          >
            <RotateCcw size={18} /> Limpiar
          </Link>
        )}
      </form>
      <section className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-205 w-full text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-500">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Vehículo</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Mecánico</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginated.map((order) => (
                <tr key={order.id}>
                  <td className="p-4 font-bold">
                    <span className="flex items-center gap-2">
                      <CalendarDays size={17} />{" "}
                      {formatAppointmentDateTime(order.appointmentDate)}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/dashboard/owner/orders/${order.id}`}
                      className="font-bold hover:underline"
                    >
                      {order.vehicle}
                    </Link>
                    <p className="text-xs text-stone-500">{order.plate}</p>
                  </td>
                  <td className="p-4">{order.customer}{multiBranch && !branchId && <p className="text-xs text-stone-500">{branchById.get(order.branchId)?.name}</p>}</td>
                  <td className="p-4">{order.mechanic}</td>
                  <td className="p-4"><OrderStatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!appointments.length && (
            <p className="p-8 text-center text-stone-500">
              No hay citas para este mes.
            </p>
          )}
        </div>
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          pathname="/dashboard/owner/agenda"
          searchParams={{ month, ...(branchId && !staffBranchId && { branch: branchId }) }}
          totalItems={appointments.length}
        />
      </section>
    </div>
  );
}

const timeOfDay = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: GARAGE_TIME_ZONE }).format(new Date(value));

/** Whole days (midnight to midnight) read as dates only; otherwise date and time at both ends. */
function formatBlockRange(startsAt: string, endsAt: string) {
  if (timeOfDay(startsAt) === "00:00" && timeOfDay(endsAt) === "00:00") {
    const lastDay = new Date(new Date(endsAt).getTime() - 1);
    const first = formatAppointmentDate(startsAt, "medium");
    const last = formatAppointmentDate(lastDay, "medium");
    return first === last ? first : `${first} – ${last}`;
  }
  return `${formatAppointmentDateTime(startsAt)} – ${formatAppointmentDateTime(endsAt)}`;
}
