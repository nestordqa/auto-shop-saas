"use client";

import {
  Activity,
  Bell,
  CalendarDays,
  CarFront,
  ClipboardList,
  FileDown,
  LifeBuoy,
  FileSignature,
  Gauge,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Store,
  Target,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { TorkeMark } from "@/components/brand/torke-logo";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { NotificationSettings } from "@/components/pwa/notification-settings";
import { torkeosSupportUrl } from "@/lib/contact";
import { unsubscribeFromPush } from "@/lib/push-client";
import { AppOnboardingModal } from "@/components/pwa/app-onboarding-modal";
import { RouteProgress } from "@/components/ui/route-progress";
import type { AppRole } from "@/types/domain";

const DOCS_HREF = "/docs/torkeos-manual.pdf";

const roleLabels: Record<AppRole, string> = {
  admin: "Administración",
  garage_owner: "Mi taller",
  garage_manager: "Encargado del taller",
  mechanic: "Área técnica",
  client: "Mis vehículos",
};

const navigation = {
  admin: [
    { label: "Resumen", href: "/dashboard/admin", icon: Gauge },
    { label: "Prospectos", href: "/dashboard/admin/prospects", icon: Target },
    { label: "Talleres", href: "/dashboard/admin/garages", icon: Wrench },
    { label: "Usuarios", href: "/dashboard/admin/users", icon: Users },
    { label: "Catálogo", href: "/dashboard/admin/catalog", icon: CarFront },
    { label: "Contratos", href: "/dashboard/admin/contracts", icon: FileSignature },
    { label: "Notificaciones", href: "/dashboard/admin/notifications", icon: Bell },
    { label: "Facturación", href: "/dashboard/admin/billing", icon: ReceiptText },
    { label: "Medios de pago", href: "/dashboard/admin/payment-methods", icon: Wallet },
  ],
  garage_owner: [
    { label: "Órdenes", href: "/dashboard/owner/orders", icon: ClipboardList },
    { label: "Vehículos", href: "/dashboard/owner/vehicles", icon: CarFront },
    { label: "Agenda", href: "/dashboard/owner/agenda", icon: CalendarDays },
    { label: "Equipo", href: "/dashboard/owner/team", icon: Users },
    { label: "Sucursales", href: "/dashboard/owner/branches", icon: Store },
    { label: "Pagos", href: "/dashboard/owner/payments", icon: Wallet },
    { label: "Durabilidad", href: "/dashboard/owner/insights", icon: Activity },
    { label: "Facturación", href: "/dashboard/owner/billing", icon: ReceiptText },
  ],
  garage_manager: [
    { label: "Órdenes", href: "/dashboard/owner/orders", icon: ClipboardList },
    { label: "Vehículos", href: "/dashboard/owner/vehicles", icon: CarFront },
    { label: "Agenda", href: "/dashboard/owner/agenda", icon: CalendarDays },
    { label: "Equipo", href: "/dashboard/owner/team", icon: Users },
    { label: "Durabilidad", href: "/dashboard/owner/insights", icon: Activity },
  ],
  mechanic: [
    { label: "Diagnóstico", href: "/dashboard/mechanic", icon: ClipboardList },
    { label: "Agenda", href: "/dashboard/mechanic#agenda", icon: CalendarDays },
  ],
  client: [
    { label: "Inicio", href: "/dashboard/client", icon: Gauge },
    { label: "Vehículos", href: "/dashboard/client/vehicles", icon: CarFront },
    { label: "Citas", href: "/dashboard/client/appointments", icon: CalendarDays },
  ],
} satisfies Record<AppRole, { label: string; href: string; icon: typeof Gauge }[]>;

type DashboardShellProps = {
  children: React.ReactNode;
  role: AppRole;
  userName: string;
  garageContext?: { name: string; slug: string };
};

export function DashboardShell({ children, role, userName, garageContext }: DashboardShellProps) {
  // Support for every role: TorkeOS support WhatsApp (NEXT_PUBLIC_TORKEOS_SUPPORT_WHATSAPP), prefilled with who is asking.
  const supportUrl = torkeosSupportUrl(`Hola, necesito soporte con TorkeOS. Soy ${userName} (${roleLabels[role]}${garageContext ? ` · ${garageContext.name}` : ""}).`);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const items = navigation[role];
  const settingsHref = `/dashboard/${role === "garage_owner" || role === "garage_manager" ? "owner" : role}/settings`;
  // Sections like "Vehículos" stay highlighted on their detail pages.
  const isActive = (href: string) => pathname === href || (href.split("/").length > 3 && pathname.startsWith(`${href}/`));
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

  // A shared device must stop receiving this user's notifications once they sign out.
  async function logout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await unsubscribeFromPush();
    form.submit();
  }

  return (
    <div className="min-h-dvh bg-stone-100 text-stone-950">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur md:hidden">
        <Link href={`/dashboard/${role === "garage_owner" || role === "garage_manager" ? "owner" : role}`} className="flex items-center gap-2 font-bold">
          <TorkeMark className="size-9" title="" />
          {brandName}
        </Link>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="grid size-11 place-items-center rounded-md border border-stone-200" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-0 top-16 z-30 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-stone-200 bg-white p-4 shadow-xl md:hidden">
          <p className="mb-3 text-xs font-semibold uppercase text-stone-500">{roleLabels[role]}</p>
          <nav className="grid gap-2">
            {items.map(({ label, href, icon: Icon }) => (
              <Link key={label} href={href} onClick={(event) => { navigateToSection(event, href); setMenuOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-md bg-stone-100 px-4 font-semibold">
                <Icon size={20} /> {label}
              </Link>
            ))}
          </nav>
          {supportUrl && <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-12 items-center gap-3 rounded-md bg-emerald-50 px-4 font-semibold text-emerald-800"><LifeBuoy size={20} /> Soporte</a>}
          <a href={DOCS_HREF} download className="mt-2 flex min-h-12 items-center gap-3 rounded-md bg-stone-100 px-4 font-semibold">
            <FileDown size={20} /> Documentación (PDF)
          </a>
          <Link href={settingsHref} onClick={() => setMenuOpen(false)} className="mt-2 flex min-h-12 items-center gap-3 rounded-md bg-stone-100 px-4 font-semibold"><Settings size={20} /> Configuración</Link>
          <div className="mt-3 border-t border-stone-200 pt-3"><NotificationSettings tone="light" /></div>
          <form action="/api/auth/logout" method="post" onSubmit={logout} className="mt-2">
            <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-md px-4 font-semibold text-red-700 hover:bg-red-50">
              <LogOut size={20} /> Cerrar sesión
            </button>
          </form>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto overscroll-contain border-r border-stone-800 bg-[#171a1f] p-5 text-white md:flex">
        <Link href={`/dashboard/${role === "garage_owner" || role === "garage_manager" ? "owner" : role}`} className="flex items-center gap-3 text-xl font-bold">
          <TorkeMark className="size-10" title="" />
          {brandName}
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase text-stone-400">{roleLabels[role]}</p>
        <nav className="mt-3 grid gap-1">
          {items.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={label} href={href} onClick={(event) => navigateToSection(event, href)} className={`flex min-h-12 items-center gap-3 rounded-md px-3 font-medium ${active ? "bg-white text-stone-950" : "text-stone-300 hover:bg-white/10"}`}>
                <Icon size={20} /> {label}
              </Link>
            );
          })}
          {supportUrl && <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 rounded-md px-3 font-medium text-emerald-300 hover:bg-white/10"><LifeBuoy size={20} /> Soporte</a>}
          <a href={DOCS_HREF} download className="flex min-h-12 items-center gap-3 rounded-md px-3 font-medium text-stone-300 hover:bg-white/10">
            <FileDown size={20} /> Documentación
          </a>
        </nav>
        <div className="mt-auto border-t border-stone-700 pt-4">
          <p className="truncate font-semibold">{userName}</p>
          <Link href={settingsHref} className={`mt-1 flex min-h-9 items-center gap-2 rounded-md text-sm ${pathname === settingsHref ? "font-bold text-white" : "text-stone-300 hover:text-white"}`}><Settings size={15} /> Configuración</Link>
          <div className="mt-2"><NotificationSettings /></div>
          <form action="/api/auth/logout" method="post" onSubmit={logout} className="mt-1">
            <button type="submit" className="flex min-h-11 w-full items-center gap-2 rounded-md text-sm font-semibold text-red-300 hover:bg-white/10 hover:px-3 hover:text-red-200">
              <LogOut size={17} /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <LiveRefresh />
      <main className="min-w-0 pb-24 md:ml-64 md:pb-8">{children}</main>
      <AppOnboardingModal />
      <Suspense fallback={null}><RouteProgress /></Suspense>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-20 border-t border-stone-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] md:hidden" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, minmax(0, 1fr))` }}>
        {items.slice(0, 5).map(({ label, href, icon: Icon }) => (
          <Link key={label} href={href} onClick={(event) => navigateToSection(event, href)} className="flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-stone-600">
            <Icon size={22} className={isActive(href) ? "text-[#ef3f26]" : ""} />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}