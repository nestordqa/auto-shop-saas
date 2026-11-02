import type { Metadata } from "next";
import { ArrowLeft, CalendarCheck, ChevronRight, ShieldCheck, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { TorkeMark } from "@/components/brand/torke-logo";
import { GarageAffiliationForm } from "@/components/auth/garage-affiliation-form";
import { RegisterForm } from "@/components/auth/register-form";
import { SupportButton } from "@/components/layout/support-button";

const description = "Crea tu cuenta gratuita en TorkeOS: registra tus vehículos, agenda citas en tu taller y aprueba presupuestos desde el teléfono. ¿Tienes un taller? Afílialo a TorkeOS.";

export const metadata: Metadata = {
  title: "Crea tu cuenta gratis",
  description,
  alternates: { canonical: "/register" },
  openGraph: { url: "/register", title: "Crea tu cuenta gratis · TorkeOS", description },
};

/**
 * Sign-up entry: clients create their account here; garages only send an affiliation request
 * by WhatsApp (an admin creates garage accounts by hand). Coming from a garage link (`next`) goes straight to the client form.
 */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; tipo?: string }> }) {
  const { next, tipo } = await searchParams;
  const mode = tipo === "taller" ? "garage" : tipo === "cliente" || next ? "client" : "choose";
  const back = <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-stone-600 hover:text-stone-900"><ArrowLeft size={16} /> Volver</Link>;

  const card = mode === "garage" ? (
    <>
      {back}
      <p className="text-xs font-bold uppercase text-[#d9341d]">Para talleres</p>
      <h2 className="mt-2 font-display text-4xl font-bold">Afilia tu taller</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">Déjanos los datos de tu taller y te contactamos por WhatsApp para activarlo con 30 días de prueba gratis.</p>
      <GarageAffiliationForm />
    </>
  ) : mode === "client" ? (
    <>
      {!next && back}
      <p className="text-xs font-bold uppercase text-[#d9341d]">Portal del cliente</p>
      <h2 className="mt-2 font-display text-4xl font-bold">Crea tu cuenta</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">Registra tus vehículos, agenda citas y decide tus presupuestos.</p>
      <RegisterForm nextPath={next} />
    </>
  ) : (
    <>
      <h2 className="font-display text-4xl font-bold">Crea tu cuenta</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">Cuéntanos qué quieres hacer en TorkeOS.</p>
      <div className="mt-6 grid gap-3">
        <Link href="/register?tipo=cliente" className="group flex items-center gap-4 rounded-lg border border-stone-300 bg-white p-4 hover:border-[#ef3f26]">
          <span className="grid size-12 shrink-0 place-items-center rounded-md bg-[#ef3f26] text-white"><CalendarCheck /></span>
          <span className="min-w-0 flex-1"><span className="block font-bold">¿Quieres agendar citas con tu mecánico?</span><span className="block text-sm text-stone-600">Crea tu cuenta de cliente gratis.</span></span>
          <ChevronRight className="shrink-0 text-stone-400 group-hover:text-[#ef3f26]" />
        </Link>
        <Link href="/register?tipo=taller" className="group flex items-center gap-4 rounded-lg border border-stone-300 bg-white p-4 hover:border-[#ef3f26]">
          <span className="grid size-12 shrink-0 place-items-center rounded-md bg-stone-900 text-white"><Wrench /></span>
          <span className="min-w-0 flex-1"><span className="block font-bold">¿Quieres afiliar tu taller a TorkeOS?</span><span className="block text-sm text-stone-600">Envíanos sus datos y lo activamos por ti.</span></span>
          <ChevronRight className="shrink-0 text-stone-400 group-hover:text-[#ef3f26]" />
        </Link>
      </div>
      <p className="mt-6 text-center text-sm text-stone-600">¿Ya tienes cuenta? <Link href="/login" className="font-bold text-[#d9341d] hover:underline">Inicia sesión</Link></p>
    </>
  );

  return <main className="relative min-h-dvh overflow-hidden bg-[#171a1f]"><Image src="/vehicle-service.jpg" alt="Vehículo listo para servicio" fill priority className="object-cover object-[65%_center]" sizes="100vw" /><div className="absolute inset-0 bg-black/70" /><div className="relative mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_500px] lg:px-12"><section className="hidden max-w-xl text-white lg:block"><div className="flex items-center gap-3"><TorkeMark className="size-12" title="" /><span className="font-display text-3xl font-bold uppercase">Torke<span className="text-[#ef3f26]">OS</span></span></div><h1 className="mt-10 font-display text-6xl font-bold leading-none">{mode === "garage" ? "Tu taller, organizado desde el teléfono." : "Tu historial mecánico empieza aquí."}</h1><p className="mt-5 max-w-md text-lg leading-7 text-stone-200">{mode === "garage" ? "Agenda online, recepción digital, presupuestos y notificaciones automáticas para tus clientes." : "Agenda en tu taller, sigue el diagnóstico y decide presupuestos con total claridad."}</p><p className="mt-8 flex items-center gap-2 text-sm font-semibold text-emerald-300"><ShieldCheck size={20} /> {mode === "garage" ? "30 días de prueba sin costo." : "Tus datos y vehículos permanecen en tu cuenta."}</p></section><section className="mx-auto w-full max-w-lg rounded-lg border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8"><div className="mb-4 flex items-center gap-3 lg:hidden"><TorkeMark className="size-11" title="" /><span className="font-display text-2xl font-bold uppercase">Torke<span className="text-[#ef3f26]">OS</span></span></div>{card}</section></div><SupportButton context="registro" /></main>;
}
