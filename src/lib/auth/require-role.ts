import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/domain";

export async function requireRole(allowedRoles: AppRole[]) {
  if (!isSupabaseConfigured()) {
    return { id: "demo-user", role: allowedRoles[0], fullName: "Modo demostración" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.app_metadata.role as AppRole | undefined;

  if (!role || !allowedRoles.includes(role)) {
    redirect("/unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    role,
    fullName: profile?.full_name ?? user.email ?? "Usuario",
  };
}