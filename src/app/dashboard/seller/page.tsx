import { ArrowRight, Target, Wrench } from "lucide-react";
import Link from "next/link";

import { CouponQr } from "@/components/sellers/coupon-qr";
import { ProspectFunnel, SellerEarningsCards } from "@/components/sellers/seller-metrics";
import { requireSeller } from "@/lib/auth/require-seller";
import { formatMoney } from "@/lib/billing";
import { formatDate } from "@/lib/contracts";
import { loadSellerStats, sellerName } from "@/lib/sellers";
import { siteUrl } from "@/lib/seo";

export default async function SellerHomePage() {
  const { admin, seller } = await requireSeller();
  const stats = (await loadSellerStats(admin, [seller])).get(seller.id)!;
  const rule = seller.compensation_type === "commission"
    ? `Ganas el ${Number(seller.commission_percent)}% de cada pago de plan de los talleres que traes.`
    : `Ganas ${formatMoney(Number(seller.coupon_reward))} por cada taller que traes, cuando paga su primer período.`;

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header><p className="text-xs font-bold uppercase text-[#d9341d]">Panel de vendedor</p><h1 className="mt-2 break-words font-display text-3xl font-bold sm:text-4xl">Hola, {sellerName(seller).split(" ")[0]}</h1><p className="mt-1 text-sm text-stone-600">{rule}</p></header>
    <div className="mt-6 grid gap-5">
      <SellerEarningsCards stats={stats} />
      <ProspectFunnel stats={stats} />
      <section className="grid gap-4 lg:grid-cols-2">
        <Link href="/dashboard/seller/prospects" className="group flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-400"><span className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-md bg-stone-900 text-white"><Target size={21} /></span><span><span className="block font-bold">Mis prospectos</span><span className="text-sm text-stone-500">Registra y da seguimiento a tus talleres.</span></span></span><ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" /></Link>
        <Link href="/dashboard/seller/garages" className="group flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-400"><span className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-md bg-[#ef3f26] text-white"><Wrench size={21} /></span><span><span className="block font-bold">Mis talleres</span><span className="text-sm text-stone-500">Crea talleres y revisa cuáles ya pagan.</span></span></span><ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" /></Link>
      </section>
      {seller.coupon_code && <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"><h2 className="font-bold">Tu cupón y QR</h2><p className="mb-3 mt-1 text-sm text-stone-600">El taller escanea el QR, se registra solo y queda a tu nombre. También puede escribir tu cupón al crear su cuenta.</p><CouponQr code={seller.coupon_code} baseUrl={siteUrl} /></section>}
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold">Pagos recibidos</h2>
        <ul className="mt-2 divide-y divide-stone-100">{stats.payouts.map((payout) => <li key={payout.id} className="py-2 text-sm"><strong>{formatMoney(payout.amount)}</strong> · {formatDate(payout.paid_on)}{payout.reference && <span className="text-stone-500"> · {payout.reference}</span>}</li>)}{!stats.payouts.length && <li className="py-2 text-sm text-stone-500">Aún no hay pagos registrados.</li>}</ul>
      </section>
    </div>
  </div>;
}
