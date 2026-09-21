import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export default async function MechanicLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["mechanic"]);
  return <DashboardShell role="mechanic" userName={user.fullName}>{children}</DashboardShell>;
}