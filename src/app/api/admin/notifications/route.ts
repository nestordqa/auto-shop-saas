import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { isPushConfigured, sendPush } from "@/lib/push";

const AUDIENCE_ROLES = { owners: ["garage_owner"], admins: ["admin"], clients: ["client"] } as const;

const broadcastSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(300),
  url: z.string().trim().startsWith("/").refine((value) => !value.startsWith("//")).default("/dashboard"),
  audience: z.enum(["owners", "admins", "clients", "all", "selected"]),
  userIds: z.array(z.uuid()).max(1000).default([]),
});

/** Push notification to a whole audience or a hand-picked list of users. */
export async function POST(request: Request) {
  const parsed = broadcastSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa el título, el mensaje y los destinatarios." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  if (!isPushConfigured()) return NextResponse.json({ error: "Las notificaciones push no están configuradas (VAPID)." }, { status: 503 });
  const { admin } = auth;
  const input = parsed.data;

  let recipients: string[];
  if (input.audience === "selected") {
    if (!input.userIds.length) return NextResponse.json({ error: "Selecciona al menos un usuario." }, { status: 400 });
    recipients = input.userIds;
  } else {
    let query = admin.from("profiles").select("id");
    if (input.audience !== "all") query = query.in("role", [...AUDIENCE_ROLES[input.audience]]);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: "No se pudieron cargar los destinatarios." }, { status: 500 });
    recipients = (data ?? []).map((profile) => profile.id);
  }

  const delivered = await sendPush(admin, recipients, { title: input.title, body: input.body, url: input.url, tag: `broadcast-${Date.now()}` });
  await admin.from("admin_broadcasts").insert({ title: input.title, body: input.body, url: input.url, audience: input.audience, recipient_count: recipients.length, delivered_count: delivered, sent_by: auth.user.id });
  return NextResponse.json({ recipients: recipients.length, delivered });
}
