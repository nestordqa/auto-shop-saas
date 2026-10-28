import type { MetadataRoute } from "next";

import { getPublicGarages, siteUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const garages = await getPublicGarages();
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/register`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/brand`, changeFrequency: "yearly", priority: 0.3 },
    ...garages.map((garage) => ({
      url: `${siteUrl}/${garage.slug}`,
      lastModified: garage.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
