import { Store } from "lucide-react";
import Link from "next/link";

import type { Branch } from "@/lib/branches";

/** Branch switcher for owner lists ("Todas" + one tab per branch). Render it only for multi-branch garages. */
export function BranchTabs({ branches, current, href }: { branches: Branch[]; current: string | null; href: (branchId: string | null) => string }) {
  const tab = (active: boolean) => `flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-bold ${active ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"}`;
  return (
    <nav aria-label="Sucursal" className="mt-5 flex gap-2 overflow-x-auto pb-1">
      <Link href={href(null)} className={tab(!current)}><Store size={15} /> Todas</Link>
      {branches.map((branch) => <Link key={branch.id} href={href(branch.id)} className={tab(current === branch.id)}>{branch.name}{!branch.is_active && <span className="text-xs font-normal opacity-70">(inactiva)</span>}</Link>)}
    </nav>
  );
}
