import { redirect } from "next/navigation";

import { homeForRole } from "@/lib/auth/role-routes";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// PWA start_url: send installed users straight to their panel, or to /login.
export default async function DashboardPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard/client");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(homeForRole(user?.app_metadata.role) ?? "/login");
}
