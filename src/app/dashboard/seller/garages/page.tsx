import { SellerGarageCreateModal } from "@/components/sellers/seller-garage-create-modal";
import { SellerGaragesTable } from "@/components/sellers/seller-garages-table";
import { requireSeller } from "@/lib/auth/require-seller";
import { getLocationOptions } from "@/lib/locations-data";
import { loadSellerStats } from "@/lib/sellers";
import { getSpecialties } from "@/lib/specialties-data";

export default async function SellerGaragesPage() {
  const { admin, seller } = await requireSeller();
  const [stats, specialtyRows, { data: prospectRows }, states] = await Promise.all([
    loadSellerStats(admin, [seller]),
    getSpecialties(admin),
    admin.from("garage_prospects").select("id, name, contact_name, phone, email, address, map_location, specialty, city").eq("seller_id", seller.id).not("status", "in", "(won,lost)").order("updated_at", { ascending: false }),
    getLocationOptions(admin),
  ]);
  const garages = stats.get(seller.id)!.garages;
  const specialties = specialtyRows.map(({ key, label }) => ({ key, label }));
  const prospects = (prospectRows ?? []).map((row) => ({ id: row.id, name: row.name, contactName: row.contact_name, phone: row.phone, email: row.email, address: row.address, mapLocation: row.map_location, specialty: row.specialty, city: row.city }));

  return <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#d9341d]">Panel de vendedor</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Mis talleres</h1><p className="mt-1 text-sm text-stone-600">Talleres que creaste o que se registraron con tu cupón.</p></div><SellerGarageCreateModal specialties={specialties} prospects={prospects} states={states} /></header>
    <section className="mt-6 rounded-lg border border-stone-200 bg-white shadow-sm"><SellerGaragesTable garages={garages} /></section>
  </div>;
}
