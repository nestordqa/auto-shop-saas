import { redirect } from "next/navigation";

import { getStaffGarage } from "@/lib/auth/garage-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { GarageStaffRole } from "@/types/domain";

/** Owners and active managers share the garage dashboard; `ownerOnly` keeps pages like billing for the owner. */
export async function requireOwnerGarage({ ownerOnly = false }: { ownerOnly?: boolean } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const role = user.app_metadata.role;
  if (role !== "garage_owner" && !(role === "garage_manager" && !ownerOnly)) redirect("/unauthorized");

  const dataClient = createAdminClient() ?? supabase;
  const staff = await getStaffGarage(dataClient, user);
  const { data: garage } = staff
    ? await dataClient
        .from("garages")
        .select("id, name, address, owner_id, created_at")
        .eq("id", staff.garageId)
        .maybeSingle()
    : { data: null };

  return { user, garage, dataClient, staffRole: role as GarageStaffRole };
}
