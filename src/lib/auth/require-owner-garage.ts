import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requireOwnerGarage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.app_metadata.role !== "garage_owner") redirect("/unauthorized");

  const dataClient = createAdminClient() ?? supabase;
  const { data: garage } = await dataClient
    .from("garages")
    .select("id, name, address, owner_id, created_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  return { user, garage, dataClient };
}