import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { phoneSchema } from "@/lib/phone";
import { toUrlSlug } from "@/lib/slugs";

export const branchSchema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(300),
  mapLocation: z.string().trim().max(500).optional(),
  phone: z.union([z.literal(""), phoneSchema]).optional(),
});

export const branchUpdateSchema = z.union([z.object({ isActive: z.boolean() }).strict(), branchSchema]);

const row = (input: z.infer<typeof branchSchema>) => ({ name: input.name, address: input.address, map_location: input.mapLocation || null, phone: input.phone || null });

/** Adds a branch with a slug unique inside the garage (centro, centro-2, …). Shared by owner and admin routes. */
export async function createBranch(admin: SupabaseClient, garageId: string, input: z.infer<typeof branchSchema>) {
  const { data: taken } = await admin.from("garage_branches").select("slug").eq("garage_id", garageId);
  const used = new Set((taken ?? []).map((branch) => branch.slug));
  const base = toUrlSlug(input.name) || "sucursal";
  let slug = base;
  for (let index = 2; used.has(slug); index += 1) slug = `${base}-${index}`;
  const { error } = await admin.from("garage_branches").insert({ ...row(input), garage_id: garageId, slug });
  if (error) return NextResponse.json({ error: "No se pudo crear la sucursal." }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}

/** Edits a branch or toggles it; the main branch cannot be deactivated. */
export async function updateBranch(admin: SupabaseClient, garageId: string, branchId: string, input: z.infer<typeof branchUpdateSchema>) {
  const { data: branch } = await admin.from("garage_branches").select("id, is_main").eq("id", branchId).eq("garage_id", garageId).maybeSingle();
  if (!branch) return NextResponse.json({ error: "La sucursal no existe." }, { status: 404 });
  if ("isActive" in input && !input.isActive && branch.is_main) return NextResponse.json({ error: "La sucursal principal no se puede desactivar." }, { status: 409 });
  if ("isActive" in input && !input.isActive) {
    const { count } = await admin.from("garage_managers").select("id", { count: "exact", head: true }).eq("branch_id", branchId).eq("is_active", true);
    if (count) return NextResponse.json({ error: "Esta sucursal tiene encargados activos. Desactívalos o muévelos antes." }, { status: 409 });
  }
  const { error } = await admin.from("garage_branches").update("isActive" in input ? { is_active: input.isActive, deactivated_at: input.isActive ? null : new Date().toISOString() } : row(input)).eq("id", branchId);
  if (error) return NextResponse.json({ error: "No se pudo actualizar la sucursal." }, { status: 400 });
  // The main branch mirrors the garage address shown on the public page, contract and SEO.
  if (branch.is_main && !("isActive" in input)) await admin.from("garages").update({ address: input.address, map_location: input.mapLocation || null }).eq("id", garageId);
  return NextResponse.json({ success: true });
}
