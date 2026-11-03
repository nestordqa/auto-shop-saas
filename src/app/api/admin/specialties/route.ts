import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { catalogKey } from "@/lib/catalog-keys";

const createSchema = z.object({ label: z.string().trim().min(2, "El nombre es muy corto.").max(80) });
const updateSchema = z.object({ key: z.string().regex(/^[a-z0-9_]+$/), label: z.string().trim().min(2).max(80).optional(), isActive: z.boolean().optional() });

/** Admin: new specialty (garages, mechanics and the repair catalog use it right away). */
export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa el nombre." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { data: last } = await auth.admin.from("service_specialties").select("sort_order").neq("key", "general").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await auth.admin.from("service_specialties").insert({ key: catalogKey(parsed.data.label), label: parsed.data.label, sort_order: (last?.sort_order ?? 0) + 10 });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Ya existe una especialidad con ese nombre." : "No se pudo crear la especialidad. ¿Ejecutaste la migración 036?" }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Admin: rename or hide a specialty (hidden ones stop appearing in new garages and mechanics). */
export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { key, label, isActive } = parsed.data;
  if (key === "general" && isActive === false) return NextResponse.json({ error: "«Mecánica general» no se puede ocultar." }, { status: 400 });
  const { error } = await auth.admin.from("service_specialties").update({ ...(label && { label }), ...(isActive !== undefined && { is_active: isActive }) }).eq("key", key);
  if (error) return NextResponse.json({ error: "No se pudo actualizar la especialidad." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
