import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeStaffRequest } from "@/lib/auth/garage-staff";
import { specialtySummary } from "@/lib/mechanics";
import { validSpecialtyKeys } from "@/lib/specialties-data";

const garageSchema = z.object({
  name: z.string().trim().min(2, "El nombre del taller es muy corto.").max(120),
  specialties: z.array(z.string().regex(/^[a-z0-9_]+$/).max(60)).max(40).default(["general"]),
  address: z.string().trim().min(5, "Escribe la dirección completa.").max(300),
  mapLocation: z.string().trim().max(500).optional(),
});

/** Owner only: edits the garage's public data. Address and map also update the main branch, which mirrors them. */
export async function PATCH(request: Request) {
  const auth = await authorizeStaffRequest({ ownerOnly: true, allowLocked: true });
  if (!auth.ok) return auth.response;
  const parsed = garageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos del taller." }, { status: 400 });

  const { name, specialties, address, mapLocation } = parsed.data;
  const { admin, staff } = auth;
  const valid = await validSpecialtyKeys(admin, specialties);
  const { error } = await admin.from("garages").update({ name, specialty: specialtySummary(valid.keys, valid.options), specialties: valid.keys.length ? valid.keys : ["general"], address, map_location: mapLocation || null }).eq("id", staff.garageId);
  if (error) return NextResponse.json({ error: "No se pudieron guardar los datos del taller." }, { status: 400 });
  await admin.from("garage_branches").update({ address, map_location: mapLocation || null }).eq("garage_id", staff.garageId).eq("is_main", true);
  return NextResponse.json({ ok: true });
}
