import { NextResponse } from "next/server";

import { getMessageTemplates } from "@/lib/message-templates-data";
import { createAdminClient } from "@/lib/supabase/admin";

/** Current WhatsApp templates (no secrets in them), read by every screen that prepares a message. */
export async function GET() {
  return NextResponse.json({ templates: await getMessageTemplates(createAdminClient()) }, { headers: { "Cache-Control": "no-store" } });
}
