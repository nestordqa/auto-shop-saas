import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/lib/auth/admin-api";
import { catalogKey } from "@/lib/catalog-keys";

const key = z.string().regex(/^[a-z0-9_]+$/).max(60);
const createSchema = z.object({ specialty: key, system: z.string().trim().min(2, "Indica el grupo.").max(80), label: z.string().trim().min(2, "El nombre es muy corto.").max(120) });
const updateSchema = z.object({ key, label: z.string().trim().min(2).max(120).optional(), system: z.string().trim().min(2).max(80).optional(), isActive: z.boolean().optional() });

/** Admin: adds a repair to a specialty's catalog. */
export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { specialty, system, label } = parsed.data;
  const { data: last } = await auth.admin.from("repair_catalog").select("sort_order").eq("specialty", specialty).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  // Keys are unique across the catalog: repeat names in another specialty get its prefix.
  let repairKey = catalogKey(label);
  const { data: taken } = await auth.admin.from("repair_catalog").select("key").eq("key", repairKey).maybeSingle();
  if (taken) repairKey = catalogKey(`${specialty} ${label}`);
  const { error } = await auth.admin.from("repair_catalog").insert({ key: repairKey, label, system, specialty, sort_order: (last?.sort_order ?? 0) + 10 });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Esa reparación ya existe." : "No se pudo agregar la reparación." }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** Admin: rename, regroup or hide a repair (diagnoses already saved keep their text). */
export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos." }, { status: 400 });
  const auth = await authorizeAdminRequest();
  if (!auth.ok) return auth.response;
  const { key: repairKey, label, system, isActive } = parsed.data;
  const { error } = await auth.admin.from("repair_catalog").update({ ...(label && { label }), ...(system && { system }), ...(isActive !== undefined && { is_active: isActive }) }).eq("key", repairKey);
  if (error) return NextResponse.json({ error: "No se pudo actualizar la reparación." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
