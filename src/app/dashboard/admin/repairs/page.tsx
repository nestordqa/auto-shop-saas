import { RepairCatalogManager, type CatalogSpecialty } from "@/components/admin/repair-catalog-manager";
import { getSpecialties } from "@/lib/specialties-data";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminRepairsPage() {
  const admin = createAdminClient();
  const [specialties, { data: repairs, error }] = await Promise.all([
    getSpecialties(admin, { includeInactive: true }),
    admin ? admin.from("repair_catalog").select("key, label, system, specialty, is_active, sort_order").order("sort_order") : Promise.resolve({ data: [], error: null }),
  ]);
  const catalog: CatalogSpecialty[] = specialties.map((specialty) => ({
    ...specialty,
    repairs: (repairs ?? []).filter((repair) => repair.specialty === specialty.key).map((repair) => ({ key: repair.key, label: repair.label, system: repair.system, isActive: repair.is_active })),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Especialidades y reparaciones</h1>
      <p className="mt-1 text-sm text-stone-600">Lo que eligen los talleres como especialidad y las reparaciones que ven sus mecánicos al diagnosticar.</p>
      {error && <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">No se pudo leer el catálogo. Ejecuta las migraciones 035 y 036.</p>}
      <div className="mt-6"><RepairCatalogManager specialties={catalog} /></div>
    </div>
  );
}
