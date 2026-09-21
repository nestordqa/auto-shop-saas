import { CarFront, RotateCcw, Search, Tags } from "lucide-react";
import Link from "next/link";

import { VehicleCatalogManager } from "@/components/admin/vehicle-catalog-manager";
import { TablePagination } from "@/components/ui/table-pagination";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

const pageSize = 10;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; brand?: string; brandsPage?: string; modelsPage?: string }> }) {
  await requireRole(["admin"]);
  const { q = "", brand = "all", brandsPage = "1", modelsPage = "1" } = await searchParams;
  const supabase = await createClient();
  const [{ data: brandRows }, { data: modelRows }] = await Promise.all([
    supabase.from("vehicle_brands").select("id, name, country_code, is_active").order("name"),
    supabase.from("vehicle_models").select("id, brand_id, name, is_active").order("name"),
  ]);
  const brands = (brandRows ?? []).map((item) => ({ id: item.id, name: String(item.name), countryCode: item.country_code, isActive: item.is_active }));
  const models = (modelRows ?? []).map((item) => ({ id: item.id, brandId: item.brand_id, name: String(item.name), isActive: item.is_active }));
  const normalizedQuery = q.trim().toLocaleLowerCase("es");
  const filteredBrands = brands.filter((item) => !normalizedQuery || item.name.toLocaleLowerCase("es").includes(normalizedQuery));
  const filteredModels = models.filter((item) => (brand === "all" || item.brandId === brand) && (!normalizedQuery || item.name.toLocaleLowerCase("es").includes(normalizedQuery)));
  const brandById = new Map(brands.map((item) => [item.id, item]));
  const currentBrandsPage = clampPage(brandsPage, filteredBrands.length);
  const currentModelsPage = clampPage(modelsPage, filteredModels.length);
  const paginatedBrands = filteredBrands.slice((currentBrandsPage - 1) * pageSize, currentBrandsPage * pageSize);
  const paginatedModels = filteredModels.slice((currentModelsPage - 1) * pageSize, currentModelsPage * pageSize);
  const activeFilters = { ...(q && { q }), ...(brand !== "all" && { brand }) };

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header><p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Catálogo</h1><p className="mt-1 text-sm text-stone-600">Marcas y modelos disponibles para los vehículos.</p></header>
    <section className="mt-6"><VehicleCatalogManager brands={brands} models={models} /></section>
    <form className="mt-5 grid gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px_auto_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={19} /><input name="q" defaultValue={q} placeholder="Buscar marca o modelo" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4" /></div><select name="brand" defaultValue={brand} className="min-h-12 rounded-md border border-stone-300 bg-white px-4"><option value="all">Todas las marcas</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Filtrar</button>{(q || brand !== "all") && <Link href="/dashboard/admin/catalog" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold text-stone-700"><RotateCcw size={18} /> Limpiar</Link>}</form>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <CatalogTable title="Marcas" icon={Tags} headers={["Marca", "País", "Modelos", "Estado"]} rows={paginatedBrands.map((item) => [item.name, item.countryCode ?? "—", String(models.filter((model) => model.brandId === item.id).length), item.isActive ? "Activa" : "Inactiva"])} currentPage={currentBrandsPage} pageParam="brandsPage" searchParams={{ ...activeFilters, ...(modelsPage !== "1" && { modelsPage }) }} totalItems={filteredBrands.length} />
      <CatalogTable title="Modelos" icon={CarFront} headers={["Modelo", "Marca", "Estado"]} rows={paginatedModels.map((item) => [item.name, brandById.get(item.brandId)?.name ?? "—", item.isActive ? "Activo" : "Inactivo"])} currentPage={currentModelsPage} pageParam="modelsPage" searchParams={{ ...activeFilters, ...(brandsPage !== "1" && { brandsPage }) }} totalItems={filteredModels.length} />
    </div>
  </div>;
}

function clampPage(page: string, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
}

function CatalogTable({ title, icon: Icon, headers, rows, currentPage, pageParam, searchParams, totalItems }: { title: string; icon: typeof Tags; headers: string[]; rows: string[][]; currentPage: number; pageParam: string; searchParams: Record<string, string>; totalItems: number }) {
  return <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-stone-200 p-4"><Icon size={19} /><h2 className="font-bold">{title}</h2><span className="ml-auto rounded-sm bg-stone-100 px-2 py-1 text-xs font-bold">{totalItems}</span></div><div className="overflow-x-auto"><table className="min-w-130 w-full text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr>{headers.map((header) => <th key={header} className="p-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-stone-100">{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={`p-3 ${cellIndex === 0 ? "font-bold" : ""}`}>{cell}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="p-6 text-center text-stone-500">Sin resultados.</p>}</div><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/admin/catalog" searchParams={searchParams} totalItems={totalItems} pageParam={pageParam} /></section>;
}