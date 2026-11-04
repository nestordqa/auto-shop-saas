import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Clients registered by a garage without email (many older clients have none) still need an auth user,
 * because profiles and vehicles hang from it. They get an internal address on this domain and a random
 * password nobody knows; the garage keeps them informed by WhatsApp and can give them app access later.
 */
const PLACEHOLDER_DOMAIN = "sin-correo.torkeos.com";

export function placeholderEmail() {
  return `cliente-${randomBytes(8).toString("hex")}@${PLACEHOLDER_DOMAIN}`;
}

export function placeholderPassword() {
  return randomBytes(24).toString("base64url");
}

/** True for a client the garage registered without app access. */
export function hasNoAppAccess(email: string | null | undefined) {
  return !email || email.toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`);
}

/** Signed links so a client without an account can open a document (e.g. the intake PDF) sent by WhatsApp. */
function shareSecret() {
  const secret = process.env.SHARE_LINK_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SHARE_LINK_SECRET is not configured.");
  return secret;
}

export function shareToken(kind: string, id: string) {
  return createHmac("sha256", shareSecret()).update(`${kind}:${id}`).digest("base64url").slice(0, 32);
}

export function isValidShareToken(kind: string, id: string, token: string | undefined) {
  if (!token) return false;
  try {
    const expected = Buffer.from(shareToken(kind, id));
    const received = Buffer.from(token);
    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
