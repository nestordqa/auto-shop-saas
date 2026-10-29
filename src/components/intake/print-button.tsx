"use client";

import { FileDown } from "lucide-react";
import { useEffect } from "react";

/** Waits for lazy photos so they make it into the PDF, then opens the print dialog. */
async function printWhenReady() {
  const images = [...document.querySelectorAll("img")];
  images.forEach((image) => { image.loading = "eager"; });
  await Promise.race([
    Promise.all(images.map((image) => image.decode().catch(() => undefined))),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
  window.print();
}

/** Print-page button; with `auto` it also opens the dialog as soon as the page loads. */
export function PrintButton({ label = "Descargar PDF", auto = false }: { label?: string; auto?: boolean }) {
  useEffect(() => {
    if (auto) void printWhenReady();
  }, [auto]);

  return (
    <button type="button" onClick={() => void printWhenReady()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#ef3f26] px-4 text-sm font-bold text-white hover:bg-[#d9341d] print:hidden">
      <FileDown size={17} /> {label}
    </button>
  );
}
