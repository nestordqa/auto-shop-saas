"use client";

import { LoaderCircle, Search, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

export type BroadcastAudience = "owners" | "admins" | "clients" | "all" | "selected";
type UserOption = { id: string; name: string; email: string | null; roleLabel: string; hasPush: boolean };
type AudienceStat = { total: number; withPush: number };

export const AUDIENCE_LABELS: Record<BroadcastAudience, string> = { owners: "Administradores de taller", admins: "Admins", clients: "Clientes", all: "Todos", selected: "Usuarios seleccionados" };

export function BroadcastForm({ users, stats }: { users: UserOption[]; stats: Record<Exclude<BroadcastAudience, "selected">, AudienceStat> }) {
  const router = useRouter();
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();
  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    if (!term) return [];
    return users.filter((user) => !selected.includes(user.id) && `${user.name} ${user.email ?? ""}`.toLocaleLowerCase("es").includes(term)).slice(0, 8);
  }, [query, selected, users]);
  const current = audience === "selected"
    ? { total: selected.length, withPush: selected.filter((id) => userById.get(id)?.hasPush).length }
    : stats[audience];

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!window.confirm(`¿Enviar esta notificación a ${current.total} usuario(s)?`)) return;
    setPending(true);
    setResult(undefined);
    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: data.get("title"), body: data.get("body"), url: data.get("url") || undefined, audience, userIds: audience === "selected" ? selected : [] }),
    });
    const payload = await response.json() as { error?: string; recipients?: number; delivered?: number };
    setPending(false);
    if (!response.ok) return setResult({ ok: false, text: payload.error ?? "No se pudo enviar la notificación." });
    setResult({ ok: true, text: `Enviada a ${payload.recipients} usuario(s); llegó a ${payload.delivered} dispositivo(s).` });
    form.reset();
    setSelected([]);
    router.refresh();
  }

  return (
    <form onSubmit={send} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <fieldset>
        <legend className="text-sm font-bold">Destinatarios</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(AUDIENCE_LABELS) as BroadcastAudience[]).map((value) => (
            <button key={value} type="button" onClick={() => setAudience(value)} className={`min-h-10 rounded-md border px-4 text-sm font-bold ${audience === value ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"}`}>{AUDIENCE_LABELS[value]}{value !== "selected" && <span className="ml-1 font-normal opacity-70">({stats[value].total})</span>}</button>
          ))}
        </div>
      </fieldset>

      {audience === "selected" && (
        <div className="grid gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o correo" className="min-h-12 w-full rounded-md border border-stone-300 pl-10 pr-4" /></div>
          {matches.length > 0 && <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">{matches.map((user) => <li key={user.id}><button type="button" onClick={() => { setSelected((ids) => [...ids, user.id]); setQuery(""); }} className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-stone-50"><span><strong>{user.name}</strong> <span className="text-stone-500">{user.email}</span></span><span className="shrink-0 text-xs text-stone-500">{user.roleLabel}{!user.hasPush && " · sin push"}</span></button></li>)}</ul>}
          {selected.length > 0 && <div className="flex flex-wrap gap-2">{selected.map((id) => <span key={id} className="flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-3 pr-1 text-sm font-semibold">{userById.get(id)?.name}<button type="button" onClick={() => setSelected((ids) => ids.filter((item) => item !== id))} aria-label="Quitar" className="grid size-6 place-items-center rounded-full hover:bg-stone-200"><X size={14} /></button></span>)}</div>}
        </div>
      )}

      <label className="grid gap-1 text-sm font-bold">Título<input name="title" required maxLength={80} placeholder="Ej.: Nueva función disponible" className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>
      <label className="grid gap-1 text-sm font-bold">Mensaje<textarea name="body" required maxLength={300} rows={3} placeholder="Máximo 300 caracteres" className="rounded-md border border-stone-300 px-4 py-3 font-normal" /></label>
      <label className="grid gap-1 text-sm font-bold">Abrir al tocar (opcional)<input name="url" pattern="/.*" placeholder="/dashboard" className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>

      <p className="rounded-md bg-stone-50 p-3 text-sm text-stone-700"><strong>{current.total}</strong> destinatario(s), de los cuales <strong>{current.withPush}</strong> tienen notificaciones activadas en algún dispositivo. Los demás no la recibirán hasta que las activen.</p>
      {result && <p role="status" className={`rounded-md p-3 text-sm font-semibold ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{result.text}</p>}
      <button disabled={pending || !current.total} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={19} /> : <Send size={18} />} Enviar notificación</button>
    </form>
  );
}
