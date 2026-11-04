import { BranchManager } from "@/components/branches/branch-manager";
import { requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import { siteUrl } from "@/lib/seo";

export default async function OwnerBranchesPage() {
  const { user, garage, branches } = await requireOwnerGarage({ ownerOnly: true });
  if (!garage) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Taller no asignado</h1><p className="mt-2 text-stone-600">La cuenta {user.email} no coincide con el administrador configurado para un taller.</p></div>;

  return <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="mb-6"><p className="text-xs font-bold uppercase text-[#d9341d]">{garage.name}</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Sucursales</h1><p className="mt-1 text-sm text-stone-600">Cada sucursal tiene su propia agenda: los clientes eligen dónde agendar y las órdenes quedan en esa sede.</p></header>
    <BranchManager branches={branches} apiBase="/api/owner/branches" bookingBase={`${siteUrl}/${garage.slug}`} />
  </div>;
}
