import { MapPin, RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { ProspectFormModal } from "@/components/admin/prospect-form-modal";
import { ProspectRowActions, ProspectStatusSelect } from "@/components/admin/prospect-row-actions";
import { requireSeller } from "@/lib/auth/require-seller";
import { formatDate, todayDate } from "@/lib/contracts";
import { PROSPECT_COLUMNS, PROSPECT_STATUS_LABELS, PROSPECT_STATUS_STYLES, PROSPECT_STATUSES, socialUrl, type Prospect } from "@/lib/prospects";

const API = "/api/seller/prospects";
const OPEN_STATUSES = new Set(["new", "contacted", "interested", "requirements_sent", "negotiating"]);

/** The seller's own prospects only (filtered by seller id on the server). */
export default async function SellerProspectsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { admin, seller } = await requireSeller();
  const { q = "", status = "open" } = await searchParams;
  const { data } = await admin.from("garage_prospects").select(PROSPECT_COLUMNS).eq("seller_id", seller.id).order("created_at", { ascending: false });
  const prospects = (data ?? []) as Prospect[];
  const today = todayDate();
  const query = q.trim().toLocaleLowerCase("es");
  const filtered = prospects
    .filter((prospect) => status === "all" || (status === "open" ? OPEN_STATUSES.has(prospect.status) : prospect.status === status))
    .filter((prospect) => !query || [prospect.name, prospect.contact_name, prospect.phone, prospect.city, prospect.instagram].filter(Boolean).join(" ").toLocaleLowerCase("es").includes(query));
  const count = (target: string) => prospects.filter((prospect) => prospect.status === target).length;
  const filterHref = (value: string) => `/dashboard/seller/prospects?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#d9341d]">Panel de vendedor</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Mis prospectos</h1><p className="mt-1 text-sm text-stone-600">Solo tú ves esta lista. Cuando un taller acepte, créalo desde Talleres.</p></div><ProspectFormModal apiBase={API} /></header>
    <section className="mt-6 flex gap-2 overflow-x-auto pb-1">{PROSPECT_STATUSES.map((value) => <Link key={value} href={filterHref(value)} className={`flex min-w-32 shrink-0 flex-col rounded-lg border bg-white p-3 shadow-sm ${status === value ? "border-stone-900" : "border-stone-200"}`}><span className={`self-start rounded-sm px-2 py-0.5 text-xs font-bold ${PROSPECT_STATUS_STYLES[value]}`}>{PROSPECT_STATUS_LABELS[value]}</span><span className="mt-2 font-display text-2xl font-bold">{count(value)}</span></Link>)}</section>
    <form className="mt-4 grid grid-cols-1 gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_200px_auto_auto]"><div className="relative min-w-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={19} /><input name="q" defaultValue={q} placeholder="Taller, contacto, teléfono, ciudad o Instagram" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4" /></div><select name="status" defaultValue={status} className="min-h-12 rounded-md border border-stone-300 bg-white px-4"><option value="open">En proceso</option><option value="all">Todos</option>{PROSPECT_STATUSES.map((value) => <option key={value} value={value}>{PROSPECT_STATUS_LABELS[value]}</option>)}</select><button className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Filtrar</button>{(q || status !== "open") && <Link href="/dashboard/seller/prospects" className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 px-4 font-bold text-stone-700"><RotateCcw size={18} /> Limpiar</Link>}</form>
    <div className="mt-4 grid gap-3 lg:grid-cols-2">{filtered.map((prospect) => {
      const overdue = OPEN_STATUSES.has(prospect.status) && prospect.next_follow_up && prospect.next_follow_up <= today;
      return <article key={prospect.id} className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="font-bold break-words">{prospect.name}</p>{prospect.specialty && <p className="text-xs font-semibold text-[#d9341d]">{prospect.specialty}</p>}
        {(prospect.city || prospect.address) && <p className="mt-1 flex items-center gap-1 text-xs text-stone-500"><MapPin size={13} className="shrink-0" /> <span className="break-words">{[prospect.city, prospect.address].filter(Boolean).join(" · ")}</span></p>}
        <p className="mt-2 text-sm"><span className="font-semibold">{prospect.contact_name ?? "—"}</span> <span className="text-stone-500">· {prospect.phone ?? "Sin teléfono"}</span></p>
        {prospect.instagram && <a href={socialUrl("instagram", prospect.instagram)} target="_blank" rel="noreferrer" className="mt-1 inline-block rounded-sm bg-pink-50 px-2 py-1 text-xs font-bold text-pink-700">Instagram</a>}
        <div className="mt-3 flex flex-wrap items-center gap-2"><ProspectStatusSelect id={prospect.id} status={prospect.status} apiBase={API} /><span className={`text-xs ${overdue ? "font-bold text-[#d9341d]" : "text-stone-500"}`}>Seguimiento: {prospect.next_follow_up ? formatDate(prospect.next_follow_up) : "—"}</span></div>
        {prospect.notes && <p className="mt-2 whitespace-pre-line break-words rounded-md bg-stone-50 p-2 text-xs text-stone-600">{prospect.notes}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-stone-100 pt-2"><ProspectRowActions id={prospect.id} name={prospect.name} contactName={prospect.contact_name} phone={prospect.phone} status={prospect.status} apiBase={API} /><ProspectFormModal prospect={prospect} apiBase={API} /></div>
      </article>;
    })}</div>
    {!filtered.length && <p className="mt-4 rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-500">{prospects.length ? "No hay prospectos que coincidan con los filtros." : "Aún no tienes prospectos. Agrega el primero."}</p>}
  </div>;
}
