import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { createContract } from "@/lib/contracts-create";
import { PLAN_KEYS } from "@/lib/plans";

const contractSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("trial"), garageId: z.uuid(), startDate: z.iso.date(), notes: z.string().trim().max(2000).optional() }),
  z.object({
    kind: z.literal("paid"),
    garageId: z.uuid(),
    startDate: z.iso.date(),
    plan: z.enum(PLAN_KEYS),
    /** Only Pistón (commission) can settle weekly or biweekly; subscriptions are monthly. */
    billingCycle: z.enum(["weekly", "biweekly", "monthly"]).default("monthly"),
    notes: z.string().trim().max(2000).optional(),
  }),
]);

export async function POST(request: Request) {
  const parsed = contractSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del contrato." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const result = await createContract(auth.admin, { ...parsed.data, createdBy: auth.user.id });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id: result.id }, { status: 201 });
}
