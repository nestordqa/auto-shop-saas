import "server-only";

import { z } from "zod";

import { phoneSchema } from "@/lib/phone";
import { PROSPECT_STATUSES } from "@/lib/prospects";

const optional = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);

export const prospectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactName: optional(120),
  phone: z.union([z.literal(""), phoneSchema]).optional().transform((value) => value || null),
  email: z.union([z.literal(""), z.email()]).optional().transform((value) => value || null),
  instagram: optional(200),
  facebook: optional(200),
  tiktok: optional(200),
  website: optional(300),
  city: optional(120),
  isLocal: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  address: optional(300),
  mapLocation: optional(500),
  specialty: optional(120),
  source: optional(60),
  status: z.enum(PROSPECT_STATUSES).default("new"),
  lostReason: optional(300),
  nextFollowUp: z.union([z.literal(""), z.iso.date()]).optional().transform((value) => value || null),
  notes: optional(2000),
});

export function prospectRow(input: z.infer<typeof prospectSchema>) {
  return {
    name: input.name,
    contact_name: input.contactName,
    phone: input.phone,
    email: input.email,
    instagram: input.instagram,
    facebook: input.facebook,
    tiktok: input.tiktok,
    website: input.website,
    city: input.city,
    is_local: input.isLocal,
    address: input.address,
    map_location: input.mapLocation,
    specialty: input.specialty,
    source: input.source,
    status: input.status,
    lost_reason: input.status === "lost" ? input.lostReason : null,
    next_follow_up: input.nextFollowUp,
    notes: input.notes,
  };
}
