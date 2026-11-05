import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { SellerFormModal } from "@/components/admin/seller-form-modal";
import { StatCard } from "@/components/sellers/seller-metrics";
import { requireRole } from "@/lib/auth/require-role";
import { formatMoney } from "@/lib/billing";
import { COMPENSATION_LABELS, loadSellerStats, SELLER_COLUMNS, sellerName, type Seller } from "@/lib/sellers";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SellersPage() {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  if (!admin) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Vendedores</h1><p className="mt-2 text-stone-600">Configura SUPABASE_SECRET_KEY para gestionar vendedores.</p></div>;
  const { data, error } = await admin.from("sellers").select(SELLER_COLUMNS).order("created_at", { ascending: false });
  if (error) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Vendedores</h1><p className="mt-2 text-stone-600">No se pudieron cargar los vendedores. ¿Ejecutaste las migraciones 041 y 042?</p></div>;
  const sellers = (data ?? []) as Seller[];
  const stats = await loadSellerStats(admin, sellers);
  const all = [...stats.values()];
  const sum = (pick: (value: (typeof all)[number]) => number) => all.reduce((total, value) => total + pick(value), 0);

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Vendedores</h1><p className="mt-1 text-sm text-stone-600">Promotores e influencers: talleres que trajeron, comisiones y su embudo de prospectos.</p></div><SellerFormModal /></header>

    <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard label="Vendedores activos" value={sellers.filter((seller) => seller.is_active).length} />
      <StatCard label="Talleres traídos" value={sum((value) => value.garages.length)} />
      <StatCard label="Prospectos de vendedores" value={sum((value) => value.prospects.total)} />
      <StatCard label="Comisiones generadas" value={formatMoney(sum((value) => value.earned))} />
      <StatCard label="Por pagar" value={formatMoney(sum((value) => Math.max(value.balance, 0)))} />
    </section>

    <div className="mt-5 grid gap-3">
      {sellers.map((seller) => {
        const stat = stats.get(seller.id)!;
        return <Link key={seller.id} href={`/dashboard/admin/sellers/${seller.id}`} className="group grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:border-stone-400 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto] sm:items-center">
          <div className="min-w-0"><p className="font-bold break-words">{sellerName(seller)} {!seller.is_active && <span className="ml-1 rounded-sm bg-stone-200 px-2 py-0.5 text-xs font-bold text-stone-600">Inactivo</span>}</p><p className="text-xs text-stone-500">{[seller.phone, seller.instagram].filter(Boolean).join(" · ") || "Sin contacto"}</p><p className="mt-1 text-xs font-semibold text-[#d9341d]">{COMPENSATION_LABELS[seller.compensation_type]} · {seller.compensation_type === "commission" ? `${Number(seller.commission_percent)}%` : `${formatMoney(Number(seller.coupon_reward))} por taller`}{seller.coupon_code ? ` · ${seller.coupon_code}` : ""}</p></div>
          <Cell label="Talleres" value={`${stat.garages.length} (${stat.payingGarages} pagando)`} />
          <Cell label="Prospectos" value={`${stat.prospects.total} · ${stat.prospects.conversion}% conv.`} />
          <Cell label="Generado" value={formatMoney(stat.earned)} />
          <Cell label="Saldo" value={formatMoney(stat.balance)} />
          <ChevronRight className="hidden text-stone-400 group-hover:text-stone-900 sm:block" />
        </Link>;
      })}
      {!sellers.length && <p className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-500">Aún no hay vendedores. Crea el primero.</p>}
    </div>
  </div>;
}

function Cell({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-xs text-stone-500">{label}</p><p className="font-semibold">{value}</p></div>;
}
