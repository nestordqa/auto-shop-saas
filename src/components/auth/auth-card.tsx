import Image from "next/image";
import type { ReactNode } from "react";

import { TorkeMark } from "@/components/brand/torke-logo";

/** Centered card over the garage photo, shared by the password recovery screens. */
export function AuthCard({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <main className="relative min-h-dvh overflow-hidden bg-[#171a1f]"><Image src="/garage.jpg" alt="Taller automotriz equipado" fill priority className="object-cover object-center" sizes="100vw" /><div className="absolute inset-0 bg-black/65" /><div className="relative grid min-h-dvh place-items-center px-4 py-10"><section className="w-full max-w-md rounded-lg border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8"><div className="flex items-center gap-3"><TorkeMark className="size-11" title="" /><span className="font-display text-2xl font-bold uppercase">Torke<span className="text-[#ef3f26]">OS</span></span></div><p className="mt-6 text-xs font-bold uppercase text-[#d9341d]">{eyebrow}</p><h1 className="mt-2 font-display text-4xl font-bold">{title}</h1><p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>{children}</section></div></main>;
}
