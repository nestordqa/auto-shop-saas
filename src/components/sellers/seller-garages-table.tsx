import { formatMoney } from "@/lib/billing";
import { formatDate } from "@/lib/contracts";
import type { SellerGarage } from "@/lib/sellers";

const SOURCE_LABELS: Record<SellerGarage["signup_source"], string> = { admin: "Lo registró TorkeOS", seller: "Lo creó el vendedor", self: "Se registró con cupón" };

export function SellerGaragesTable({ garages, showRevenue = false }: { garages: SellerGarage[]; showRevenue?: boolean }) {
  if (!garages.length) return <p className="p-4 text-sm text-stone-500">Todavía no hay talleres.</p>;
  return (
    <ul className="divide-y divide-stone-100">
      {garages.map((garage) => (
        <li key={garage.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <span className="min-w-0"><span className="block font-bold break-words">{garage.name}</span><span className="text-xs text-stone-500">{SOURCE_LABELS[garage.signup_source]} · {formatDate(garage.created_at.slice(0, 10))}{garage.coupon_code ? ` · ${garage.coupon_code}` : ""}</span></span>
          <span className={`rounded-sm px-2 py-0.5 text-xs font-bold ${garage.hasPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{garage.hasPaid ? (showRevenue ? `Pagó ${formatMoney(garage.paid)}` : "Pagando") : "En prueba / sin pagos"}</span>
        </li>
      ))}
    </ul>
  );
}
