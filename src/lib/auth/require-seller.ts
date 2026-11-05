import "server-only";

import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/require-role";
import { sellerForProfile } from "@/lib/sellers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Signed-in seller with their seller record and a service client (all reads are filtered by seller id). */
export async function requireSeller() {
  const user = await requireRole(["seller"]);
  const admin = createAdminClient();
  if (!admin) redirect("/unauthorized");
  const seller = await sellerForProfile(admin, user.id);
  if (!seller?.is_active) redirect("/unauthorized");
  return { user, admin, seller };
}
