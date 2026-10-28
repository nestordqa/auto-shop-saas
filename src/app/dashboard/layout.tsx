import type { Metadata } from "next";

import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { robots: noIndex };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
