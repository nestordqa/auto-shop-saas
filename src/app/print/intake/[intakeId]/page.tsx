import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { TorkeMark } from "@/components/brand/torke-logo";
import { IntakeDocument } from "@/components/intake/intake-summary";
import { PrintButton } from "@/components/intake/print-button";
import { getStaffGarage } from "@/lib/auth/garage-staff";
import { getOrderIntake } from "@/lib/intake-data";
import { noIndex } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ intakeId: string }> };

const dateTime = new Intl.DateTimeFormat("es-VE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Caracas" });

/** Loads the intake only for admins, the garage's owner/managers or the vehicle's client. */
const loadIntakeDocument = cache(async (intakeId: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: row } = await admin.from("vehicle_intakes").select("order_id").eq("id", intakeId).maybeSingle();
  const { data: order } = row ? await admin.from("orders").select("id, garage_id, vehicle_id").eq("id", row.order_id).maybeSingle() : { data: null };
  if (!order) notFound();
  const [{ data: vehicle }, { data: garage }] = await Promise.all([
    admin.from("vehicles").select("brand, model, year, plate, user_id").eq("id", order.vehicle_id).maybeSingle(),
    admin.from("garages").select("name, address").eq("id", order.garage_id).maybeSingle(),
  ]);
  if (!vehicle) notFound();

  const role = user.app_metadata.role;
  const authorized = role === "admin"
    || ((role === "garage_owner" || role === "garage_manager") && (await getStaffGarage(admin, user))?.garageId === order.garage_id)
    || (role === "client" && vehicle.user_id === user.id);
  if (!authorized) redirect("/unauthorized");

  const [intake, { data: customer }] = await Promise.all([
    getOrderIntake(admin, order.id),
    admin.from("profiles").select("full_name, phone, document_id").eq("id", vehicle.user_id).maybeSingle(),
  ]);
  if (!intake) notFound();

  return {
    intake,
    reference: order.id.slice(0, 8).toUpperCase(),
    vehicleLabel: `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}`,
    garage,
    customer,
  };
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { intakeId } = await params;
  const { reference, vehicleLabel } = await loadIntakeDocument(intakeId);
  // The title is the default file name when saving as PDF.
  return { title: { absolute: `Ingreso ${reference} - ${vehicleLabel}` }, robots: noIndex };
}

export default async function IntakePrintPage({ params }: Params) {
  const { intakeId } = await params;
  const { intake, reference, vehicleLabel, garage, customer } = await loadIntakeDocument(intakeId);

  return (
    <div className="min-h-dvh bg-stone-200 py-6 print:bg-white print:py-0">
      {/* Zero page margin hides the browser's date/URL header and footer; the sheet adds its own padding. */}
      <style>{"@page { size: A4; margin: 0; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }"}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-sm text-stone-600">Elige «Guardar como PDF» como destino.</p>
        <PrintButton auto />
      </div>

      <article className="mx-auto max-w-[210mm] bg-white p-[12mm] text-stone-950 shadow-lg print:max-w-none print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-stone-900 pb-4">
          <div className="flex items-center gap-3">
            <TorkeMark className="size-12" title="TorkeOS" />
            <div>
              <p className="font-display text-2xl font-bold uppercase leading-none">Torke<span className="text-[#ef3f26]">OS</span></p>
              <p className="mt-1 text-xs text-stone-500">Formato de ingreso de vehículo</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">Orden {reference}</p>
            <p className="text-stone-600">{dateTime.format(new Date(intake.createdAt))}</p>
          </div>
        </header>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-xs font-bold uppercase text-stone-500">Cliente</dt><dd className="font-semibold">{customer?.full_name ?? "—"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-stone-500">Taller</dt><dd className="font-semibold">{garage?.name ?? "—"}</dd></div>
          {(customer?.document_id || customer?.phone) && (
            <div><dt className="text-xs font-bold uppercase text-stone-500">Documento / teléfono</dt><dd>{[customer.document_id, customer.phone].filter(Boolean).join(" · ")}</dd></div>
          )}
          {garage?.address && <div><dt className="text-xs font-bold uppercase text-stone-500">Dirección del taller</dt><dd>{garage.address}</dd></div>}
        </dl>

        <div className="mt-5 border-t border-stone-200 pt-5">
          <IntakeDocument intake={intake} vehicleLabel={vehicleLabel} garageName={garage?.name} orderReference={reference} />
        </div>

        <p className="mt-8 border-t border-stone-200 pt-3 text-center text-[10px] text-stone-400">
          Documento generado por TorkeOS · Registro {intake.id}
        </p>
      </article>
    </div>
  );
}
