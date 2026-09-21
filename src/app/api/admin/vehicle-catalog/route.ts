import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const catalogItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("brand"),
    name: z.string().trim().min(2).max(80),
    countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional().or(z.literal("")),
  }),
  z.object({
    type: z.literal("model"),
    brandId: z.uuid(),
    name: z.string().trim().min(1).max(100),
  }),
]);

export async function POST(request: Request) {
  const parsed = catalogItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Los datos del catálogo no son válidos." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "admin") {
    return NextResponse.json({ error: "Solo un administrador puede modificar el catálogo." }, { status: 403 });
  }

  const input = parsed.data;
  const operation = input.type === "brand"
    ? supabase.from("vehicle_brands").insert({
        name: input.name,
        country_code: input.countryCode || null,
      })
    : supabase.from("vehicle_models").insert({ brand_id: input.brandId, name: input.name });

  const { error } = await operation;
  if (error) {
    const duplicate = error.code === "23505";
    return NextResponse.json(
      { error: duplicate ? "Ese elemento ya existe en el catálogo." : "No se pudo guardar el elemento." },
      { status: duplicate ? 409 : 400 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}