import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GARAGE_CONTEXT_COOKIE } from "@/lib/garage-context";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Back to the garage's own login when the session was scoped to one.
  const slug = (await cookies()).get(GARAGE_CONTEXT_COOKIE)?.value;
  return NextResponse.redirect(new URL(slug ? `/login/${encodeURIComponent(slug)}` : "/login", request.url), { status: 303 });
}
