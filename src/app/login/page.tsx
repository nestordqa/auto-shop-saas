import type { Metadata } from "next";
import { CalendarCheck2, ClipboardCheck } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { TorkeMark } from "@/components/brand/torke-logo";
import { LoginForm } from "@/components/auth/login-form";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { homeForRole } from "@/lib/auth/role-routes";
import { noIndex } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  alternates: { canonical: "/login" },
  robots: { ...noIndex, follow: true },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!isSupabaseConfigured()) redirect("/dashboard/client");
  const { next } = await searchParams;
  const { data: { user } } = await (await createClient()).auth.getUser();
  const home = homeForRole(user?.app_metadata.role);
  if (home) redirect(user?.app_metadata.role === "client" && next?.startsWith("/") && !next.startsWith("//") ? next : home);
  return <main className="relative min-h-dvh overflow-hidden bg-[#171a1f]"><Image src="/garage.jpg" alt="Taller automotriz equipado" fill priority className="object-cover object-center" sizes="100vw" /><div className="absolute inset-0 bg-black/65" /><div className="relative mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-12"><section className="hidden max-w-xl text-white lg:block"><div className="flex items-center gap-3"><TorkeMark className="size-12" title="" /><span className="font-display text-3xl font-bold uppercase">Torke<span className="text-[#ef3f26]">OS</span></span></div><h1 className="mt-10 font-display text-6xl font-bold leading-none">Tu vehículo.<br />Tu taller.<br /><span className="text-[#ff5a43]">Todo bajo control.</span></h1><div className="mt-8 flex gap-6 text-sm font-semibold text-stone-200"><span className="flex items-center gap-2"><CalendarCheck2 size={19} /> Citas claras</span><span className="flex items-center gap-2"><ClipboardCheck size={19} /> Presupuestos al día</span></div></section><section className="mx-auto w-full max-w-md rounded-lg border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8"><div className="flex items-center gap-3 lg:hidden"><TorkeMark className="size-11" title="" /><span className="font-display text-2xl font-bold uppercase">Torke<span className="text-[#ef3f26]">OS</span></span></div><p className="text-xs font-bold uppercase text-[#d9341d] lg:mt-0">Acceso seguro</p><h2 className="mt-2 font-display text-4xl font-bold">Bienvenido</h2><p className="mt-2 text-sm leading-6 text-stone-600">Consulta citas, diagnósticos y presupuestos desde un solo lugar.</p><LoginForm nextPath={next} /><InstallAppButton /></section></div></main>;
}