import { ArrowRight, Building2, CarFront, ClipboardCheck, Users } from "lucide-react";
import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  await requireRole(["admin"]);
  const supabase = createAdminClient() ?? await createClient();
  const [garagesCount, usersCount, ordersCount] = await Promise.all([
    supabase.from("garages").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).neq("status", "entregado"),
  ]);
  const metrics = [
    { label: "Talleres activos", value: garagesCount.count ?? 0, icon: Building2 },
    { label: "Usuarios", value: usersCount.count ?? 0, icon: Users },
    { label: "Órdenes abiertas", value: ordersCount.count ?? 0, icon: ClipboardCheck },
  ];
  const sections = [
    { title: "Talleres", description: "Gestiona sedes, owners y operación.", href: "/dashboard/admin/garages", icon: Building2 },
    { title: "Usuarios", description: "Consulta roles, datos y actividad.", href: "/dashboard/admin/users", icon: Users },
    { title: "Catálogo", description: "Administra marcas y modelos.", href: "/dashboard/admin/catalog", icon: CarFront },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header><p className="text-xs font-bold uppercase text-[#d9341d]">Control global</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Red de talleres</h1></header>
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-stone-500">{label}</p><p className="mt-3 font-display text-4xl font-bold">{value}</p></div><span className="grid size-11 place-items-center rounded-md bg-stone-100"><Icon size={21} /></span></div></article>)}
      </section>
      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        {sections.map(({ title, description, href, icon: Icon }) => (
          <Link key={title} href={href} className="group flex min-h-36 flex-col justify-between rounded-lg border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-400">
            <span className="grid size-11 place-items-center rounded-md bg-stone-900 text-white"><Icon size={21} /></span>
            <div className="mt-6 flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-stone-500">{description}</p></div><ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" size={20} /></div>
          </Link>
        ))}
      </section>
    </div>
  );
}