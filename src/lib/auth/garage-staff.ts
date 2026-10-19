import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { GarageStaffRole } from "@/types/domain";

export type StaffGarage = { garageId: string; role: GarageStaffRole };

/** Resolves the garage an owner or an active manager works for. */
export async function getStaffGarage(dataClient: SupabaseClient, user: User): Promise<StaffGarage | null> {
  const role = user.app_metadata.role;
  if (role === "garage_owner") {
    const { data } = await dataClient.from("garages").select("id").eq("owner_id", user.id).maybeSingle();
    return data ? { garageId: data.id, role } : null;
  }
  if (role === "garage_manager") {
    const { data } = await dataClient.from("garage_managers").select("garage_id").eq("profile_id", user.id).eq("is_active", true).maybeSingle();
    return data ? { garageId: data.garage_id, role } : null;
  }
  return null;
}

type StaffRequest =
  | { ok: true; user: User; admin: SupabaseClient; staff: StaffGarage }
  | { ok: false; response: NextResponse };

/** Shared guard for API routes used by owners and managers. */
export async function authorizeStaffRequest({ ownerOnly = false, unavailable = "La operación no está configurada." } = {}): Promise<StaffRequest> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Sesión no válida." }, { status: 401 }) };

  const role = user.app_metadata.role;
  if (role !== "garage_owner" && !(role === "garage_manager" && !ownerOnly)) {
    return { ok: false, response: NextResponse.json({ error: "Acceso restringido." }, { status: 403 }) };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, response: NextResponse.json({ error: unavailable }, { status: 503 }) };
  const staff = await getStaffGarage(admin, user);
  if (!staff) return { ok: false, response: NextResponse.json({ error: "Tu cuenta no tiene un taller asignado." }, { status: 403 }) };
  return { ok: true, user, admin, staff };
}
