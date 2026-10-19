"use client";

import { Printer } from "lucide-react";

/** Prints only the closest `[data-printable]` block (opening it first if it is a <details>). */
export function PrintButton({ label = "Imprimir / PDF" }: { label?: string }) {
  function print(event: React.MouseEvent<HTMLButtonElement>) {
    const target = event.currentTarget.closest<HTMLElement>("[data-printable]");
    if (!target) return window.print();
    const details = target.closest("details");
    if (details) details.open = true;
    target.setAttribute("data-print-root", "");
    const cleanup = () => {
      target.removeAttribute("data-print-root");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <button type="button" onClick={print} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 hover:bg-stone-50 print:hidden">
      <Printer size={16} /> {label}
    </button>
  );
}
