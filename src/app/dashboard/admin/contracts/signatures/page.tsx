import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SignaturesManager } from "@/components/admin/signatures-manager";
import { requireRole } from "@/lib/auth/require-role";
import { getSignatures } from "@/lib/signatures";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function SignaturesPage() {
  await requireRole(["admin"]);
  const { data: { user } } = await (await createClient()).auth.getUser();
  const admin = createAdminClient();
  const { signatures, defaultAdminId } = admin ? await getSignatures(admin) : { signatures: [], defaultAdminId: null };
  const { data: profile } = admin && user ? await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : { data: null };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <Link href="/dashboard/admin/contracts" className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"><ArrowLeft size={18} /> Contratos</Link>
      <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Gestionar firmas</h1>
      <p className="mt-1 text-sm text-stone-600">Cada admin tiene una sola firma y solo puede editar la suya. La firma predeterminada se imprime, con su nombre y cargo, en todos los contratos nuevos.</p>
      <div className="mt-6"><SignaturesManager signatures={signatures} defaultAdminId={defaultAdminId} currentAdminId={user?.id ?? ""} currentAdminName={profile?.full_name ?? ""} /></div>
    </div>
  );
}
