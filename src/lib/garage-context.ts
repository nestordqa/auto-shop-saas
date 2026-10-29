/**
 * The garage a client is browsing for. Set by entering through /login/<slug> or the garage's
 * public page, cleared by the plain /login. Without it the client sees every garage.
 */
export const GARAGE_CONTEXT_COOKIE = "garage_context";
export const GARAGE_CONTEXT_MAX_AGE = 60 * 60 * 24 * 365;

const GARAGE_LOGIN = /^\/login\/([a-z0-9-]+)\/?$/;

/** Slug from a /login/<slug> path. */
export function garageLoginSlug(pathname: string) {
  return GARAGE_LOGIN.exec(pathname)?.[1];
}
