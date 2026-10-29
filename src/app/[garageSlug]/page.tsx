import type { Metadata } from "next";
import { CalendarDays, LogIn, MapPin, UserPlus, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppointmentBooking } from "@/components/client/appointment-booking";
import { ClientAppointmentsList } from "@/components/client/client-appointments-list";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getOpenOrdersByVehicle } from "@/lib/order-status";
import { getPublicGarage, serializeJsonLd, siteUrl } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

type Props = { params: Promise<{ garageSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { garageSlug } = await params;
  const garage = await getPublicGarage(garageSlug);
  if (!garage) return { title: "Taller no encontrado", robots: { index: false, follow: false } };
  const title = `${garage.name} · Taller mecánico con agenda online`;
  const description = `Reserva tu cita en ${garage.name} (${garage.address}). Agenda online, diagnóstico y presupuestos de tu vehículo desde el teléfono con TorkeOS.`;
  const url = `/${garage.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function PublicGaragePage({ params }: { params: Promise<{ garageSlug: string }> }) {
  const { garageSlug } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();
  const garage = await getPublicGarage(garageSlug);
  if (!garage) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isClient = user?.app_metadata.role === "client";
  const [{ data: vehicles }, { data: profile }, { data: allGarages }] = await Promise.all([
    isClient ? admin.from("vehicles").select("id, brand, model, year, plate").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    user ? admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    isClient ? admin.from("garages").select("id, name, address, specialty").order("name") : Promise.resolve({ data: [] }),
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
  const openOrders = isClient ? await getOpenOrdersByVehicle(admin, vehicleIds) : new Map<string, OrderStatus>();
  const vehicleOptions = (vehicles ?? []).map((vehicle) => {
    const openStatus = openOrders.get(vehicle.id);
    return { id: vehicle.id, label: `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}`, openOrderLabel: openStatus ? ORDER_STATUS_LABELS[openStatus] : null };
  });
  const returnPath = `/${garage.slug}`;
  const mapUrl = garage.map_location?.startsWith("http") ? garage.map_location : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${garage.name}, ${garage.address}`)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "@id": `${siteUrl}/${garage.slug}#business`,
    name: garage.name,
    url: `${siteUrl}/${garage.slug}`,
    address: { "@type": "PostalAddress", streetAddress: garage.address },
    hasMap: mapUrl,
    potentialAction: { "@type": "ReserveAction", target: `${siteUrl}/${garage.slug}`, name: "Reservar cita" },
  };

  const content = <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} /><header className="bg-[#171a1f] px-4 py-8 text-white"><div className="mx-auto flex max-w-5xl items-center gap-4"><span className="grid size-12 place-items-center rounded-md bg-[#ef3f26]"><Wrench /></span><div><p className="text-xs font-bold uppercase text-[#ff765f]">Agenda online</p><h1 className="font-display text-3xl font-bold">{garage.name}</h1>{garage.specialty && <p className="mt-1 text-sm font-semibold text-[#ff765f]">{garage.specialty}</p>}<p className="mt-1 flex items-center gap-2 text-sm text-stone-300"><MapPin size={15} /> <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{garage.address}</a></p></div></div></header><div className="mx-auto max-w-5xl px-4 py-8">{isClient && <ClientAppointmentsList garageId={garage.id} appointments={appointments} />}<section className={isClient ? "pt-8" : ""}><div className="flex items-center gap-3"><CalendarDays className="text-[#d9341d]" /><div><h2 className="font-display text-2xl font-bold">Reserva tu cita</h2><p className="text-sm text-stone-600">Horarios de 08:00 a 18:00, cada 30 minutos.</p></div></div>{!user && <div className="mt-5 grid gap-3 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2"><Link href={`/register?next=${encodeURIComponent(returnPath)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><UserPlus size={19} /> Crea tu cuenta</Link><Link href={`/login/${garage.slug}?next=${encodeURIComponent(returnPath)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-5 font-bold"><LogIn size={19} /> Iniciar sesión</Link></div>}{user && !isClient && <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">La agenda pública está disponible para cuentas de cliente.</p>}{isClient && vehicles?.length ? <AppointmentBooking garages={(allGarages ?? []).map((item) => ({ id: item.id, label: item.name, address: item.address, specialty: item.specialty }))} lockedGarageId={garage.id} vehicles={vehicleOptions} /> : isClient ? <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">Primero registra un vehículo desde tu panel de cliente para reservar.</p> : null}</section></div></>;
  return isClient ? <DashboardShell role="client" userName={profile?.full_name ?? user.email ?? "Cliente"} garageContext={{ name: garage.name, slug: garage.slug }}>{content}</DashboardShell> : <main className="min-h-dvh bg-stone-100">{content}</main>;
}