import { cookies } from "next/headers";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["client"]);
  const garageSlug = (await cookies()).get("garage_context")?.value;
  const admin = createAdminClient();
  const { data: garage } = garageSlug && admin ? await admin.from("garages").select("name, slug").eq("slug", garageSlug).maybeSingle() : { data: null };
  return <DashboardShell role="client" userName={user.fullName} garageContext={garage ?? undefined}>{children}</DashboardShell>;
}