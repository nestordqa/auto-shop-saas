import { z } from "zod";

const VE_CODE = "58";

/**
 * Stores every phone as E.164 (`+584121385416`) so it works for WhatsApp links.
 * Venezuelan numbers are accepted in any common form: 584121385416, +58 412-138-5416, 04121385416, 4121385416.
 * A number written with `+`/`00` and another country code is kept as is.
 */
export function normalizePhone(value: string) {
  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, "");
  const international = trimmed.startsWith("+") || digits.startsWith("00");
  digits = digits.replace(/^00/, "");
  if (!digits) return "";
  if (digits.startsWith(VE_CODE) && digits.length === 12) return `+${digits}`;
  // "+58 0412..." — the trunk 0 sneaks in after the country code.
  if (digits.startsWith(`${VE_CODE}0`) && digits.length === 13) return `+${VE_CODE}${digits.slice(3)}`;
  if (international) return `+${digits}`;
  const national = digits.replace(/^0+/, "");
  return `+${VE_CODE}${national}`;
}

/** Digits only, as wa.me expects. */
export function whatsAppDigits(value: string) {
  return normalizePhone(value).replace(/\D/g, "");
}

export const phoneSchema = z.string().trim().min(7).max(30).transform(normalizePhone).refine((phone) => /^\+\d{10,15}$/.test(phone), "Teléfono inválido.");
