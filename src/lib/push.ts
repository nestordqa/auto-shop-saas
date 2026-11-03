import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  /** Page opened when the notification is tapped. */
  url: string;
  /** Same tag replaces the previous notification instead of stacking (e.g. one per order and topic). */
  tag?: string;
};

let configured: boolean | null = null;

export function isPushConfigured() {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().replace(/^["']|["']$/g, "");
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "");
  configured = Boolean(publicKey && privateKey);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:soporte@torkeos.com", publicKey!, privateKey!);
  return configured;
}

/** Sends to every device of each user; subscriptions the push service reports as gone are deleted. Returns the devices reached. */
export async function sendPush(admin: SupabaseClient, userIds: string[], payload: PushPayload) {
  const recipients = [...new Set(userIds)];
  if (!recipients.length || !isPushConfigured()) return 0;
  // Chunked: a long `in` list would overflow the request URL (mass notifications reach every user).
  const chunks = Array.from({ length: Math.ceil(recipients.length / 150) }, (_, index) => recipients.slice(index * 150, (index + 1) * 150));
  const results = await Promise.all(chunks.map((ids) => admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", ids)));
  const subscriptions = results.flatMap((result) => result.data ?? []);
  const body = JSON.stringify(payload);
  let delivered = 0;

  await Promise.all((subscriptions ?? []).map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, body, { TTL: 60 * 60 * 24 });
      delivered += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      else console.error("[push] send failed", status ?? error);
    }
  }));
  return delivered;
}
