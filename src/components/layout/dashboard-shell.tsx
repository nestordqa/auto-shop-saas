"use client";

import {
  CalendarDays,
  CarFront,
  ClipboardList,
  Gauge,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { AppRole } from "@/types/domain";

const roleLabels: Record<AppRole, string> = {
  admin: "Administración",
  garage_owner: "Mi taller",
  mechanic: "Área técnica",
  client: "Mis vehículos",
};

const navigation = {
  admin: [
    { label: "Resumen", href: "/dashboard/admin", icon: Gauge },
    { label: "Talleres", href: "/dashboard/admin/garages", icon: Wrench },
    { label: "Usuarios", href: "/dashboard/admin/users", icon: Users },
    { label: "Catálogo", href: "/dashboard/admin/catalog", icon: CarFront },
    { label: "Facturación", href: "/dashboard/admin/billing", icon: ReceiptText },
  ],
  garage_owner: [
    { label: "Órdenes", href: "/dashboard/owner/orders", icon: ClipboardList },
    { label: "Agenda", href: "/dashboard/owner/agenda", icon: CalendarDays },
    { label: "Equipo", href: "/dashboard/owner/team", icon: Users },
    { label: "Facturación", href: "/dashboard/owner/billing", icon: ReceiptText },
  ],
  mechanic: [
    { label: "Diagnóstico", href: "/dashboard/mechanic", icon: ClipboardList },
    { label: "Agenda", href: "/dashboard/mechanic#agenda", icon: CalendarDays },
  ],
  client: [
    { label: "Inicio", href: "/dashboard/client", icon: Gauge },
    { label: "Vehículos", href: "/dashboard/client#vehicles", icon: CarFront },
    { label: "Citas", href: "/dashboard/client#appointments", icon: CalendarDays },
  ],
} satisfies Record<AppRole, { label: string; href: string; icon: typeof Gauge }[]>;

type DashboardShellProps = {
  children: React.ReactNode;
  role: AppRole;
  userName: string;
  garageContext?: { name: string; slug: string };
};

export function DashboardShell({ children, role, userName, garageContext }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const items = role === "client" && garageContext
    ? navigation.client.map((item) => item.label === "Citas" ? { ...item, href: `/${garageContext.slug}` } : item)
    : navigation[role];
  const brandName = role === "client" && garageContext ? garageContext.name : "TorkeOS";

  useEffect(() => {
    if (role === "client" && garageContext) {
      document.cookie = `garage_context=${encodeURIComponent(garageContext.slug)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [garageContext, role]);

  useEffect(() => {
    const sectionId = window.location.hash.slice(1);
    if (!sectionId) return;
    requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [pathname]);

  function navigateToSection(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    const [targetPath, sectionId] = href.split("#");
    if (!sectionId || pathname !== targetPath) return;
    event.preventDefault();
    window.history.pushState(null, "", href);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  }

  return (
    <div className="min-h-dvh bg-stone-100 text-stone-950">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur md:hidden">
        <Link href={`/dashboard/${role === "garage_owner" ? "owner" : role}`} className="flex items-center gap-2 font-bold">
          <span className="grid size-9 place-items-center rounded-md bg-[#ef3f26] text-white"><Wrench size={20} /></span>
          {brandName}
        </Link>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="grid size-11 place-items-center rounded-md border border-stone-200" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-0 top-16 z-30 border-b border-stone-200 bg-white p-4 shadow-xl md:hidden">
          <p className="mb-3 text-xs font-semibold uppercase text-stone-500">{roleLabels[role]}</p>
          <nav className="grid gap-2">
            {items.map(({ label, href, icon: Icon }) => (
              <Link key={label} href={href} onClick={(event) => { navigateToSection(event, href); setMenuOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-md bg-stone-100 px-4 font-semibold">
                <Icon size={20} /> {label}
              </Link>
            ))}
          </nav>
          <form action="/api/auth/logout" method="post" className="mt-3 border-t border-stone-200 pt-3">
            <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-md px-4 font-semibold text-red-700 hover:bg-red-50">
              <LogOut size={20} /> Cerrar sesión
            </button>
          </form>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-800 bg-[#171a1f] p-5 text-white md:flex">
        <Link href={`/dashboard/${role === "garage_owner" ? "owner" : role}`} className="flex items-center gap-3 text-xl font-bold">
          <span className="grid size-10 place-items-center rounded-md bg-[#ef3f26]"><Wrench size={22} /></span>
          {brandName}
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase text-stone-400">{roleLabels[role]}</p>
        <nav className="mt-3 grid gap-1">
          {items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={label} href={href} onClick={(event) => navigateToSection(event, href)} className={`flex min-h-12 items-center gap-3 rounded-md px-3 font-medium ${active ? "bg-white text-stone-950" : "text-stone-300 hover:bg-white/10"}`}>
                <Icon size={20} /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-stone-700 pt-4">
          <p className="truncate font-semibold">{userName}</p>
          <div className="mt-1 flex items-center gap-2 text-sm text-stone-400"><Settings size={15} /> Configuración</div>
          <form action="/api/auth/logout" method="post" className="mt-3">
            <button type="submit" className="flex min-h-11 w-full items-center gap-2 rounded-md text-sm font-semibold text-red-300 hover:bg-white/10 hover:px-3 hover:text-red-200">
              <LogOut size={17} /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 pb-24 md:ml-64 md:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-20 border-t border-stone-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] md:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ label, href, icon: Icon }) => (
          <Link key={label} href={href} onClick={(event) => navigateToSection(event, href)} className="flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-stone-600">
            <Icon size={22} className={pathname === href ? "text-[#ef3f26]" : ""} />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}