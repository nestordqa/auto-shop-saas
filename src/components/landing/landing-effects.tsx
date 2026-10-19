"use client";

import { useEffect } from "react";

/**
 * Single client island for the landing: scroll reveals, hero parallax,
 * timeline progress and pointer spotlight. Content renders on the server and
 * stays visible if this never runs.
 */
export function LandingEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing");
    if (!root) return;

    root.classList.add("landing-js");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-visible", "");
          revealObserver.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    root.querySelectorAll("[data-reveal], .landing-step").forEach((element) => revealObserver.observe(element));

    const tracks = Array.from(root.querySelectorAll<HTMLElement>(".landing-track"));
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollY = window.scrollY;
      if (!reducedMotion && scrollY < window.innerHeight * 1.2) {
        root.style.setProperty("--landing-scroll", String(Math.round(scrollY)));
      }
      const anchor = window.innerHeight * 0.6;
      for (const track of tracks) {
        const rect = track.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (anchor - rect.top) / rect.height));
        track.style.setProperty("--progress", progress.toFixed(3));
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const onPointerMove = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest<HTMLElement>("[data-spotlight]");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    root.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      revealObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.removeEventListener("pointermove", onPointerMove);
      root.classList.remove("landing-js");
    };
  }, []);

  return null;
}
