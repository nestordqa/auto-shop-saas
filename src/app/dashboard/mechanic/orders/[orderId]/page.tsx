import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VehicleHistoryPanel } from "@/components/history/vehicle-history-panel";
import { IntakeSummary } from "@/components/intake/intake-summary";
import { VehicleIntakeForm } from "@/components/intake/vehicle-intake-form";
import { DiagnosticReport } from "@/components/orders/diagnostic-report";
import { MechanicDiagnosticForm } from "@/components/orders/mechanic-diagnostic-form";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderProgressAction } from "@/components/owner/order-progress-action";
import { requireMechanic } from "@/lib/auth/require-mechanic";
import { getOrderIntake } from "@/lib/intake-data";
import { isStorageConfigured } from "@/lib/storage/intake-photos";
import { getVehicleHistory } from "@/lib/vehicle-history";
import type { Diagnostic, OrderStatus } from "@/types/domain";

export default async function MechanicOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { mechanic, dataClient } = await requireMechanic();
  if (!mechanic?.is_active) notFound();
  const { data: order } = await dataClient.from("orders").select("id, vehicle_id, status").eq("id", orderId).eq("mechanic_id", mechanic.id).maybeSingle();
  if (!order) notFound();
  const [{ data: vehicle }, { data: diagnosticRows }, intake, history] = await Promise.all([
    dataClient.from("vehicles").select("user_id, brand, model, year, plate").eq("id", order.vehicle_id).maybeSingle(),
    dataClient.from("diagnostics").select("id, description, is_completed, component, intervention_type").eq("order_id", order.id).order("created_at"),
    getOrderIntake(dataClient, order.id),
    getVehicleHistory(dataClient, order.vehicle_id, { garageId: mechanic.garage_id }, { excludeOrderId: order.id }),
  ]);
  const { data: customer } = vehicle ? await dataClient.from("profiles").select("full_name").eq("id", vehicle.user_id).maybeSingle() : { data: null };
  const status = order.status as OrderStatus;
  const diagnostics: Diagnostic[] = (diagnosticRows ?? []).map((item) => ({
    id: item.id,
    description: item.description,
    price: null,
    isCompleted: item.is_completed,
    component: item.component,
    interventionType: item.intervention_type,
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
      {status === "por_ingresar" && (
        <VehicleIntakeForm orderId={order.id} vehicleLabel={vehicleLabel} customerName={customer?.full_name ?? ""} storageEnabled={isStorageConfigured()} />
      )}
      {intake && <IntakeSummary intake={intake} vehicleLabel={vehicleLabel} orderReference={reference} defaultOpen={status === "ingresado"} downloadable={false} />}
      {status !== "por_ingresar" && <VehicleHistoryPanel history={history} currentMileage={intake?.mileage} />}
      <div className="mt-4">
        {status === "ingresado" && <MechanicDiagnosticForm orderId={order.id} initialStatus={status} initialDiagnostics={diagnostics} />}
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
      </div>
    </div>
  );
}
