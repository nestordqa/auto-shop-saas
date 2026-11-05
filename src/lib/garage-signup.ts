import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { addDays, formatDate, todayDate, TRIAL_DAYS } from "@/lib/contracts";
import { createContract } from "@/lib/contracts-create";
import { specialtySummary } from "@/lib/mechanics";
import { phoneSchema } from "@/lib/phone";
import { PLAN_KEYS, type PlanKey } from "@/lib/plans";
import { toUrlSlug } from "@/lib/slugs";
import { locationFieldsSchema } from "@/lib/locations";
import { resolveLocation } from "@/lib/locations-data";
import { validSpecialtyKeys } from "@/lib/specialties-data";
import { TERMS_VERSION } from "@/lib/terms";

export type SignupSource = "admin" | "seller" | "self";

/** Garage fields shared by every way of creating a garage. */
export const garageFieldsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(300),
  mapLocation: z.string().trim().max(500).optional(),
  specialties: z.array(z.string().regex(/^[a-z0-9_]+$/).max(60)).max(40).default(["general"]),
  legalName: z.string().trim().max(160).optional(),
  legalId: z.string().trim().max(30).optional(),
}).extend(locationFieldsSchema.shape);

/** A brand-new owner account. */
export const newOwnerSchema = z.object({
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.email(),
  ownerPhone: phoneSchema,
  ownerDocument: z.string().trim().min(4).max(30),
});

export const startSchema = z.enum(["trial", ...PLAN_KEYS]).default("trial");

type GarageFields = z.infer<typeof garageFieldsSchema>;
/** `welcome`: the account was created for them (admin / seller), so their first sign-in shows the welcome modal. */
type NewOwner = z.infer<typeof newOwnerSchema> & { password: string; acceptedTerms?: boolean; welcome?: boolean };

export type CreatedGarage = { id: string; name: string; slug: string; ownerPhone: string | null; contractId: string | null; trialEnds: string | null };

export function normalizeCoupon(value: string | null | undefined) {
  const code = (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  return code || null;
}

/** Active seller owning this coupon, or null. */
export async function sellerForCoupon(admin: SupabaseClient, coupon: string | null) {
  if (!coupon) return null;
  const { data } = await admin.from("sellers").select("id, first_name, last_name").eq("coupon_code", coupon).eq("is_active", true).maybeSingle();
  return data as { id: string; first_name: string; last_name: string } | null;
}

/** Creates the owner's auth account + profile. Returns the new user id or an error message. */
export async function createOwnerAccount(admin: SupabaseClient, owner: NewOwner): Promise<{ id: string } | { error: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email: owner.ownerEmail,
    password: owner.password,
    email_confirm: true,
    app_metadata: { role: "garage_owner" },
    user_metadata: { full_name: owner.ownerName, phone: owner.ownerPhone, ...(owner.welcome && { show_welcome: true }) },
  });
  if (error || !data.user) {
    const exists = error && (error.code === "email_exists" || /already|registered/i.test(error.message));
    return { error: exists ? "Ya existe una cuenta con ese correo." : error?.message ?? "No se pudo crear el administrador." };
  }
  const { error: profileError } = await admin.from("profiles").update({
    full_name: owner.ownerName,
    phone: owner.ownerPhone,
    document_id: owner.ownerDocument,
    role: "garage_owner",
    ...(owner.acceptedTerms && { terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION }),
  }).eq("id", data.user.id).select("id").single();
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "No se pudo sincronizar el perfil del administrador." };
  }
  return { id: data.user.id };
}

/**
 * Inserts the garage for an existing owner, attributes it to a seller (if any) and issues its first contract.
 * On failure the caller decides whether to delete a freshly created owner.
 */
export async function insertGarage(admin: SupabaseClient, input: {
  ownerId: string;
  fields: GarageFields;
  start: "trial" | PlanKey;
  createdBy: string;
  source: SignupSource;
  sellerId?: string | null;
  couponCode?: string | null;
  prospectId?: string | null;
}): Promise<{ garage: CreatedGarage } | { error: string; status: number }> {
  const { fields } = input;
  const location = await resolveLocation(admin, fields, input.createdBy);
  if ("error" in location) return { error: location.error, status: 400 };
  const specialties = await validSpecialtyKeys(admin, fields.specialties);
  const baseSlug = toUrlSlug(fields.name);
  const { data: matchingSlugs } = await admin.from("garages").select("slug").like("slug", `${baseSlug}%`);
  const usedSlugs = new Set((matchingSlugs ?? []).map(({ slug }) => slug));
  let slug = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;

  const { data: garage, error } = await admin.from("garages").insert({
    name: fields.name,
    slug,
    address: fields.address,
    map_location: fields.mapLocation || null,
    legal_name: fields.legalName || null,
    legal_id: fields.legalId?.toUpperCase() || null,
    specialty: specialtySummary(specialties.keys, specialties.options),
    specialties: specialties.keys.length ? specialties.keys : ["general"],
    plan: input.start === "trial" ? null : input.start,
    owner_id: input.ownerId,
    ...location,
    signup_source: input.source,
    seller_id: input.sellerId ?? null,
    coupon_code: input.couponCode ?? null,
  }).select("id").single();
  if (error) console.error("insertGarage failed", error);
  if (error || !garage) return { error: error?.code === "23505" ? "Ese administrador ya tiene un taller." : "No se pudo crear el taller.", status: 409 };

  // Created from a prospect: close it as won and link it to the new garage.
  if (input.prospectId) await admin.from("garage_prospects").update({ status: "won", garage_id: garage.id, next_follow_up: null }).eq("id", input.prospectId);

  // Every garage starts with a contract: the free month ($0) or the chosen plan from today.
  const startDate = todayDate();
  const contract = await createContract(admin, input.start === "trial"
    ? { kind: "trial", garageId: garage.id, startDate, createdBy: input.createdBy }
    : { kind: "paid", garageId: garage.id, startDate, plan: input.start, billingCycle: "monthly", createdBy: input.createdBy });
  const contractId = "id" in contract ? contract.id : null;

  const { data: ownerProfile } = await admin.from("profiles").select("phone").eq("id", input.ownerId).maybeSingle();
  return {
    garage: {
      id: garage.id as string,
      name: fields.name,
      slug,
      ownerPhone: ownerProfile?.phone ?? null,
      contractId,
      trialEnds: contractId && input.start === "trial" ? formatDate(addDays(startDate, TRIAL_DAYS - 1)) : null,
    },
  };
}
