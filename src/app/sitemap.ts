import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://torkeos.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/register`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/login`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
