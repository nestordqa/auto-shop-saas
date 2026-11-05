import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SellerFormModal } from "@/components/admin/seller-form-modal";
import { SellerPayoutDelete, SellerPayoutForm } from "@/components/admin/seller-payouts";
import { CouponQr } from "@/components/sellers/coupon-qr";
import { ProspectFunnel, SellerEarningsCards } from "@/components/sellers/seller-metrics";
import { SellerGaragesTable } from "@/components/sellers/seller-garages-table";
import { requireRole } from "@/lib/auth/require-role";
import { formatMoney } from "@/lib/billing";
import { formatDate } from "@/lib/contracts";
import { COMPENSATION_LABELS, loadSellerStats, SELLER_COLUMNS, sellerName, type Seller } from "@/lib/sellers";
import { siteUrl } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SellerDetailPage({ params }: { params: Promise<{ sellerId: string }> }) {
  await requireRole(["admin"]);
  const { sellerId } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();
  const { data } = await admin.from("sellers").select(SELLER_COLUMNS).eq("id", sellerId).maybeSingle();
  if (!data) notFound();
  const seller = data as Seller;
  const stats = (await loadSellerStats(admin, [seller])).get(seller.id)!;
  const { data: account } = await admin.auth.admin.getUserById(seller.profile_id);

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <Link href="/dashboard/admin/sellers" className="inline-flex items-center gap-1 text-sm font-bold text-stone-600 hover:text-stone-900"><ArrowLeft size={16} /> Vendedores</Link>
    <header className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0"><p className="text-xs font-bold uppercase text-[#d9341d]">{COMPENSATION_LABELS[seller.compensation_type]} · {seller.compensation_type === "commission" ? `${Number(seller.commission_percent)}% de los pagos` : `${formatMoney(Number(seller.coupon_reward))} por taller que paga`}</p><h1 className="mt-2 break-words font-display text-3xl font-bold sm:text-4xl">{sellerName(seller)}</h1><p className="mt-1 text-sm text-stone-600">{[account.user?.email, seller.phone, seller.instagram].filter(Boolean).join(" · ")}{!seller.is_active && " · Inactivo"}</p></div>
      <SellerFormModal seller={{ id: seller.id, firstName: seller.first_name, lastName: seller.last_name, phone: seller.phone, instagram: seller.instagram, compensationType: seller.compensation_type, commissionPercent: Number(seller.commission_percent), couponCode: seller.coupon_code, couponReward: Number(seller.coupon_reward), isActive: seller.is_active, notes: seller.notes }} />
    </header>

    <div className="mt-6 grid gap-5">
      <SellerEarningsCards stats={stats} />
      <ProspectFunnel stats={stats} />
      {seller.coupon_code && <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"><h2 className="mb-3 font-bold">Cupón y QR de registro</h2><CouponQr code={seller.coupon_code} baseUrl={siteUrl} /></section>}
      <section className="rounded-lg border border-stone-200 bg-white shadow-sm"><h2 className="p-4 pb-0 font-bold">Talleres que trajo</h2><SellerGaragesTable garages={stats.garages} showRevenue /></section>
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold">Pagos al vendedor</h2>
        <p className="mt-1 text-sm text-stone-600">Generado {formatMoney(stats.earned)} · pagado {formatMoney(stats.paidOut)} · saldo <strong>{formatMoney(stats.balance)}</strong></p>
        <div className="mt-3"><SellerPayoutForm sellerId={seller.id} suggested={stats.balance} /></div>
        <ul className="mt-3 divide-y divide-stone-100">{stats.payouts.map((payout) => <li key={payout.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0"><strong>{formatMoney(payout.amount)}</strong> · {formatDate(payout.paid_on)}{payout.reference && <span className="text-stone-500"> · {payout.reference}</span>}</span><SellerPayoutDelete sellerId={seller.id} payoutId={payout.id} /></li>)}{!stats.payouts.length && <li className="py-2 text-sm text-stone-500">Aún no hay pagos registrados.</li>}</ul>
      </section>
      {seller.notes && <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm shadow-sm"><h2 className="font-bold">Notas</h2><p className="mt-1 whitespace-pre-line text-stone-600">{seller.notes}</p></section>}
    </div>
  </div>;
}
