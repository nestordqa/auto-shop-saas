import { whatsAppDigits } from "@/lib/phone";

const configured = process.env.NEXT_PUBLIC_TORKEOS_WHATSAPP?.trim() ?? "";

/**
 * TorkeOS sales/support WhatsApp, from NEXT_PUBLIC_TORKEOS_WHATSAPP (any format: 0412..., +58...).
 * Empty when the variable is not set, so callers can hide or replace WhatsApp buttons.
 */
export const TORKEOS_WHATSAPP = configured ? whatsAppDigits(configured) : "";

/** wa.me link to TorkeOS with a prefilled message, or null when the number is not configured. */
export function torkeosWhatsAppUrl(message: string) {
  return TORKEOS_WHATSAPP ? `https://wa.me/${TORKEOS_WHATSAPP}?text=${encodeURIComponent(message)}` : null;
}
