import { NextResponse, type NextRequest } from "next/server";

import { buildContractPdf } from "@/lib/contract-pdf";
import { CONTRACT_COLUMNS, contractCode, type Contract } from "@/lib/contracts";
import { getDefaultSignature } from "@/lib/signatures";
import { toUrlSlug } from "@/lib/slugs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Contract PDF for the admins and for the garage owner it was issued to. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Configura SUPABASE_SECRET_KEY." }, { status: 503 });

  const { data: contract } = await admin.from("contracts").select(`${CONTRACT_COLUMNS}, provider_signer_name, provider_signer_position, provider_signature, owner_signature`).eq("id", contractId).maybeSingle<Contract & { provider_signer_name: string | null; provider_signer_position: string | null; provider_signature: string | null; owner_signature: string | null }>();
  if (!contract || (user.app_metadata.role !== "admin" && contract.owner_id !== user.id)) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });

  const [{ data: garage }, { data: profile }, { data: ownerAuth }, { data: branches }] = await Promise.all([
    admin.from("garages").select("name, address").eq("id", contract.garage_id).single(),
    admin.from("profiles").select("full_name, document_id, phone").eq("id", contract.owner_id).single(),
    admin.auth.admin.getUserById(contract.owner_id),
    admin.from("garage_branches").select("name, address").eq("garage_id", contract.garage_id).eq("is_active", true).order("is_main", { ascending: false }).order("name"),
  ]);
  if (!garage || !profile) return NextResponse.json({ error: "Faltan datos del taller." }, { status: 500 });

  // Contracts issued before signatures existed show the current default one.
  const fallback = contract.provider_signature ? null : await getDefaultSignature(admin);
  const bytes = await buildContractPdf({
    contract,
    provider: contract.provider_signature
      ? { name: contract.provider_signer_name ?? "TorkeOS", position: contract.provider_signer_position ?? "", image: contract.provider_signature }
      : fallback ? { name: fallback.fullName, position: fallback.position, image: fallback.image } : null,
    ownerSignature: contract.owner_signature && contract.signed_at ? { image: contract.owner_signature, name: contract.owner_signed_name ?? profile.full_name, signedAt: contract.signed_at } : null,
    garage,
    branches: branches ?? [],
    owner: { fullName: profile.full_name, documentId: profile.document_id, phone: profile.phone, email: ownerAuth.user?.email ?? null },
  });
  const filename = `contrato-${contractCode(contract.number)}-${toUrlSlug(garage.name)}.pdf`;
  const disposition = request.nextUrl.searchParams.has("download") ? "attachment" : "inline";
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
