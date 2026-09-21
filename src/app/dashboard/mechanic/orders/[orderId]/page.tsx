import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MechanicDiagnosticForm } from "@/components/orders/mechanic-diagnostic-form";
import { OrderProgressAction } from "@/components/owner/order-progress-action";
import { requireMechanic } from "@/lib/auth/require-mechanic";
import { ORDER_STATUS_LABELS, type Diagnostic, type OrderStatus } from "@/types/domain";

export default async function MechanicOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { mechanic, dataClient } = await requireMechanic();
  if (!mechanic?.is_active) notFound();
  const { data: order } = await dataClient.from("orders").select("id, vehicle_id, status").eq("id", orderId).eq("mechanic_id", mechanic.id).maybeSingle();
  if (!order) notFound();
  const [{ data: vehicle }, { data: diagnosticRows }] = await Promise.all([
    dataClient.from("vehicles").select("brand, model, year, plate").eq("id", order.vehicle_id).maybeSingle(),
    dataClient.from("diagnostics").select("id, description, is_completed").eq("order_id", order.id).order("created_at"),
  ]);
  const status = order.status as OrderStatus;
  const diagnostics: Diagnostic[] = (diagnosticRows ?? []).map((item) => ({ id: item.id, description: item.description, price: null, isCompleted: item.is_completed }));
  const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}` : "Vehículo";

  return <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8"><Link href="/dashboard/mechanic" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"><ArrowLeft size={18} /> Mis órdenes</Link><header className="my-6"><p className="text-xs font-bold uppercase text-[#d9341d]">Orden {order.id.slice(0, 8).toUpperCase()}</p><h1 className="mt-2 font-display text-3xl font-bold">{vehicleLabel}</h1><p className="mt-2 font-semibold text-stone-600">{ORDER_STATUS_LABELS[status]}</p></header>{status === "por_ingresar" && <OrderProgressAction orderId={order.id} status={status} />}{status === "ingresado" && <MechanicDiagnosticForm orderId={order.id} initialStatus={status} initialDiagnostics={diagnostics} />}{status === "diagnosticado" && <ReadOnlyDiagnostics diagnostics={diagnostics} />}{!(["por_ingresar", "ingresado", "diagnosticado"] as OrderStatus[]).includes(status) && <p className="rounded-lg border border-stone-200 bg-white p-5 text-stone-600">El diagnóstico ya finalizó. El owner gestiona el presupuesto y los siguientes estados.</p>}</div>;
}

function ReadOnlyDiagnostics({ diagnostics }: { diagnostics: Diagnostic[] }) {
  return <section className="overflow-hidden rounded-lg border border-stone-200 bg-white"><div className="border-b border-stone-200 p-5"><h2 className="text-xl font-bold">Diagnóstico finalizado</h2><p className="mt-1 text-sm text-stone-500">El owner debe cargar el presupuesto.</p></div><div className="divide-y divide-stone-100">{diagnostics.map((item) => <div key={item.id} className="p-4"><p className="font-semibold">{item.description}</p><p className="mt-1 text-xs text-stone-500">{item.isCompleted ? "Completado" : "Pendiente"}</p></div>)}</div>{!diagnostics.length && <p className="p-5 text-stone-500">No se registraron hallazgos.</p>}</section>;
}