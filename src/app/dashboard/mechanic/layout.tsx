import { DashboardShell } from "@/components/layout/dashboard-shell";
import { BillingGate } from "@/components/owner/billing-gate";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function MechanicLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["mechanic"]);
  return <DashboardShell role="mechanic" userName={user.fullName}><BillingGate garage={await mechanicGarage()} role="mechanic">{children}</BillingGate></DashboardShell>;
}

/** Garage of the signed-in mechanic: its access follows the garage's billing. */
async function mechanicGarage() {
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!admin || !user) return null;
  const { data: mechanic } = await admin.from("mechanics").select("garage_id").eq("profile_id", user.id).maybeSingle();
  if (!mechanic) return null;
  const { data } = await admin.from("garages").select("id, name, plan").eq("id", mechanic.garage_id).maybeSingle();
  return data as { id: string; name: string; plan: string | null } | null;
}
