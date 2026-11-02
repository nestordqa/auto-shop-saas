import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TorkeMark } from "@/components/brand/torke-logo";
import { TermsAcceptForm } from "@/components/legal/terms-accept-form";
import { TermsContent } from "@/components/legal/terms-content";
import { noIndex } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Acepta los términos", robots: noIndex };

/** Shown to signed-in users who have not accepted the current terms (accounts created by admins or garages, or a new version). */
export default async function AcceptTermsPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const nextPath = next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/terminos") ? next : "/dashboard";

  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex items-center gap-3"><TorkeMark className="size-10" title="" /><span className="font-display text-2xl font-bold uppercase">Torke<span className="text-[#ef3f26]">OS</span></span></div>
        <h1 className="mt-8 font-display text-3xl font-bold sm:text-4xl">Términos y condiciones</h1>
        <p className="mt-2 text-sm text-stone-600">Para continuar usando TorkeOS, lee y acepta los términos.</p>
        <div className="mt-6 max-h-[50dvh] overflow-y-auto rounded-md border border-stone-200 bg-stone-50 p-4 sm:p-5"><TermsContent /></div>
        <div className="mt-6"><TermsAcceptForm nextPath={nextPath} /></div>
      </article>
    </main>
  );
}
