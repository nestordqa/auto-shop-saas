import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VehicleHistoryPanel } from "@/components/history/vehicle-history-panel";
import { IntakeSummary } from "@/components/intake/intake-summary";
import { VehicleIntakeForm } from "@/components/intake/vehicle-intake-form";
import { DiagnosticReport } from "@/components/orders/diagnostic-report";
import { MechanicDiagnosticForm } from "@/components/orders/mechanic-diagnostic-form";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderMechanicAssignment } from "@/components/owner/order-mechanic-assignment";
import { OrderProgressAction } from "@/components/owner/order-progress-action";
import { requireMechanic } from "@/lib/auth/require-mechanic";
import { specialtyLabel } from "@/lib/mechanics";
import { getGarageRepairOptions } from "@/lib/repair-catalog";
import { getSpecialties } from "@/lib/specialties-data";
import { getOrderIntake } from "@/lib/intake-data";
import { isStorageConfigured } from "@/lib/storage/intake-photos";
import { getVehicleHistory } from "@/lib/vehicle-history";
import type { Diagnostic, OrderStatus } from "@/types/domain";

export default async function MechanicOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { mechanic, dataClient } = await requireMechanic();
  if (!mechanic?.is_active) notFound();
  const { data: order } = await dataClient.from("orders").select("id, vehicle_id, status, mechanic_id, branch_id").eq("id", orderId).eq("garage_id", mechanic.garage_id).maybeSingle();
  const assigned = order?.mechanic_id === mechanic.id;
  // Reception mechanics reach every order of their branch; the rest only their assigned ones.
  const reception = Boolean(mechanic.can_receive && order?.branch_id === mechanic.branch_id);
  if (!order || (!assigned && !reception)) notFound();
  const [{ data: vehicle }, { data: diagnosticRows }, intake, history] = await Promise.all([
    dataClient.from("vehicles").select("user_id, brand, model, year, plate").eq("id", order.vehicle_id).maybeSingle(),
    dataClient.from("diagnostics").select("id, description, is_completed, component, component_label, intervention_type, part_brand").eq("order_id", order.id).order("created_at"),
    getOrderIntake(dataClient, order.id),
    getVehicleHistory(dataClient, order.vehicle_id, { garageId: mechanic.garage_id }, { excludeOrderId: order.id }),
  ]);
  const repairOptions = order.status === "ingresado" ? await getGarageRepairOptions(dataClient, mechanic.garage_id) : [];
  const { data: customer } = vehicle ? await dataClient.from("profiles").select("full_name").eq("id", vehicle.user_id).maybeSingle() : { data: null };
  const status = order.status as OrderStatus;
  const mechanicOptions = reception ? await branchMechanicOptions(dataClient, mechanic.garage_id, order.branch_id) : [];
  const diagnostics: Diagnostic[] = (diagnosticRows ?? []).map((item) => ({
    id: item.id,
    description: item.description,
    price: null,
    isCompleted: item.is_completed,
    component: item.component,
    componentLabel: item.component_label,
    interventionType: item.intervention_type,
    partBrand: item.part_brand,
  }));
  const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}` : "Vehículo";
  const reference = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/dashboard/mechanic" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"><ArrowLeft size={18} /> Mis órdenes</Link>
      <header className="my-6">
        <p className="text-xs font-bold uppercase text-[#d9341d]">Orden {reference}</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{vehicleLabel}</h1>
        <div className="mt-3"><OrderStatusBadge status={status} size="lg" /></div>
      </header>
      {reception && <div className="mb-4"><OrderMechanicAssignment orderId={order.id} currentMechanicId={order.mechanic_id} mechanics={mechanicOptions} disabled={status === "entregado"} apiBase="/api/mechanic/orders" /></div>}
      {status === "por_ingresar" && !reception && <p className="rounded-lg border border-stone-200 bg-white p-5 text-stone-600">El vehículo aún no ingresa. Lo recibirá el taller o un mecánico de recepción.</p>}
      {status === "por_ingresar" && reception && (
        <VehicleIntakeForm orderId={order.id} vehicleLabel={vehicleLabel} customerName={customer?.full_name ?? ""} storageEnabled={isStorageConfigured()} />
      )}
      {intake && <IntakeSummary intake={intake} vehicleLabel={vehicleLabel} orderReference={reference} defaultOpen={status === "ingresado"} downloadable={false} />}
      {status !== "por_ingresar" && <VehicleHistoryPanel history={history} currentMileage={intake?.mileage} />}
      {!assigned && status !== "por_ingresar" && <p className="mt-4 rounded-lg border border-stone-200 bg-white p-5 text-stone-600">Esta orden está asignada a otro mecánico.</p>}
      {assigned && <div className="mt-4">
        {status === "ingresado" && <MechanicDiagnosticForm orderId={order.id} initialStatus={status} initialDiagnostics={diagnostics} repairOptions={repairOptions} />}
        {status !== "por_ingresar" && status !== "ingresado" && (
          <div className="mb-4">
            <DiagnosticReport diagnostics={diagnostics} subtitle={status === "diagnosticado" ? "Diagnóstico finalizado. El taller debe cargar el presupuesto." : undefined} />
          </div>
        )}
        {(status === "en_reparacion" || status === "en_prueba") && (
          <>
            <p className="mb-3 rounded-lg border border-stone-200 bg-white p-5 text-stone-600">
              {status === "en_reparacion" ? "Cuando termines la reparación, pasa el vehículo a prueba." : "Si la prueba sale bien, marca el vehículo como listo para entregar. Si no, vuelve a reparación."}
            </p>
            <OrderProgressAction orderId={order.id} status={status} mechanic />
          </>
        )}
        {(["presupuestado", "presupuesto_rechazado", "listo_para_entregar", "entregado"] as OrderStatus[]).includes(status) && <p className="rounded-lg border border-stone-200 bg-white p-5 text-stone-600">El taller gestiona el presupuesto y la entrega de este vehículo.</p>}
      </div>}
    </div>
  );
}

/** Active mechanics of the order's branch, for the reception assignment. */
async function branchMechanicOptions(dataClient: Awaited<ReturnType<typeof requireMechanic>>["dataClient"], garageId: string, branchId: string) {
  const [{ data: rows }, specialties] = await Promise.all([
    dataClient.from("mechanics").select("id, profile_id, specialty").eq("garage_id", garageId).eq("branch_id", branchId).eq("is_active", true),
    getSpecialties(dataClient),
  ]);
  const ids = (rows ?? []).map((row) => row.profile_id as string);
  const { data: profiles } = ids.length ? await dataClient.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id as string, profile.full_name as string]));
  return (rows ?? []).map((row) => ({ id: row.id as string, name: names.get(row.profile_id as string) ?? "Mecánico", specialty: specialtyLabel(row.specialty as string, specialties) }));
}
