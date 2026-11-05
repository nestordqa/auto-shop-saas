import "server-only";

import { z } from "zod";

import { phoneSchema } from "@/lib/phone";

const optional = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);

const sellerBase = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.union([z.literal(""), phoneSchema]).optional().transform((value) => value || null),
  instagram: optional(200),
  compensationType: z.enum(["commission", "coupon"]),
  commissionPercent: z.coerce.number().min(0).max(100).default(0),
  couponCode: z.string().trim().toUpperCase().max(30).optional().transform((value) => value || null).refine((value) => value === null || /^[A-Z0-9-]{3,30}$/.test(value)),
  couponReward: z.coerce.number().min(0).max(100000).default(0),
  notes: optional(2000),
  isActive: z.enum(["true", "false"]).optional().transform((value) => value !== "false"),
});

const couponRequired = (value: { compensationType: string; couponCode: string | null }) => value.compensationType !== "coupon" || Boolean(value.couponCode);
const couponIssue = { path: ["couponCode"], message: "Un vendedor por cupón necesita un código." };

export const sellerCreateSchema = sellerBase.extend({ email: z.email(), temporaryPassword: z.string().min(8).max(72) }).refine(couponRequired, couponIssue);
export const sellerUpdateSchema = sellerBase.refine(couponRequired, couponIssue);

export function sellerRow(input: z.infer<typeof sellerUpdateSchema>) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    instagram: input.instagram,
    compensation_type: input.compensationType,
    commission_percent: input.compensationType === "commission" ? input.commissionPercent : 0,
    coupon_code: input.couponCode,
    coupon_reward: input.compensationType === "coupon" ? input.couponReward : 0,
    notes: input.notes,
    is_active: input.isActive,
  };
}

export const payoutSchema = z.object({
  amount: z.coerce.number().positive().max(1000000),
  reference: optional(200),
  note: optional(500),
  paidOn: z.union([z.literal(""), z.iso.date()]).optional().transform((value) => value || null),
});
