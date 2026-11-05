import { BillingGate } from "@/components/owner/billing-gate";
import { OwnerWelcomeModal } from "@/components/owner/owner-welcome-modal";
import { siteUrl } from "@/lib/seo";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";
import { getStaffGarage } from "@/lib/auth/garage-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["garage_owner", "garage_manager"]);
  const { garage, welcome } = await currentGarage();
  return <DashboardShell role={user.role} userName={user.fullName}><BillingGate garage={garage} role={user.role}>{children}</BillingGate>{welcome && garage && <OwnerWelcomeModal fullName={user.fullName} email={welcome.email} garageName={garage.name} bookingUrl={`${siteUrl}/${garage.slug}`} />}</DashboardShell>;
}

/** Garage of the signed-in owner or manager (billing gate), and whether the owner still has to see the welcome. */
async function currentGarage() {
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!admin || !user) return { garage: null, welcome: null };
  const staff = await getStaffGarage(admin, user);
  if (!staff) return { garage: null, welcome: null };
  const { data } = await admin.from("garages").select("id, name, plan, slug").eq("id", staff.garageId).maybeSingle();
  const welcome = user.app_metadata.role === "garage_owner" && user.user_metadata?.show_welcome === true ? { email: user.email ?? "" } : null;
  return { garage: data as { id: string; name: string; plan: string | null; slug: string } | null, welcome };
}
