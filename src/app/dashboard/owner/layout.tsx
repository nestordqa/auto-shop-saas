import { BillingGate } from "@/components/owner/billing-gate";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getStaffGarage } from "@/lib/auth/garage-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["garage_owner", "garage_manager"]);
  const garage = await currentGarage();
  return <DashboardShell role={user.role} userName={user.fullName}><BillingGate garage={garage} role={user.role}>{children}</BillingGate></DashboardShell>;
}

/** Garage of the signed-in owner or manager, for the billing gate. */
async function currentGarage() {
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!admin || !user) return null;
  const staff = await getStaffGarage(admin, user);
  if (!staff) return null;
  const { data } = await admin.from("garages").select("id, name, plan").eq("id", staff.garageId).maybeSingle();
  return data as { id: string; name: string; plan: string | null } | null;
}
