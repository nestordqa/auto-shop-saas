import { NextResponse } from "next/server";

import { sendBillingReminders } from "@/lib/billing-notifications";
import { sendScheduledReminders } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

/** Called every 15 minutes by a scheduler with `Authorization: Bearer $CRON_SECRET` (see README). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase no está configurado." }, { status: 503 });
  const [orders, billing] = await Promise.all([
    sendScheduledReminders(admin),
    sendBillingReminders(admin).catch((error: unknown) => ({ error: error instanceof Error ? error.message : "billing failed" })),
  ]);
  return NextResponse.json({ sent: orders, billing });
}
