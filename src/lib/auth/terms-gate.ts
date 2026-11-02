import "server-only";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { needsTermsAcceptance } from "@/lib/terms";

/** Sends a signed-in user who has not accepted the current terms to the acceptance screen, then back to `nextPath`. */
export async function enforceTermsAcceptance(nextPath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await (createAdminClient() ?? supabase).from("profiles").select("terms_version").eq("id", user.id).maybeSingle();
  // Before migration 032 the column does not exist (no profile row comes back): do not lock anyone out.
  if (profile && needsTermsAcceptance(profile)) redirect(`/terminos/aceptar?next=${encodeURIComponent(nextPath)}`);
}
