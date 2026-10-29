import type { Metadata } from "next";

import { ClientVehicleCreate } from "@/components/client/client-vehicle-create";
import { EmptyState, PortalHero, SectionHeading, VehicleLinks } from "@/components/client/client-portal";
import { requireRole } from "@/lib/auth/require-role";
import { loadClientPortal } from "@/lib/client-portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis vehículos" };

export default async function ClientVehiclesPage() {
  const user = await requireRole(["client"]);
  const dataClient = createAdminClient() ?? await createClient();
  const [{ vehicles }, { data: brands }, { data: models }] = await Promise.all([
    loadClientPortal(user.id),
    dataClient.from("vehicle_brands").select("id, name").eq("is_active", true).order("name"),
    dataClient.from("vehicle_models").select("id, brand_id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <PortalHero compact eyebrow="Garaje personal" title="Mis vehículos" subtitle="Consulta la historia de servicio de cada vehículo." />

      <section className="py-6">
        <SectionHeading title="Vehículos registrados" count={vehicles.length}>
          <ClientVehicleCreate
            brands={(brands ?? []).map((brand) => ({ id: brand.id, name: String(brand.name) }))}
            models={(models ?? []).map((model) => ({ id: model.id, brandId: model.brand_id, name: String(model.name) }))}
          />
        </SectionHeading>
        <div className="mt-4">
          {vehicles.length ? <VehicleLinks vehicles={vehicles} /> : <EmptyState>Aún no has registrado vehículos.</EmptyState>}
        </div>
      </section>
    </div>
  );
}
