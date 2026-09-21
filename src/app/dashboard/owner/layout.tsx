import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["garage_owner"]);
  return <DashboardShell role="garage_owner" userName={user.fullName}>{children}</DashboardShell>;
}