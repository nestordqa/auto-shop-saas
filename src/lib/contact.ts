import { whatsAppDigits } from "@/lib/phone";

// NEXT_PUBLIC_* must be read literally so Next.js inlines them in client bundles.
const digits = (value: string | undefined) => (value?.trim() ? whatsAppDigits(value.trim()) : "");

/**
 * TorkeOS sales WhatsApp (landing, garage affiliation), from NEXT_PUBLIC_TORKEOS_WHATSAPP (any format: 0412..., +58...).
 * Empty when the variable is not set, so callers can hide or replace WhatsApp buttons.
 */
export const TORKEOS_WHATSAPP = digits(process.env.NEXT_PUBLIC_TORKEOS_WHATSAPP);

/** TorkeOS support WhatsApp (Soporte button), from NEXT_PUBLIC_TORKEOS_SUPPORT_WHATSAPP. Empty when not set. */
export const TORKEOS_SUPPORT_WHATSAPP = digits(process.env.NEXT_PUBLIC_TORKEOS_SUPPORT_WHATSAPP);

const waUrl = (number: string, message: string) => (number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null);

/** wa.me link to TorkeOS sales with a prefilled message, or null when the number is not configured. */
export function torkeosWhatsAppUrl(message: string) {
  return waUrl(TORKEOS_WHATSAPP, message);
}

/** wa.me link to TorkeOS support with a prefilled message, or null when the number is not configured. */
export function torkeosSupportUrl(message: string) {
  return waUrl(TORKEOS_SUPPORT_WHATSAPP, message);
}
