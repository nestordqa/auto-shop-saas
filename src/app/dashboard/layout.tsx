import type { Metadata } from "next";

import { enforceTermsAcceptance } from "@/lib/auth/terms-gate";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { robots: noIndex };

/** Every signed-in user must have accepted the current terms before using a dashboard. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await enforceTermsAcceptance("/dashboard");
  return children;
}
