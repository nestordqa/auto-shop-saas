import { ArrowLeft, CalendarDays, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BudgetDecisionActions } from "@/components/orders/budget-decision-actions";
import { MechanicDiagnosticForm } from "@/components/orders/mechanic-diagnostic-form";
import { OwnerBudgetEditor } from "@/components/orders/owner-budget-editor";
import { OrderMechanicAssignment } from "@/components/owner/order-mechanic-assignment";
import { OrderProgressAction } from "@/components/owner/order-progress-action";
import { requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import { MECHANIC_SPECIALTY_LABELS, type MechanicSpecialty } from "@/lib/mechanics";
import { ORDER_STATUS_LABELS, type Diagnostic, type OrderStatus } from "@/types/domain";

export default async function OwnerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { garage, dataClient, user } = await requireOwnerGarage();
  if (!garage) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Taller no asignado</h1><p className="mt-2 text-stone-600">La cuenta {user.email} no está asociada a un taller.</p></div>;
  const { data: order } = await dataClient.from("orders").select("id, vehicle_id, mechanic_id, status, appointment_date").eq("id", orderId).eq("garage_id", garage.id).maybeSingle();
  if (!order) notFound();

  const [{ data: vehicle }, { data: diagnosticRows }, { data: budget }, { data: mechanic }, { data: activeMechanics }] = await Promise.all([
    dataClient.from("vehicles").select("user_id, brand, model, year, plate").eq("id", order.vehicle_id).maybeSingle(),
    dataClient.from("diagnostics").select("id, description, price, is_completed").eq("order_id", order.id).order("created_at"),
    dataClient.from("budgets").select("includes_parts, approved").eq("order_id", order.id).maybeSingle(),
    order.mechanic_id ? dataClient.from("mechanics").select("profile_id").eq("id", order.mechanic_id).maybeSingle() : Promise.resolve({ data: null }),
    dataClient.from("mechanics").select("id, profile_id, specialty").eq("garage_id", garage.id).eq("is_active", true).order("created_at"),
  ]);
  const profileIds = [vehicle?.user_id, mechanic?.profile_id, ...(activeMechanics ?? []).map((item) => item.profile_id)].filter((id): id is string => Boolean(id));
  const { data: profiles } = profileIds.length ? await dataClient.from("profiles").select("id, full_name, phone").in("id", profileIds) : { data: [] };
  const customer = profiles?.find((profile) => profile.id === vehicle?.user_id);
  const mechanicProfile = profiles?.find((profile) => profile.id === mechanic?.profile_id);
  const status = order.status as OrderStatus;
  const diagnostics: Diagnostic[] = (diagnosticRows ?? []).map((item) => ({ id: item.id, description: item.description, price: item.price, isCompleted: item.is_completed }));
  const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}` : "Vehículo";
  const mechanicOptions = (activeMechanics ?? []).map((item) => ({ id: item.id, name: profiles?.find((profile) => profile.id === item.profile_id)?.full_name ?? "Mecánico", specialty: MECHANIC_SPECIALTY_LABELS[item.specialty as MechanicSpecialty] }));

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8"><Link href="/dashboard/owner/orders" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"><ArrowLeft size={18} /> Volver a órdenes</Link><header className="mt-5"><p className="text-xs font-bold uppercase text-[#d9341d]">Orden {order.id.slice(0, 8).toUpperCase()}</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{vehicleLabel}</h1><span className="mt-3 inline-flex rounded-sm bg-stone-900 px-3 py-2 text-sm font-bold text-white">{ORDER_STATUS_LABELS[status]}</span></header><section className="my-6 grid gap-3 sm:grid-cols-3"><Info icon={UserRound} label="Cliente" value={customer?.full_name ?? "Cliente"} /><Info icon={Wrench} label="Mecánico" value={mechanicProfile?.full_name ?? "Sin asignar"} /><Info icon={CalendarDays} label="Cita" value={new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.appointment_date))} /></section>
    <OrderMechanicAssignment orderId={order.id} currentMechanicId={order.mechanic_id} mechanics={mechanicOptions} disabled={status === "entregado"} />
    {status === "por_ingresar" && <OrderProgressAction orderId={order.id} status={status} />}
    {status === "ingresado" && <div className="mt-4"><MechanicDiagnosticForm orderId={order.id} initialStatus={status} initialDiagnostics={diagnostics} /></div>}
    {(status === "diagnosticado" || status === "presupuestado" || status === "presupuesto_rechazado") && diagnostics.length > 0 && <OwnerBudgetEditor orderId={order.id} orderReference={order.id.slice(0, 8).toUpperCase()} vehicleLabel={vehicleLabel} customerName={customer?.full_name ?? "Cliente"} customerPhone={customer?.phone ?? ""} garageName={garage.name} initialDiagnostics={diagnostics} initialIncludesParts={budget?.includes_parts ?? false} />}
    {status === "presupuestado" && <section className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-display text-xl font-bold">Decisión del presupuesto</h2><p className="mb-4 mt-1 text-sm text-emerald-900">El cliente o el dueño del taller pueden aceptar e iniciar la reparación, o rechazar este presupuesto.</p><BudgetDecisionActions orderId={order.id} /></section>}
    {status === "en_reparacion" && budget?.approved === true && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5 font-semibold text-emerald-800">Presupuesto aceptado. La orden está en reparación.</p>}
    {status === "presupuesto_rechazado" && budget?.approved === false && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-5 font-semibold text-red-800">El presupuesto fue rechazado.</p>}
    {(status === "en_reparacion" || status === "listo_para_entregar") && <OrderProgressAction orderId={order.id} status={status} />}
    {status === "entregado" && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 font-semibold text-emerald-800">Esta orden fue completada y el vehículo ya fue entregado.</p>}
    {status === "diagnosticado" && diagnostics.length === 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800">La orden no tiene ítems de diagnóstico para presupuestar.</p>}
  </div>;
}

function Info({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) { return <article className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-4"><Icon className="text-stone-400" size={20} /><div className="min-w-0"><p className="text-xs text-stone-500">{label}</p><p className="truncate font-bold">{value}</p></div></article>; }