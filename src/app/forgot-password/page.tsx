import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: noIndex };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthCard eyebrow="Recuperar acceso" title="¿Olvidaste tu contraseña?" description="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva."><ForgotPasswordForm expired={error === "expired"} /></AuthCard>;
}
