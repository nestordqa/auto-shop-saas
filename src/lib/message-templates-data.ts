import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTemplateKey, MESSAGE_TEMPLATES, type TemplateKey } from "@/lib/message-templates";

/** Saved bodies over the defaults. Never throws: a missing table or row falls back to the built-in text. */
export async function getMessageTemplates(admin: SupabaseClient | null): Promise<Record<TemplateKey, string>> {
  const templates = Object.fromEntries(Object.entries(MESSAGE_TEMPLATES).map(([key, item]) => [key, item.body])) as Record<TemplateKey, string>;
  if (!admin) return templates;
  const { data } = await admin.from("admin_message_templates").select("key, body");
  for (const row of data ?? []) if (isTemplateKey(row.key)) templates[row.key] = row.body as string;
  return templates;
}
