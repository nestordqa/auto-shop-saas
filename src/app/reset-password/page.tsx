import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { noIndex } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nueva contraseña", robots: noIndex };

/** Reached from /auth/confirm, which signs the user in with the recovery link. */
export default async function ResetPasswordPage() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/forgot-password?error=expired");
  return <AuthCard eyebrow="Recuperar acceso" title="Nueva contraseña" description={`Crea una nueva contraseña para ${user.email ?? "tu cuenta"}.`}><ResetPasswordForm /></AuthCard>;
}
