import "server-only";

import { NextResponse } from "next/server";

import { sellerForProfile } from "@/lib/sellers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** For seller API routes: the signed-in, active seller and a service client, or the error response to return. */
export async function authorizeSellerRequest() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Sesión no válida." }, { status: 401 }) };
  if (user.app_metadata.role !== "seller") return { ok: false as const, response: NextResponse.json({ error: "Solo un vendedor puede hacer esto." }, { status: 403 }) };
  const admin = createAdminClient();
  if (!admin) return { ok: false as const, response: NextResponse.json({ error: "Configura SUPABASE_SECRET_KEY." }, { status: 503 }) };
  const seller = await sellerForProfile(admin, user.id);
  if (!seller?.is_active) return { ok: false as const, response: NextResponse.json({ error: "Tu cuenta de vendedor está inactiva." }, { status: 403 }) };
  return { ok: true as const, user, admin, seller };
}
