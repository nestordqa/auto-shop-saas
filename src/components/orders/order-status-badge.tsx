import { ORDER_STATUS_TONES } from "@/lib/order-status";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

export function OrderStatusBadge({ status, size = "sm" }: { status: OrderStatus; size?: "sm" | "lg" }) {
  const tone = ORDER_STATUS_TONES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-bold ${tone.badge} ${size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"}`}>
      <span className={`size-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
