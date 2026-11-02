"use client";

import { Store, X } from "lucide-react";
import { useState } from "react";

import { BranchManager, type BranchRow } from "@/components/branches/branch-manager";

/** Admin: opens the branch manager of one garage (add, edit, activate/deactivate). */
export function GarageBranchesButton({ garage, branches, bookingBase }: { garage: { id: string; name: string }; branches: BranchRow[]; bookingBase: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Sucursales" aria-label={`Sucursales de ${garage.name}`} className="relative grid size-10 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900">
        <Store size={17} />
        {branches.length > 1 && <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-[#ef3f26] text-[10px] font-bold text-white">{branches.length}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={`branches-${garage.id}`}>
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-stone-50 text-left sm:max-w-3xl sm:rounded-lg">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div className="flex items-center gap-3"><Store /><h2 id={`branches-${garage.id}`} className="text-xl font-bold">Sucursales · {garage.name}</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <div className="p-5"><BranchManager branches={branches} apiBase={`/api/admin/garages/${garage.id}/branches`} bookingBase={bookingBase} /></div>
          </div>
        </div>
      )}
    </>
  );
}
