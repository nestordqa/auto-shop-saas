import type { AppRole } from "@/types/domain";

export const roleRoutes: Record<AppRole, string> = {
  admin: "/dashboard/admin",
  garage_owner: "/dashboard/owner",
  garage_manager: "/dashboard/owner",
  mechanic: "/dashboard/mechanic",
  client: "/dashboard/client",
};

export function homeForRole(role: unknown) {
  return typeof role === "string" && role in roleRoutes ? roleRoutes[role as AppRole] : undefined;
}
