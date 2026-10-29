import type { Metadata } from "next";

import { LoginScreen } from "@/components/auth/login-screen";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  alternates: { canonical: "/login" },
  robots: { ...noIndex, follow: true },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginScreen next={next} />;
}
