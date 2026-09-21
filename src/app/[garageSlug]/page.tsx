import { CalendarDays, LogIn, MapPin, UserPlus, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppointmentBooking } from "@/components/client/appointment-booking";
import { ClientAppointmentsList } from "@/components/client/client-appointments-list";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/domain";

export default async function PublicGaragePage({ params }: { params: Promise<{ garageSlug: string }> }) {
  const { garageSlug } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();
  const { data: garage } = await admin.from("garages").select("id, name, address, slug").eq("slug", garageSlug).maybeSingle();
  if (!garage) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isClient = user?.app_metadata.role === "client";
  const [{ data: vehicles }, { data: profile }] = await Promise.all([
    isClient ? admin.from("vehicles").select("id, brand, model, year, plate").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    user ? admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const vehicleIds = (vehicles ?? []).map(({ id }) => id);
  const { data: orders } = isClient && vehicleIds.length ? await admin.from("orders").select("id, vehicle_id, status, appointment_date").eq("garage_id", garage.id).in("vehicle_id", vehicleIds).order("appointment_date", { ascending: false }) : { data: [] };
  const orderIds = (orders ?? []).map(({ id }) => id);
  const [{ data: budgets }, { data: diagnostics }] = await Promise.all([
    orderIds.length ? admin.from("budgets").select("order_id, total_amount, approved").in("order_id", orderIds) : Promise.resolve({ data: [] }),
    orderIds.length ? admin.from("diagnostics").select("order_id").in("order_id", orderIds) : Promise.resolve({ data: [] }),
  ]);
  const appointments = (orders ?? []).map((order) => {
    const vehicle = vehicles?.find((item) => item.id === order.vehicle_id);
    const budget = budgets?.find((item) => item.order_id === order.id);
    return { id: order.id, vehicle: vehicle ? `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}` : "Vehículo", status: order.status as OrderStatus, appointmentDate: order.appointment_date, diagnosticCount: (diagnostics ?? []).filter((item) => item.order_id === order.id).length, budgetTotal: budget ? Number(budget.total_amount) : null, budgetApproved: budget?.approved ?? null };
  });
  const returnPath = `/${garage.slug}`;

  const content = <><header className="bg-[#171a1f] px-4 py-8 text-white"><div className="mx-auto flex max-w-5xl items-center gap-4"><span className="grid size-12 place-items-center rounded-md bg-[#ef3f26]"><Wrench /></span><div><p className="text-xs font-bold uppercase text-[#ff765f]">Agenda online</p><h1 className="font-display text-3xl font-bold">{garage.name}</h1><p className="mt-1 flex items-center gap-2 text-sm text-stone-300"><MapPin size={15} /> {garage.address}</p></div></div></header><div className="mx-auto max-w-5xl px-4 py-8">{isClient && <ClientAppointmentsList garageId={garage.id} appointments={appointments} />}<section className={isClient ? "pt-8" : ""}><div className="flex items-center gap-3"><CalendarDays className="text-[#d9341d]" /><div><h2 className="font-display text-2xl font-bold">Reserva tu cita</h2><p className="text-sm text-stone-600">Horarios de 08:00 a 18:00, cada 30 minutos.</p></div></div>{!user && <div className="mt-5 grid gap-3 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2"><Link href={`/register?next=${encodeURIComponent(returnPath)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><UserPlus size={19} /> Crea tu cuenta</Link><Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-5 font-bold"><LogIn size={19} /> Iniciar sesión</Link></div>}{user && !isClient && <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">La agenda pública está disponible para cuentas de cliente.</p>}{isClient && vehicles?.length ? <AppointmentBooking garages={[{ id: garage.id, label: garage.name }]} lockedGarageId={garage.id} vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, label: `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}` }))} /> : isClient ? <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">Primero registra un vehículo desde tu panel de cliente para reservar.</p> : null}</section></div></>;
  return isClient ? <DashboardShell role="client" userName={profile?.full_name ?? user.email ?? "Cliente"} garageContext={{ name: garage.name, slug: garage.slug }}>{content}</DashboardShell> : <main className="min-h-dvh bg-stone-100">{content}</main>;
}