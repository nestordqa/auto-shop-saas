import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/domain";

const roleRoutes: Record<AppRole, string> = {
  admin: "/dashboard/admin",
  garage_owner: "/dashboard/owner",
  mechanic: "/dashboard/mechanic",
  client: "/dashboard/client",
};

export default async function Home() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard/client");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.app_metadata.role as AppRole | undefined;

  redirect(role && roleRoutes[role] ? roleRoutes[role] : "/unauthorized");
}
