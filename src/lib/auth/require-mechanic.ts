import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requireMechanic() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata.role !== "mechanic") redirect("/unauthorized");
  const dataClient = createAdminClient() ?? supabase;
  const { data: mechanic } = await dataClient.from("mechanics").select("id, garage_id, is_active").eq("profile_id", user.id).maybeSingle();
  return { user, mechanic, dataClient };
}