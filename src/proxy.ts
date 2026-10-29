import type { NextRequest } from "next/server";

import { GARAGE_CONTEXT_COOKIE, GARAGE_CONTEXT_MAX_AGE, garageLoginSlug } from "@/lib/garage-context";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;
  // /login/<slug> scopes the session to that garage; the plain /login shows every garage.
  const slug = garageLoginSlug(pathname);
  if (slug) {
    request.cookies.set(GARAGE_CONTEXT_COOKIE, slug);
    response.cookies.set(GARAGE_CONTEXT_COOKIE, slug, { path: "/", maxAge: GARAGE_CONTEXT_MAX_AGE, sameSite: "lax" });
  } else if (pathname === "/login") {
    response.cookies.delete(GARAGE_CONTEXT_COOKIE);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
