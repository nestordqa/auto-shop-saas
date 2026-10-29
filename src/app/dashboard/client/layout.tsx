import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";
import { resolveClientGarage } from "@/lib/client-garage";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["client"]);
  const admin = createAdminClient();
  const garage = admin ? await resolveClientGarage(admin) : null;
  return <DashboardShell role="client" userName={user.fullName} garageContext={garage ? { name: garage.name, slug: garage.slug } : undefined}>{children}</DashboardShell>;
}
