import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";

import { PROSPECT_STATUSES, type ProspectStatus } from "@/lib/prospects";
import { sendPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

export type CompensationType = "commission" | "coupon";

export const COMPENSATION_LABELS: Record<CompensationType, string> = { commission: "Comisión", coupon: "Cupón" };

export type Seller = {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  instagram: string | null;
  compensation_type: CompensationType;
  commission_percent: number | string;
  coupon_code: string | null;
  coupon_reward: number | string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

export const SELLER_COLUMNS = "id, profile_id, first_name, last_name, phone, instagram, compensation_type, commission_percent, coupon_code, coupon_reward, is_active, notes, created_at";

export const sellerName = (seller: Pick<Seller, "first_name" | "last_name">) => `${seller.first_name} ${seller.last_name}`.trim();

export type SellerGarage = { id: string; name: string; slug: string; signup_source: "admin" | "seller" | "self"; coupon_code: string | null; created_at: string; paid: number; hasPaid: boolean };

export type SellerStats = {
  garages: SellerGarage[];
  /** Garages with at least one confirmed plan payment. */
  payingGarages: number;
  /** Sum of the confirmed plan payments of their garages (USD). */
  revenue: number;
  earned: number;
  paidOut: number;
  balance: number;
  prospects: { total: number; byStatus: Record<ProspectStatus, number>; conversion: number };
  payouts: { id: string; amount: number; reference: string | null; note: string | null; paid_on: string }[];
};

/** Earnings rule: commission = % of confirmed payments; coupon = fixed reward per garage that paid at least once. */
export function sellerEarnings(seller: Pick<Seller, "compensation_type" | "commission_percent" | "coupon_reward">, revenue: number, payingGarages: number) {
  return seller.compensation_type === "commission"
    ? Math.round(revenue * Number(seller.commission_percent)) / 100
    : payingGarages * Number(seller.coupon_reward);
}

/** Metrics of many sellers at once (garages, earnings, payouts and prospect counts — never the prospects themselves). */
export async function loadSellerStats(admin: SupabaseClient, sellers: Seller[]): Promise<Map<string, SellerStats>> {
  const ids = sellers.map((seller) => seller.id);
  const result = new Map<string, SellerStats>();
  if (!ids.length) return result;

  const [{ data: garages }, { data: prospects }, { data: payouts }] = await Promise.all([
    admin.from("garages").select("id, name, slug, seller_id, signup_source, coupon_code, created_at").in("seller_id", ids).order("created_at", { ascending: false }),
    admin.from("garage_prospects").select("seller_id, status").in("seller_id", ids),
    admin.from("seller_payouts").select("id, seller_id, amount, reference, note, paid_on").in("seller_id", ids).order("paid_on", { ascending: false }),
  ]);
  const garageIds = (garages ?? []).map((garage) => garage.id as string);
  const { data: contracts } = garageIds.length ? await admin.from("contracts").select("id, garage_id").in("garage_id", garageIds) : { data: [] };
  const contractIds = (contracts ?? []).map((contract) => contract.id as string);
  const { data: payments } = contractIds.length ? await admin.from("contract_payments").select("contract_id, amount").in("contract_id", contractIds) : { data: [] };

  const garageOfContract = new Map((contracts ?? []).map((contract) => [contract.id as string, contract.garage_id as string]));
  const paidByGarage = new Map<string, number>();
  for (const payment of payments ?? []) {
    const garageId = garageOfContract.get(payment.contract_id as string);
    if (garageId) paidByGarage.set(garageId, (paidByGarage.get(garageId) ?? 0) + Number(payment.amount));
  }

  for (const seller of sellers) {
    const own = (garages ?? []).filter((garage) => garage.seller_id === seller.id).map((garage) => {
      const paid = paidByGarage.get(garage.id as string) ?? 0;
      return { id: garage.id, name: garage.name, slug: garage.slug, signup_source: garage.signup_source, coupon_code: garage.coupon_code, created_at: garage.created_at, paid, hasPaid: paid > 0 } as SellerGarage;
    });
    const revenue = own.reduce((sum, garage) => sum + garage.paid, 0);
    const payingGarages = own.filter((garage) => garage.hasPaid).length;
    const earned = sellerEarnings(seller, revenue, payingGarages);
    const sellerPayouts = (payouts ?? []).filter((payout) => payout.seller_id === seller.id).map((payout) => ({ id: payout.id as string, amount: Number(payout.amount), reference: payout.reference as string | null, note: payout.note as string | null, paid_on: payout.paid_on as string }));
    const paidOut = sellerPayouts.reduce((sum, payout) => sum + payout.amount, 0);
    const byStatus = Object.fromEntries(PROSPECT_STATUSES.map((status) => [status, 0])) as Record<ProspectStatus, number>;
    for (const prospect of (prospects ?? []).filter((row) => row.seller_id === seller.id)) byStatus[prospect.status as ProspectStatus] += 1;
    const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);
    const closed = byStatus.won + byStatus.lost;
    result.set(seller.id, {
      garages: own,
      payingGarages,
      revenue,
      earned,
      paidOut,
      balance: Math.round((earned - paidOut) * 100) / 100,
      prospects: { total, byStatus, conversion: closed ? Math.round(byStatus.won / closed * 100) : 0 },
      payouts: sellerPayouts,
    });
  }
  return result;
}

/** The signed-in user's seller record (active), or null. */
export async function sellerForProfile(admin: SupabaseClient, profileId: string) {
  const { data } = await admin.from("sellers").select(SELLER_COLUMNS).eq("profile_id", profileId).maybeSingle();
  return data as Seller | null;
}

export const percent = (value: number, total: number) => (total ? Math.round(value / total * 100) : 0);

/** Every admin hears about a garage that joined through a seller or by itself. */
export function notifyAdminsGarageCreated(garageName: string, how: { source: "seller" | "self"; sellerName?: string | null }) {
  after(async () => {
    const admin = createAdminClient();
    if (!admin) return;
    try {
      const { data } = await admin.from("profiles").select("id").eq("role", "admin");
      const ids = (data ?? []).map((profile) => profile.id as string);
      const body = how.source === "seller"
        ? `${how.sellerName ?? "Un vendedor"} registró el taller ${garageName}.`
        : `${garageName} se registró por su cuenta${how.sellerName ? ` con el cupón de ${how.sellerName}` : ""}.`;
      await sendPush(admin, ids, { title: "Nuevo taller registrado", body, url: "/dashboard/admin/garages", tag: `garage-created-${garageName}` });
    } catch (error) {
      console.error("[seller notifications]", error);
    }
  });
}
