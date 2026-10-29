import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { siteUrl } from "@/lib/seo";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const description = "Software para talleres mecánicos: agenda online, órdenes de trabajo, diagnósticos y presupuestos desde el teléfono.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "TorkeOS · Software para talleres mecánicos", template: "%s · TorkeOS" },
  description,
  applicationName: "TorkeOS",
  authors: [{ name: "TorkeOS", url: siteUrl }],
  creator: "TorkeOS",
  publisher: "TorkeOS",
  category: "business",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: { type: "website", siteName: "TorkeOS", locale: "es_VE", description },
  twitter: { card: "summary_large_image" },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
  },
  appleWebApp: { capable: true, title: "TorkeOS", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171a1f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">{children}<ServiceWorkerRegister /></body>
    </html>
  );
}
