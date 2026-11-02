import { redirect } from "next/navigation";

import { getStaffGarage } from "@/lib/auth/garage-staff";
import { getGarageBranches, type Branch } from "@/lib/branches";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { GarageStaffRole } from "@/types/domain";

/**
 * Owners and active managers share the garage dashboard; `ownerOnly` keeps pages like billing for the owner.
 * `staffBranchId` is the manager's branch (owners: null); `branches` lists every branch of the garage.
 */
export async function requireOwnerGarage({ ownerOnly = false }: { ownerOnly?: boolean } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const role = user.app_metadata.role;
  if (role !== "garage_owner" && !(role === "garage_manager" && !ownerOnly)) redirect("/unauthorized");

  const dataClient = createAdminClient() ?? supabase;
  const staff = await getStaffGarage(dataClient, user);
  const [{ data: garage }, branches] = staff
    ? await Promise.all([
        dataClient
          .from("garages")
          .select("id, name, slug, address, owner_id, created_at")
          .eq("id", staff.garageId)
          .maybeSingle(),
        getGarageBranches(dataClient, staff.garageId),
      ])
    : [{ data: null }, [] as Branch[]];

  return { user, garage, dataClient, staffRole: role as GarageStaffRole, staffBranchId: staff?.branchId ?? null, branches };
}

/**
 * Branch filter for dashboard lists: managers are pinned to their branch; owners pick one with
 * `?branch=` or see all (null). `multiBranch` tells the page whether to show branch UI at all.
 */
export function branchScope(branches: Branch[], staffBranchId: string | null, requested?: string) {
  const multiBranch = branches.length > 1;
  const branchId = staffBranchId ?? (requested && branches.some((branch) => branch.id === requested) ? requested : null);
  return { multiBranch: multiBranch && !staffBranchId, branchId, branchById: new Map(branches.map((branch) => [branch.id, branch])) };
}
