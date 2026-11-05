import { AlarmClock, Globe, MapPin, RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { ProspectFormModal } from "@/components/admin/prospect-form-modal";
import { FollowUpButton } from "@/components/admin/follow-up-button";
import { PitchTemplatesEditor, ProspectPitchButton } from "@/components/admin/prospect-pitch";
import { ProspectRowActions, ProspectStatusSelect } from "@/components/admin/prospect-row-actions";
import { TablePagination } from "@/components/ui/table-pagination";
import { requireRole } from "@/lib/auth/require-role";
import { formatDate, todayDate } from "@/lib/contracts";
import { PROSPECT_COLUMNS, PROSPECT_STATUS_LABELS, PROSPECT_STATUS_STYLES, PROSPECT_STATUSES, socialUrl, websiteUrl, type Prospect } from "@/lib/prospects";
import { DEFAULT_PITCHES, pitchKeyFor, type PitchKey } from "@/lib/prospect-pitch";
import { createAdminClient } from "@/lib/supabase/admin";

const pageSize = 15;
const OPEN_STATUSES = new Set(["new", "contacted", "interested", "requirements_sent", "negotiating"]);

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; loc?: string }> }) {
  await requireRole(["admin"]);
  const { q = "", status = "open", page = "1", loc = "all" } = await searchParams;
  const admin = createAdminClient();
  if (!admin) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Prospectos</h1><p className="mt-2 text-stone-600">Configura SUPABASE_SECRET_KEY para gestionar prospectos.</p></div>;

  const [{ data, error }, { data: templateRows }] = await Promise.all([
    admin.from("garage_prospects").select(PROSPECT_COLUMNS).is("seller_id", null).order("created_at", { ascending: false }),
    admin.from("admin_message_templates").select("key, body"),
  ]);
  // Saved pitch templates override the built-in text.
  const templates = { ...DEFAULT_PITCHES, ...Object.fromEntries((templateRows ?? []).filter((row) => row.key in DEFAULT_PITCHES).map((row) => [row.key, row.body as string])) } as Record<PitchKey, string>;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Prospectos</h1><p className="mt-2 text-stone-600">No se pudieron cargar los prospectos. ¿Ejecutaste las migraciones 025, 030 y 042?</p></div>;
  const prospects = (data ?? []) as Prospect[];
  const today = todayDate();
  const query = q.trim().toLocaleLowerCase("es");
  const filtered = prospects
    .filter((prospect) => status === "all" || (status === "open" ? OPEN_STATUSES.has(prospect.status) : status === "due" ? OPEN_STATUSES.has(prospect.status) && prospect.next_follow_up !== null && prospect.next_follow_up <= today : prospect.status === status))
    .filter((prospect) => loc === "all" || prospect.is_local === (loc === "local"))
    .filter((prospect) => !query || [prospect.name, prospect.contact_name, prospect.phone, prospect.city, prospect.instagram].filter(Boolean).join(" ").toLocaleLowerCase("es").includes(query));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const count = (target: string) => prospects.filter((prospect) => prospect.status === target).length;
  const due = prospects.filter((prospect) => OPEN_STATUSES.has(prospect.status) && prospect.next_follow_up && prospect.next_follow_up <= today).length;
  const closed = count("won") + count("lost");
  const filterHref = (value: string) => `/dashboard/admin/prospects?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}${loc !== "all" ? `&loc=${loc}` : ""}`;

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Prospectos</h1><p className="mt-1 text-sm text-stone-600">Talleres con los que estamos conversando antes de darlos de alta.</p></div><ProspectFormModal /></header>

    <section className="mt-6 flex gap-2 overflow-x-auto pb-1">
      {PROSPECT_STATUSES.map((value) => <Link key={value} href={filterHref(value)} className={`flex min-w-32 shrink-0 flex-col rounded-lg border bg-white p-3 shadow-sm ${status === value ? "border-stone-900" : "border-stone-200"}`}><span className={`self-start rounded-sm px-2 py-0.5 text-xs font-bold ${PROSPECT_STATUS_STYLES[value]}`}>{PROSPECT_STATUS_LABELS[value]}</span><span className="mt-2 font-display text-2xl font-bold">{count(value)}</span></Link>)}
    </section>
    <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-600">
      <span>Conversión: <strong>{closed ? Math.round(count("won") / closed * 100) : 0}%</strong> de los cerrados</span>
      {due > 0 && <Link href={filterHref("due")} className="flex items-center gap-1 font-bold text-[#d9341d] hover:underline"><AlarmClock size={15} /> {due} seguimiento(s) para hoy o atrasados</Link>}
    </div>

    <PitchTemplatesEditor templates={templates} />
    <form className="mt-4 grid grid-cols-1 gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_200px_180px_auto_auto]"><div className="relative min-w-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={19} /><input name="q" defaultValue={q} placeholder="Taller, contacto, teléfono, ciudad o Instagram" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4" /></div><select name="status" defaultValue={status} className="min-h-12 rounded-md border border-stone-300 bg-white px-4"><option value="open">En proceso</option><option value="due">Seguimiento pendiente</option><option value="all">Todos</option>{PROSPECT_STATUSES.map((value) => <option key={value} value={value}>{PROSPECT_STATUS_LABELS[value]}</option>)}</select><select name="loc" defaultValue={loc} className="min-h-12 rounded-md border border-stone-300 bg-white px-4"><option value="all">Toda ubicación</option><option value="local">En Mérida</option><option value="remote">Fuera de Mérida</option></select><button className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Filtrar</button>{(q || status !== "open" || loc !== "all") && <Link href="/dashboard/admin/prospects" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold text-stone-700"><RotateCcw size={18} /> Limpiar</Link>}</form>

    <div className="mt-4 grid gap-3 md:hidden">{paginated.map((prospect) => {
      const overdue = OPEN_STATUSES.has(prospect.status) && prospect.next_follow_up && prospect.next_follow_up <= today;
      return <article key={prospect.id} className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold break-words">{prospect.name}</p>{prospect.specialty && <p className="text-xs font-semibold text-[#d9341d]">{prospect.specialty}</p>}</div><span className={`shrink-0 rounded-sm px-2 py-0.5 text-xs font-bold ${prospect.is_local ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>{prospect.is_local ? "Mérida" : "Fuera de Mérida"}</span></div>
        {(prospect.city || prospect.address) && <p className="mt-1 flex items-center gap-1 text-xs text-stone-500"><MapPin size={13} className="shrink-0" /> <span className="break-words">{[prospect.city, prospect.address].filter(Boolean).join(" · ")}</span></p>}
        <p className="mt-2 text-sm"><span className="font-semibold">{prospect.contact_name ?? "—"}</span> <span className="text-stone-500">· {prospect.phone ?? "Sin teléfono"}</span></p>
        {prospect.email && <p className="break-all text-xs text-stone-500">{prospect.email}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">{prospect.instagram && <a href={socialUrl("instagram", prospect.instagram)} target="_blank" rel="noreferrer" className="rounded-sm bg-pink-50 px-2 py-1 text-pink-700">Instagram</a>}{prospect.facebook && <a href={socialUrl("facebook", prospect.facebook)} target="_blank" rel="noreferrer" className="rounded-sm bg-blue-50 px-2 py-1 text-blue-700">Facebook</a>}{prospect.tiktok && <a href={socialUrl("tiktok", prospect.tiktok)} target="_blank" rel="noreferrer" className="rounded-sm bg-stone-100 px-2 py-1 text-stone-800">TikTok</a>}{prospect.website && <a href={websiteUrl(prospect.website)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-sm bg-stone-100 px-2 py-1 text-stone-800"><Globe size={12} /> Web</a>}{prospect.map_location && <a href={prospect.map_location} target="_blank" rel="noreferrer" className="rounded-sm bg-emerald-50 px-2 py-1 text-emerald-700">Mapa</a>}{prospect.source && <span className="px-1 py-1 font-normal text-stone-500">Vía {prospect.source}</span>}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><ProspectStatusSelect id={prospect.id} status={prospect.status} /><span className={`text-xs ${overdue ? "font-bold text-[#d9341d]" : "text-stone-500"}`}>Seguimiento: {prospect.next_follow_up ? formatDate(prospect.next_follow_up) : "—"}</span></div>
        {prospect.status === "lost" && prospect.lost_reason && <p className="mt-1 text-xs text-stone-500">{prospect.lost_reason}</p>}
        {prospect.status === "won" && prospect.garage_id && <Link href="/dashboard/admin/garages" className="mt-1 block text-xs font-bold text-emerald-700">Ver taller</Link>}
        {prospect.notes && <p className="mt-2 whitespace-pre-line break-words rounded-md bg-stone-50 p-2 text-xs text-stone-600">{prospect.notes}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-stone-100 pt-2"><ProspectPitchButton id={prospect.id} name={prospect.name} contactName={prospect.contact_name} phone={prospect.phone} status={prospect.status} isLocal={prospect.is_local} template={templates[pitchKeyFor(prospect.is_local)]} /><FollowUpButton name={prospect.name} phone={prospect.phone} values={{ contacto: prospect.contact_name, taller: prospect.name }} templates={[{ key: "prospect_follow_up", label: "Seguimiento" }]} /><ProspectRowActions id={prospect.id} name={prospect.name} contactName={prospect.contact_name} phone={prospect.phone} status={prospect.status} /><ProspectFormModal prospect={prospect} /></div>
      </article>;
    })}{!filtered.length && <p className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-500">{prospects.length ? "No hay prospectos que coincidan con los filtros." : "Aún no tienes prospectos. Agrega el primero."}</p>}<div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/admin/prospects" searchParams={{ ...(q && { q }), ...(status !== "open" && { status }), ...(loc !== "all" && { loc }) }} totalItems={filtered.length} /></div></div>

    <div className="mt-4 hidden overflow-hidden md:block rounded-lg border border-stone-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-250 text-left text-sm"><thead className="bg-stone-100 text-xs uppercase text-stone-500"><tr><th className="p-4">Taller</th><th className="p-4">Contacto</th><th className="p-4">Redes</th><th className="p-4">Estado</th><th className="p-4">Próximo seguimiento</th><th className="p-4"><span className="sr-only">Acciones</span></th></tr></thead><tbody className="divide-y divide-stone-100">{paginated.map((prospect) => {
      const overdue = OPEN_STATUSES.has(prospect.status) && prospect.next_follow_up && prospect.next_follow_up <= today;
      return <tr key={prospect.id} className="align-top">
        <td className="p-4"><p className="font-bold">{prospect.name}</p>{prospect.specialty && <p className="text-xs font-semibold text-[#d9341d]">{prospect.specialty}</p>}<span className={`mt-1 inline-block rounded-sm px-2 py-0.5 text-xs font-bold ${prospect.is_local ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>{prospect.is_local ? "Mérida" : "Fuera de Mérida"}</span>{(prospect.city || prospect.address) && <p className="mt-1 flex items-center gap-1 text-xs text-stone-500"><MapPin size={13} /> {[prospect.city, prospect.address].filter(Boolean).join(" · ")}</p>}{prospect.source && <p className="mt-1 text-xs text-stone-500">Vía {prospect.source}</p>}</td>
        <td className="p-4"><p className="font-semibold">{prospect.contact_name ?? "—"}</p><p className="text-xs text-stone-500">{prospect.phone ?? "Sin teléfono"}</p>{prospect.email && <p className="text-xs text-stone-500">{prospect.email}</p>}</td>
        <td className="p-4"><div className="flex flex-wrap gap-1.5 text-xs font-bold">{prospect.instagram && <a href={socialUrl("instagram", prospect.instagram)} target="_blank" rel="noreferrer" className="rounded-sm bg-pink-50 px-2 py-1 text-pink-700 hover:underline">Instagram</a>}{prospect.facebook && <a href={socialUrl("facebook", prospect.facebook)} target="_blank" rel="noreferrer" className="rounded-sm bg-blue-50 px-2 py-1 text-blue-700 hover:underline">Facebook</a>}{prospect.tiktok && <a href={socialUrl("tiktok", prospect.tiktok)} target="_blank" rel="noreferrer" className="rounded-sm bg-stone-100 px-2 py-1 text-stone-800 hover:underline">TikTok</a>}{prospect.website && <a href={websiteUrl(prospect.website)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-sm bg-stone-100 px-2 py-1 text-stone-800 hover:underline"><Globe size={12} /> Web</a>}{prospect.map_location && <a href={prospect.map_location} target="_blank" rel="noreferrer" className="rounded-sm bg-emerald-50 px-2 py-1 text-emerald-700 hover:underline">Mapa</a>}</div></td>
        <td className="p-4"><ProspectStatusSelect id={prospect.id} status={prospect.status} />{prospect.status === "lost" && prospect.lost_reason && <p className="mt-1 max-w-48 text-xs text-stone-500">{prospect.lost_reason}</p>}{prospect.status === "won" && prospect.garage_id && <Link href="/dashboard/admin/garages" className="mt-1 block text-xs font-bold text-emerald-700 hover:underline">Ver taller</Link>}{prospect.notes && <p className="mt-1 max-w-64 whitespace-pre-line break-words text-xs text-stone-500">{prospect.notes}</p>}</td>
        <td className={`p-4 ${overdue ? "font-bold text-[#d9341d]" : ""}`}>{prospect.next_follow_up ? formatDate(prospect.next_follow_up) : "—"}</td>
        <td className="p-4"><div className="flex items-center justify-end gap-1"><ProspectPitchButton id={prospect.id} name={prospect.name} contactName={prospect.contact_name} phone={prospect.phone} status={prospect.status} isLocal={prospect.is_local} template={templates[pitchKeyFor(prospect.is_local)]} /><FollowUpButton name={prospect.name} phone={prospect.phone} values={{ contacto: prospect.contact_name, taller: prospect.name }} templates={[{ key: "prospect_follow_up", label: "Seguimiento" }]} /><ProspectRowActions id={prospect.id} name={prospect.name} contactName={prospect.contact_name} phone={prospect.phone} status={prospect.status} /><ProspectFormModal prospect={prospect} /></div></td>
      </tr>;
    })}</tbody></table>{!filtered.length && <p className="p-8 text-center text-stone-500">{prospects.length ? "No hay prospectos que coincidan con los filtros." : "Aún no tienes prospectos. Agrega el primero."}</p>}</div><TablePagination currentPage={currentPage} pageSize={pageSize} pathname="/dashboard/admin/prospects" searchParams={{ ...(q && { q }), ...(status !== "open" && { status }), ...(loc !== "all" && { loc }) }} totalItems={filtered.length} /></div>
  </div>;
}
