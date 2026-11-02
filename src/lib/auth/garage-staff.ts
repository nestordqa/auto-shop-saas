import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getGarageBillingStatus } from "@/lib/billing-status";
import { LOCK_AFTER_DAYS } from "@/lib/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { GarageStaffRole } from "@/types/domain";

/** `branchId` is set for managers, who only work at their branch; owners see every branch (null). */
export type StaffGarage = { garageId: string; branchId: string | null; role: GarageStaffRole };

/** Resolves the garage an owner or an active manager works for. */
export async function getStaffGarage(dataClient: SupabaseClient, user: User): Promise<StaffGarage | null> {
  const role = user.app_metadata.role;
  if (role === "garage_owner") {
    const { data } = await dataClient.from("garages").select("id").eq("owner_id", user.id).maybeSingle();
    return data ? { garageId: data.id, branchId: null, role } : null;
  }
  if (role === "garage_manager") {
    const { data } = await dataClient.from("garage_managers").select("garage_id, branch_id").eq("profile_id", user.id).eq("is_active", true).maybeSingle();
    return data ? { garageId: data.garage_id, branchId: data.branch_id, role } : null;
  }
  return null;
}

/** Whether the staff member may work on an order: same garage and, for managers, same branch. */
export function staffCanAccessOrder(staff: StaffGarage | null, order: { garage_id: string; branch_id: string }) {
  return Boolean(staff && staff.garageId === order.garage_id && (!staff.branchId || staff.branchId === order.branch_id));
}

type StaffRequest =
  | { ok: true; user: User; admin: SupabaseClient; staff: StaffGarage }
  | { ok: false; response: NextResponse };

/**
 * Shared guard for API routes used by owners and managers. Garages with LOCK_AFTER_DAYS of arrears are refused
 * (402) except on `allowLocked` routes, which the owner needs to pay.
 */
export async function authorizeStaffRequest({ ownerOnly = false, allowLocked = false, unavailable = "La operación no está configurada." } = {}): Promise<StaffRequest> {
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
  if (!allowLocked && (await getGarageBillingStatus(staff.garageId)).locked) {
    return { ok: false, response: NextResponse.json({ error: `El acceso del taller está suspendido por más de ${LOCK_AFTER_DAYS} días de mora. El owner debe ponerse al día desde Facturación.` }, { status: 402 }) };
  }
  return { ok: true, user, admin, staff };
}

/**
 * Branch a staff request acts on: a manager is pinned to theirs; an owner may pick any active
 * branch of the garage and falls back to the main one. Returns null when the pick is invalid.
 */
export async function resolveStaffBranch(admin: SupabaseClient, staff: StaffGarage, requested?: string | null) {
  if (staff.branchId) return requested && requested !== staff.branchId ? null : staff.branchId;
  let query = admin.from("garage_branches").select("id").eq("garage_id", staff.garageId).eq("is_active", true);
  query = requested ? query.eq("id", requested) : query.eq("is_main", true);
  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}
