import { RotateCcw, Search, ShieldCheck, UserRound, Users, Wrench } from "lucide-react";
import Link from "next/link";

import { TablePagination } from "@/components/ui/table-pagination";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/domain";

const roleLabels: Record<AppRole, string> = { admin: "Admin", garage_owner: "Owner", mechanic: "Mecánico", client: "Cliente" };
const pageSize = 10;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  await requireRole(["admin"]);
  const { q = "", role = "all", page = "1" } = await searchParams;
  const admin = createAdminClient();
  const supabase = admin ?? await createClient();
  const [{ data: profiles }, authResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, phone_2, document_id, role, created_at").order("created_at", { ascending: false }),
    admin ? admin.auth.admin.listUsers({ page: 1, perPage: 1000 }) : Promise.resolve({ data: { users: [] }, error: null }),
  ]);
  const authById = new Map(authResult.data.users.map((user) => [user.id, user]));
  const normalizedQuery = q.trim().toLocaleLowerCase("es");
  const allProfiles = profiles ?? [];
  const filteredProfiles = allProfiles.filter((profile) => {
    const authUser = authById.get(profile.id);
    const matchesRole = role === "all" || profile.role === role;
    const searchable = [profile.full_name, profile.phone, profile.document_id, authUser?.email].filter(Boolean).join(" ").toLocaleLowerCase("es");
    return matchesRole && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / pageSize));
  const currentPage = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
  const paginatedProfiles = filteredProfiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const roleCount = (target: AppRole) => allProfiles.filter((profile) => profile.role === target).length;

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header><p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Usuarios</h1><p className="mt-1 text-sm text-stone-600">Identidad, roles y actividad de acceso.</p></header>
    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Admins" value={roleCount("admin")} icon={ShieldCheck} /><Metric label="Owners" value={roleCount("garage_owner")} icon={Users} /><Metric label="Mecánicos" value={roleCount("mechanic")} icon={Wrench} /><Metric label="Clientes" value={roleCount("client")} icon={UserRound} /></section>
    {!admin && <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Configura SUPABASE_SECRET_KEY para consultar correo y último acceso.</p>}
    <form className="mt-5 grid gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_180px_auto_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={19} /><input name="q" defaultValue={q} placeholder="Nombre, correo, teléfono o documento" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4" /></div><select name="role" defaultValue={role} className="min-h-12 rounded-md border border-stone-300 bg-white px-4"><option value="all">Todos los roles</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Filtrar</button>{(q || role !== "all") && <Link href="/dashboard/admin/users" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold text-stone-700"><RotateCcw size={18} /> Limpiar</Link>}</form>
    <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Usuario</th><th className="p-4">Rol</th><th className="p-4">Contacto</th><th className="p-4">Documento</th><th className="p-4">Último acceso</th><th className="p-4">Alta</th></tr></thead><tbody className="divide-y divide-stone-100">{paginatedProfiles.map((profile) => { const authUser = authById.get(profile.id); return <tr key={profile.id}><td className="p-4"><p className="font-bold">{profile.full_name}</p><p className="text-xs text-stone-500">{authUser?.email ?? "Correo no disponible"}</p></td><td className="p-4"><span className="rounded-sm bg-stone-100 px-2 py-1 text-xs font-bold">{roleLabels[profile.role as AppRole]}</span></td><td className="p-4"><p>{profile.phone ?? "Sin teléfono"}</p>{profile.phone_2 && <p className="text-xs text-stone-500">{profile.phone_2}</p>}</td><td className="p-4">{profile.document_id ?? "—"}</td><td className="p-4">{authUser?.last_sign_in_at ? new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(authUser.last_sign_in_at)) : "Nunca"}</td><td className="p-4">{new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(profile.created_at))}</td></tr>; })}</tbody></table>{!filteredProfiles.length && <p className="p-8 text-center text-stone-500">No hay usuarios que coincidan con los filtros.</p>}</div><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/admin/users" searchParams={{ ...(q && { q }), ...(role !== "all" && { role }) }} totalItems={filteredProfiles.length} /></div>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return <article className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 shadow-sm"><div><p className="text-xs text-stone-500 sm:text-sm">{label}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p></div><Icon className="text-stone-400" size={20} /></article>;
}