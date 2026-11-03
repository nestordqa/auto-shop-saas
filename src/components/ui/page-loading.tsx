import { LoaderCircle } from "lucide-react";

/** Shown by each dashboard `loading.tsx` while the next page renders on the server. */
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[60dvh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-stone-500">
        <LoaderCircle className="animate-spin text-[#ef3f26]" size={36} />
        <p className="text-sm font-semibold">Cargando…</p>
      </div>
    </div>
  );
}
