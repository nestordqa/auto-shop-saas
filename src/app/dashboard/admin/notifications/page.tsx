import { AUDIENCE_LABELS, BroadcastForm, type BroadcastAudience } from "@/components/admin/broadcast-form";
import { requireRole } from "@/lib/auth/require-role";
import { isPushConfigured } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/types/domain";

const roleLabels: Record<AppRole, string> = { admin: "Admin", garage_owner: "Owner", garage_manager: "Encargado", mechanic: "Mecánico", client: "Cliente" };

export default async function NotificationsPage() {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  if (!admin) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Notificaciones</h1><p className="mt-2 text-stone-600">Configura SUPABASE_SECRET_KEY para enviar notificaciones.</p></div>;

  const [{ data: profiles }, { data: subscriptions }, { data: authUsers }, { data: history }] = await Promise.all([
    admin.from("profiles").select("id, full_name, role").order("full_name"),
    admin.from("push_subscriptions").select("user_id"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("admin_broadcasts").select("id, title, body, audience, recipient_count, delivered_count, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const withPush = new Set((subscriptions ?? []).map((subscription) => subscription.user_id as string));
  const emailById = new Map((authUsers?.users ?? []).map((user) => [user.id, user.email ?? null]));
  const all = profiles ?? [];
  const stat = (roles?: AppRole[]) => {
    const group = roles ? all.filter((profile) => roles.includes(profile.role as AppRole)) : all;
    return { total: group.length, withPush: group.filter((profile) => withPush.has(profile.id)).length };
  };
  const users = all.map((profile) => ({ id: profile.id, name: profile.full_name as string, email: emailById.get(profile.id) ?? null, roleLabel: roleLabels[profile.role as AppRole], hasPush: withPush.has(profile.id) }));

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header><p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Notificaciones</h1><p className="mt-1 text-sm text-stone-600">Envía avisos push masivos a owners, admins, clientes o usuarios concretos.</p></header>
    {!isPushConfigured() && <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Configura NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY para enviar notificaciones.</p>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <BroadcastForm users={users} stats={{ owners: stat(["garage_owner"]), admins: stat(["admin"]), clients: stat(["client"]), all: stat() }} />
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl font-bold">Últimos envíos</h2>
        <ul className="mt-3 divide-y divide-stone-100">{(history ?? []).map((item) => <li key={item.id} className="py-3 text-sm">
          <div className="flex items-start justify-between gap-3"><p className="font-bold">{item.title}</p><span className="shrink-0 rounded-sm bg-stone-100 px-2 py-0.5 text-xs font-bold">{AUDIENCE_LABELS[item.audience as BroadcastAudience]}</span></div>
          <p className="mt-1 line-clamp-2 text-stone-600">{item.body}</p>
          <p className="mt-1 text-xs text-stone-500">{new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))} · {item.recipient_count} usuarios · {item.delivered_count} dispositivos</p>
        </li>)}</ul>
        {!history?.length && <p className="mt-3 text-sm text-stone-500">Aún no has enviado notificaciones.</p>}
      </section>
    </div>
  </div>;
}
