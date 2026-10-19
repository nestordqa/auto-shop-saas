import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["garage_owner", "garage_manager"]);
  return <DashboardShell role={user.role} userName={user.fullName}>{children}</DashboardShell>;
}
