import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["seller"]);
  return <DashboardShell role="seller" userName={user.fullName}>{children}</DashboardShell>;
}
