/**
 * The garage a client is browsing for. Set by entering through /login/<slug> or the garage's
 * public page, cleared by the plain /login. Without it the client sees every garage.
 */
export const GARAGE_CONTEXT_COOKIE = "garage_context";
export const GARAGE_CONTEXT_MAX_AGE = 60 * 60 * 24 * 365;

/** Garages the client has entered through a link on this device (most recent first), for "Mis talleres frecuentes". */
export const GARAGE_HISTORY_COOKIE = "garage_history";
const GARAGE_HISTORY_LIMIT = 10;

/** Comma list of slugs with `slug` moved to the front. */
export function withGarageInHistory(current: string | undefined, slug: string) {
  const slugs = (current ? decodeURIComponent(current).split(",") : []).filter((item) => /^[a-z0-9-]+$/.test(item) && item !== slug);
  return [slug, ...slugs].slice(0, GARAGE_HISTORY_LIMIT).join(",");
}

/** Browser side: remember a garage the client just opened. */
export function rememberGarage(slug: string) {
  const current = document.cookie.split("; ").find((item) => item.startsWith(`${GARAGE_HISTORY_COOKIE}=`))?.split("=")[1];
  document.cookie = `${GARAGE_HISTORY_COOKIE}=${encodeURIComponent(withGarageInHistory(current, slug))}; path=/; max-age=${GARAGE_CONTEXT_MAX_AGE}; samesite=lax`;
}

const GARAGE_LOGIN = /^\/login\/([a-z0-9-]+)\/?$/;

/** Slug from a /login/<slug> path. */
export function garageLoginSlug(pathname: string) {
  return GARAGE_LOGIN.exec(pathname)?.[1];
}
