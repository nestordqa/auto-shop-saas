import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoginScreen } from "@/components/auth/login-screen";
import { getPublicGarage, noIndex } from "@/lib/seo";

type Props = { params: Promise<{ garageSlug: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const garage = await getPublicGarage((await params).garageSlug);
  return {
    title: garage ? `Iniciar sesión · ${garage.name}` : "Iniciar sesión",
    robots: { ...noIndex, follow: true },
    // Installing from here opens the app on this garage (see /api/manifest/[garageSlug]).
    ...(garage && { manifest: `/api/manifest/${garage.slug}` }),
  };
}

/** Garage login: the proxy scopes the session to this garage, so the client sees it first. */
export default async function GarageLoginPage({ params, searchParams }: Props) {
  const [{ garageSlug }, { next }] = await Promise.all([params, searchParams]);
  const garage = await getPublicGarage(garageSlug);
  if (!garage) notFound();
  return <LoginScreen next={next} garage={{ name: garage.name, specialty: garage.specialty }} />;
}
