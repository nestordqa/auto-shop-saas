"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Thin bar at the top from the moment an internal link is tapped until the new page is shown. */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const location = `${pathname}?${searchParams}`;
  const [shown, setShown] = useState(location);

  // The new URL is on screen: hide the bar (state updated during render, not in an effect).
  if (shown !== location) {
    setShown(location);
    setLoading(false);
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setLoading(true);
    }
    function onSubmit(event: SubmitEvent) {
      // GET forms (filters) navigate too.
      const form = event.target as HTMLFormElement;
      if (!event.defaultPrevented && form.method.toLowerCase() === "get") setLoading(true);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("submit", onSubmit); };
  }, []);

  if (!loading) return null;
  return (
    <div role="progressbar" aria-label="Cargando" className="fixed inset-x-0 top-0 z-70 h-1 overflow-hidden bg-[#ef3f26]/20">
      <div className="h-full w-2/5 bg-[#ef3f26]" style={{ animation: "route-progress 1s ease-in-out infinite" }} />
    </div>
  );
}
