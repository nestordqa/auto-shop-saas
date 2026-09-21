import { RotateCcw, Search, UserCheck, Users, UserX } from "lucide-react";
import Link from "next/link";

import { TeamManager } from "@/components/owner/team-manager";
import { TablePagination } from "@/components/ui/table-pagination";
import { requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import type { MechanicSpecialty } from "@/lib/mechanics";

const pageSize = 10;

export default async function OwnerTeamPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { garage, dataClient } = await requireOwnerGarage();
  const { q = "", page = "1" } = await searchParams;
  if (!garage) return <MissingGarage />;

  const { data: mechanicRows } = await dataClient.from("mechanics").select("id, profile_id, specialty, is_active").eq("garage_id", garage.id).order("created_at", { ascending: false });
  const profileIds = (mechanicRows ?? []).map((row) => row.profile_id);
  const { data: profiles } = profileIds.length ? await dataClient.from("profiles").select("id, full_name, phone, document_id").in("id", profileIds) : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const mechanics = (mechanicRows ?? []).map((mechanic) => {
    const profile = profileById.get(mechanic.profile_id);
    return { id: mechanic.id, fullName: profile?.full_name ?? "Mecánico", phone: profile?.phone ?? null, documentId: profile?.document_id ?? null, specialty: mechanic.specialty as MechanicSpecialty, isActive: mechanic.is_active };
  });
  const normalizedQuery = q.trim().toLocaleLowerCase("es");
  const filtered = mechanics.filter((mechanic) => !normalizedQuery || `${mechanic.fullName} ${mechanic.phone ?? ""} ${mechanic.documentId ?? ""}`.toLocaleLowerCase("es").includes(normalizedQuery));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8"><header><p className="text-xs font-bold uppercase text-[#d9341d]">{garage.name}</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Equipo</h1><p className="mt-1 text-sm text-stone-600">Mecánicos, especialidades y disponibilidad.</p></header><section className="mt-6 grid grid-cols-3 gap-3"><Metric label="Total" value={mechanics.length} icon={Users} /><Metric label="Activos" value={mechanics.filter((item) => item.isActive).length} icon={UserCheck} /><Metric label="Inactivos" value={mechanics.filter((item) => !item.isActive).length} icon={UserX} /></section><form className="mt-5 flex gap-2 rounded-lg border border-stone-200 bg-white p-3"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={19} /><input name="q" defaultValue={q} placeholder="Buscar mecánico" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4" /></div><button className="rounded-md bg-stone-900 px-5 font-bold text-white">Buscar</button>{q && <Link href="/dashboard/owner/team" aria-label="Limpiar búsqueda" className="grid min-h-12 place-items-center rounded-md border border-stone-300 px-4"><RotateCcw size={18} /></Link>}</form><div className="mt-4"><TeamManager mechanics={paginated} /><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/owner/team" searchParams={{ ...(q && { q }) }} totalItems={filtered.length} /></div></div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) { return <article className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4"><div><p className="text-xs text-stone-500">{label}</p><p className="text-3xl font-bold">{value}</p></div><Icon className="text-stone-400" size={20} /></article>; }
function MissingGarage() { return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Taller no asignado</h1><p className="mt-2 text-stone-600">La cuenta autenticada no coincide con el owner configurado para un taller.</p></div>; }