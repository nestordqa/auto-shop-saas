import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toUrlSlug } from "@/lib/slugs";

const garageSchema = z.discriminatedUnion("ownerMode", [
  z.object({
    ownerMode: z.literal("existing"),
    ownerId: z.uuid(),
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(5).max(300),
    mapLocation: z.string().trim().max(500).optional(),
  }),
  z.object({
    ownerMode: z.literal("new"),
    ownerName: z.string().trim().min(2).max(120),
    ownerEmail: z.email(),
    ownerPhone: z.string().trim().min(7).max(30),
    ownerDocument: z.string().trim().min(4).max(30),
    temporaryPassword: z.string().min(8).max(72),
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(5).max(300),
    mapLocation: z.string().trim().max(500).optional(),
  }),
]);

export async function POST(request: Request) {
  const parsed = garageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del taller y owner." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "admin") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const input = parsed.data;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La creación de talleres no está configurada." }, { status: 503 });
  let ownerId = input.ownerMode === "existing" ? input.ownerId : "";
  let createdAuthUser = false;

  if (input.ownerMode === "new") {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.ownerEmail,
      password: input.temporaryPassword,
      email_confirm: true,
      app_metadata: { role: "garage_owner" },
      user_metadata: { full_name: input.ownerName, phone: input.ownerPhone },
    });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? "No se pudo crear el owner." }, { status: 400 });
    }
    ownerId = data.user.id;
    createdAuthUser = true;
    const { error: profileError } = await admin.from("profiles").update({
      full_name: input.ownerName,
      phone: input.ownerPhone,
      document_id: input.ownerDocument,
      role: "garage_owner",
    }).eq("id", ownerId).select("id").single();
    if (profileError) {
      await admin.auth.admin.deleteUser(ownerId);
      return NextResponse.json({ error: "No se pudo sincronizar el perfil del owner." }, { status: 500 });
    }
  } else {
    const { data: owner } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", ownerId)
      .eq("role", "garage_owner")
      .maybeSingle();
    if (!owner) return NextResponse.json({ error: "El owner no existe o ya no está disponible." }, { status: 400 });
  }

  const baseSlug = toUrlSlug(input.name);
  const { data: matchingSlugs } = await admin.from("garages").select("slug").like("slug", `${baseSlug}%`);
  const usedSlugs = new Set((matchingSlugs ?? []).map(({ slug }) => slug));
  let slug = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
  const { error: garageError } = await admin.from("garages").insert({
    name: input.name,
    slug,
    address: input.address,
    map_location: input.mapLocation || null,
    owner_id: ownerId,
  });

  if (garageError) {
    if (createdAuthUser) await admin.auth.admin.deleteUser(ownerId);
    return NextResponse.json({ error: garageError.code === "23505" ? "Ese owner ya tiene un taller." : "No se pudo crear el taller." }, { status: 409 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}