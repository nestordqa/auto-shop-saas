import type { Metadata } from "next";
import Link from "next/link";

import { TorkeMark } from "@/components/brand/torke-logo";
import { TermsContent } from "@/components/legal/terms-content";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso de TorkeOS, plataforma de gestión para talleres mecánicos.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="flex items-center gap-3"><TorkeMark className="size-10" title="" /><span className="font-display text-2xl font-bold uppercase">Torke<span className="text-[#ef3f26]">OS</span></span></Link>
        <h1 className="mt-8 font-display text-4xl font-bold">Términos y condiciones</h1>
        <div className="mt-6"><TermsContent /></div>
      </article>
    </main>
  );
}
