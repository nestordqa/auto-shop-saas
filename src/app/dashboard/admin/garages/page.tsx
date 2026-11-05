import { Building2, ClipboardList, MapPin, RotateCcw, Search, Users } from "lucide-react";
import Link from "next/link";

import { GarageBranchesButton } from "@/components/admin/garage-branches-button";
import { GarageCreateModal } from "@/components/admin/garage-create-modal";
import { RequirementsShareModal } from "@/components/admin/requirements-share-modal";
import { getLocationOptions } from "@/lib/locations-data";
import { getSpecialties } from "@/lib/specialties-data";
import { createAdminClient as createSpecialtiesClient } from "@/lib/supabase/admin";
import { GarageDeleteButton } from "@/components/admin/garage-delete-button";
import { FollowUpButton } from "@/components/admin/follow-up-button";
import { GarageLinkShare } from "@/components/admin/garage-link-share";
import { TablePagination } from "@/components/ui/table-pagination";
import { requireRole } from "@/lib/auth/require-role";
import { getBranchesByGarage } from "@/lib/branches";
import { siteUrl } from "@/lib/seo";
import { PROSPECT_STATUS_LABELS, type ProspectStatus } from "@/lib/prospects";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const pageSize = 10;

export default async function GaragesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireRole(["admin"]);
  const { q = "", page = "1" } = await searchParams;
  const supabase = createAdminClient() ?? await createClient();
  let garagesQuery = supabase.from("garages").select("id, name, slug, address, map_location, specialty, owner_id, created_at, legal_name, legal_id, seller_id, signup_source").order("created_at", { ascending: false });
  if (q.trim()) garagesQuery = garagesQuery.or(`name.ilike.%${q.trim()}%,address.ilike.%${q.trim()}%`);
  const [garagesResult, profilesResult, mechanicsResult, ordersResult, staffMechanicsResult, staffManagersResult, prospectsResult, sellersResult] = await Promise.all([
    garagesQuery,
    supabase.from("profiles").select("id, full_name, phone, document_id, role").in("role", ["garage_owner"]),
    supabase.from("mechanics").select("id, garage_id").eq("is_active", true),
    supabase.from("orders").select("id, garage_id, status"),
    supabase.from("mechanics").select("garage_id"),
    supabase.from("garage_managers").select("garage_id"),
    supabase.from("garage_prospects").select("id, name, contact_name, phone, email, address, map_location, specialty, city, status").is("seller_id", null).not("status", "in", "(won,lost)").order("updated_at", { ascending: false }),
    supabase.from("sellers").select("id, first_name, last_name, is_active").order("first_name"),
  ]);
  const sellers = (sellersResult.data ?? []).map((seller) => ({ id: seller.id as string, name: `${seller.first_name} ${seller.last_name}`, isActive: seller.is_active as boolean }));
  const sellerNameById = new Map(sellers.map((seller) => [seller.id, seller.name]));
  const originLabel = (garage: { seller_id?: string | null; signup_source?: string | null }) => garage.seller_id ? `Vía ${sellerNameById.get(garage.seller_id) ?? "vendedor"}${garage.signup_source === "self" ? " (cupón)" : ""}` : garage.signup_source === "self" ? "Registro directo" : null;
  const prospects = (prospectsResult.data ?? []).map((prospect) => ({ id: prospect.id, name: prospect.name, contactName: prospect.contact_name, phone: prospect.phone, email: prospect.email, address: prospect.address, mapLocation: prospect.map_location, specialty: prospect.specialty, city: prospect.city, statusLabel: PROSPECT_STATUS_LABELS[prospect.status as ProspectStatus] }));
  const staffCount = (garageId: string) =>
    [...(staffMechanicsResult.data ?? []), ...(staffManagersResult.data ?? [])].filter((item) => item.garage_id === garageId).length;
  const garages = garagesResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const assignedOwnerIds = new Set(garages.map((garage) => garage.owner_id));
  const owners = profiles.filter((profile) => !assignedOwnerIds.has(profile.id)).map((profile) => ({ id: profile.id, fullName: profile.full_name, documentId: profile.document_id }));
  const ownerById = new Map(profiles.map((profile) => [profile.id, profile]));
  const mechanics = mechanicsResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const openOrders = orders.filter((order) => order.status !== "entregado");
  const totalPages = Math.max(1, Math.ceil(garages.length / pageSize));
  const currentPage = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
  const paginatedGarages = garages.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const branchesByGarage = await getBranchesByGarage(supabase, paginatedGarages.map((garage) => garage.id));

  const [specialtyRows, states] = await Promise.all([getSpecialties(createSpecialtiesClient()), getLocationOptions(supabase)]);
  const specialties = specialtyRows.map(({ key, label }) => ({ key, label }));
  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Talleres</h1><p className="mt-1 text-sm text-stone-600">Sedes, responsables y carga operativa.</p></div><div className="flex flex-wrap gap-2"><RequirementsShareModal /><GarageCreateModal owners={owners} prospects={prospects} specialties={specialties} sellers={sellers.filter((seller) => seller.isActive)} states={states} /></div></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Talleres" value={garages.length} icon={Building2} /><Metric label="Mecánicos activos" value={mechanics.length} icon={Users} /><Metric label="Órdenes abiertas" value={openOrders.length} icon={ClipboardList} /></section>
    <form className="mt-5 grid gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto_auto]"><div className="relative min-w-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={19} /><input name="q" defaultValue={q} placeholder="Buscar por nombre o dirección" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4" /></div><button className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Buscar</button>{q && <Link href="/dashboard/admin/garages" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold text-stone-700"><RotateCcw size={18} /> Limpiar</Link>}</form>
    <div className="mt-4 grid gap-3 md:hidden">{paginatedGarages.map((garage) => { const owner = ownerById.get(garage.owner_id); return <article key={garage.id} className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="font-bold break-words">{garage.name}</p>{garage.legal_name && <p className="text-xs text-stone-600">{garage.legal_name}{garage.legal_id ? ` · ${garage.legal_id}` : ""}</p>}{garage.specialty && <p className="text-xs font-semibold text-[#d9341d]">{garage.specialty}</p>}{originLabel(garage) && <p className="mt-1 inline-block rounded-sm bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">{originLabel(garage)}</p>}
      <p className="mt-1 flex items-start gap-1 text-xs text-stone-500"><MapPin size={13} className="mt-0.5 shrink-0" /> <span className="break-words">{garage.address}</span></p>
      {(branchesByGarage.get(garage.id)?.length ?? 0) > 1 && <p className="mt-1 text-xs font-semibold text-stone-600">{branchesByGarage.get(garage.id)!.length} sucursales</p>}
      <p className="mt-2 text-sm"><span className="font-semibold">{owner?.full_name ?? "Sin administrador"}</span> <span className="text-stone-500">· {owner?.phone ?? "Sin teléfono"}</span></p>
      <p className="mt-1 text-xs text-stone-500">{mechanics.filter((item) => item.garage_id === garage.id).length} mecánicos · {openOrders.filter((order) => order.garage_id === garage.id).length} órdenes abiertas</p>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-stone-100 pt-2"><GarageBranchesButton garage={{ id: garage.id, name: garage.name }} branches={branchesByGarage.get(garage.id) ?? []} bookingBase={`${siteUrl}/${garage.slug}`} /><FollowUpButton name={garage.name} phone={owner?.phone ?? null} values={{ owner: owner?.full_name?.split(" ")[0], taller: garage.name }} templates={[{ key: "garage_follow_up_local", label: "En Mérida" }, { key: "garage_follow_up_remote", label: "Fuera de Mérida" }]} initialIndex={/m[eé]rida/i.test(garage.address ?? "") ? 0 : 1} /><GarageLinkShare name={garage.name} slug={garage.slug} ownerPhone={owner?.phone ?? null} /><GarageDeleteButton garage={{ id: garage.id, name: garage.name }} totals={{ orders: orders.filter((order) => order.garage_id === garage.id).length, openOrders: openOrders.filter((order) => order.garage_id === garage.id).length, staff: staffCount(garage.id) }} /></div>
    </article>; })}{!garages.length && <p className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-500">No hay talleres que coincidan con la búsqueda.</p>}<div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/admin/garages" searchParams={{ ...(q && { q }) }} totalItems={garages.length} /></div></div>

    <div className="mt-4 hidden overflow-hidden md:block rounded-lg border border-stone-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Taller</th><th className="p-4">Administrador</th><th className="p-4">Contacto</th><th className="p-4 text-center">Mecánicos</th><th className="p-4 text-center">Órdenes abiertas</th><th className="p-4"><span className="sr-only">Acciones</span></th></tr></thead><tbody className="divide-y divide-stone-100">{paginatedGarages.map((garage) => { const owner = ownerById.get(garage.owner_id); return <tr key={garage.id}><td className="p-4"><p className="font-bold">{garage.name}</p>{garage.legal_name && <p className="text-xs text-stone-600">{garage.legal_name}{garage.legal_id ? ` · ${garage.legal_id}` : ""}</p>}{garage.specialty && <p className="text-xs font-semibold text-[#d9341d]">{garage.specialty}</p>}{originLabel(garage) && <p className="mt-1 inline-block rounded-sm bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">{originLabel(garage)}</p>}<p className="mt-1 flex items-center gap-1 text-xs text-stone-500"><MapPin size={13} /> {garage.address}</p>{(branchesByGarage.get(garage.id)?.length ?? 0) > 1 && <p className="mt-1 text-xs font-semibold text-stone-600">{branchesByGarage.get(garage.id)!.length} sucursales</p>}</td><td className="p-4 font-semibold">{owner?.full_name ?? "Sin administrador"}</td><td className="p-4"><p>{owner?.phone ?? "Sin teléfono"}</p><p className="text-xs text-stone-500">{owner?.document_id ?? "Sin documento"}</p></td><td className="p-4 text-center font-bold">{mechanics.filter((item) => item.garage_id === garage.id).length}</td><td className="p-4 text-center font-bold">{openOrders.filter((order) => order.garage_id === garage.id).length}</td><td className="p-4"><div className="flex items-center justify-end gap-1"><GarageBranchesButton garage={{ id: garage.id, name: garage.name }} branches={branchesByGarage.get(garage.id) ?? []} bookingBase={`${siteUrl}/${garage.slug}`} /><FollowUpButton name={garage.name} phone={owner?.phone ?? null} values={{ owner: owner?.full_name?.split(" ")[0], taller: garage.name }} templates={[{ key: "garage_follow_up_local", label: "En Mérida" }, { key: "garage_follow_up_remote", label: "Fuera de Mérida" }]} initialIndex={/m[eé]rida/i.test(garage.address ?? "") ? 0 : 1} /><GarageLinkShare name={garage.name} slug={garage.slug} ownerPhone={owner?.phone ?? null} /><GarageDeleteButton garage={{ id: garage.id, name: garage.name }} totals={{ orders: orders.filter((order) => order.garage_id === garage.id).length, openOrders: openOrders.filter((order) => order.garage_id === garage.id).length, staff: staffCount(garage.id) }} /></div></td></tr>; })}</tbody></table>{!garages.length && <p className="p-8 text-center text-stone-500">No hay talleres que coincidan con la búsqueda.</p>}</div><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/admin/garages" searchParams={{ ...(q && { q }) }} totalItems={garages.length} /></div>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Building2 }) {
  return <article className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-sm"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p></div><span className="grid size-10 place-items-center rounded-md bg-stone-100"><Icon size={19} /></span></article>;
}