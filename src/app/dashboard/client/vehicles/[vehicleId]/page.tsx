import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { VehicleHistoryPanel } from "@/components/history/vehicle-history-panel";
import { IntakeSummary } from "@/components/intake/intake-summary";
import { requireRole } from "@/lib/auth/require-role";
import { getOrderIntakes } from "@/lib/intake-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getVehicleHistory } from "@/lib/vehicle-history";

export const metadata: Metadata = { title: "Historia del vehículo" };

export default async function ClientVehiclePage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  if (!z.uuid().safeParse(vehicleId).success) notFound();
  const user = await requireRole(["client"]);
  const dataClient = createAdminClient() ?? await createClient();
  const { data: vehicle } = await dataClient.from("vehicles").select("id, brand, model, year, plate").eq("id", vehicleId).eq("user_id", user.id).maybeSingle();
  if (!vehicle) notFound();

  const history = await getVehicleHistory(dataClient, vehicle.id, { client: true });
  const intakes = await getOrderIntakes(dataClient, history.visits.map((visit) => visit.orderId));
  const vehicleLabel = `${vehicle.brand} ${vehicle.model} ${vehicle.year} · ${vehicle.plate}`;
  const latestMileage = history.visits.find((visit) => visit.mileage != null)?.mileage ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/dashboard/client#vehicles" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"><ArrowLeft size={18} /> Mis vehículos</Link>
      <header className="my-6">
        <p className="text-xs font-bold uppercase text-[#d9341d]">Historia del vehículo</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{vehicleLabel}</h1>
        <p className="mt-1 text-sm text-stone-600">Todos los servicios, diagnósticos y formatos de ingreso de tu vehículo en los talleres TorkeOS.</p>
      </header>
      <VehicleHistoryPanel history={history} currentMileage={latestMileage} showHints={false} title="Historial de servicios" />
      {history.visits.map((visit) => {
        const intake = intakes.get(visit.orderId);
        return intake ? (
          <IntakeSummary key={visit.orderId} intake={intake} vehicleLabel={vehicleLabel} garageName={visit.garageName} orderReference={visit.orderId.slice(0, 8).toUpperCase()} />
        ) : null;
      })}
    </div>
  );
}
