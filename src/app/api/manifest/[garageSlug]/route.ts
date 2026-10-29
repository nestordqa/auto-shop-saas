import { NextResponse } from "next/server";

import manifest from "@/app/manifest";
import { getPublicGarage } from "@/lib/seo";

/** Manifest for installing the app from /login/<slug>: it opens on that garage's login. */
export async function GET(_request: Request, { params }: { params: Promise<{ garageSlug: string }> }) {
  const garage = await getPublicGarage((await params).garageSlug);
  if (!garage) return NextResponse.json({ error: "Taller no encontrado." }, { status: 404 });
  const base = manifest();
  return NextResponse.json({
    ...base,
    name: `${garage.name} · TorkeOS`,
    short_name: garage.name.slice(0, 24),
    id: `/login/${garage.slug}`,
    start_url: `/login/${garage.slug}`,
  }, { headers: { "Content-Type": "application/manifest+json" } });
}
