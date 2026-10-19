"use client";

import { Menu, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import clsx from "clsx";

const links = [
  { href: "#nosotros", label: "Nosotros" },
  { href: "#talleres", label: "Talleres" },
  { href: "#clientes", label: "Clientes" },
  { href: "#planes", label: "Planes" },
  { href: "#preguntas", label: "Preguntas" },
];

export function LandingHeader({ whatsappUrl }: { whatsappUrl: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled || open ? "border-b border-white/10 bg-[#171a1f]/85 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-8 lg:px-12">
        <Link href="/" className="group flex items-center gap-3" aria-label="TorkeOS, inicio" onClick={() => setOpen(false)}>
          <span className="grid size-10 place-items-center rounded-md bg-[#ef3f26] transition-transform duration-500 group-hover:rotate-[-25deg]">
            <Wrench size={21} />
          </span>
          <span className="font-display text-2xl font-bold">TorkeOS</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative px-3 py-2 text-sm font-bold text-stone-300 transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-[#ef3f26] after:transition-transform hover:text-white hover:after:scale-x-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-11 items-center rounded-md bg-white px-4 text-sm font-bold text-stone-950 transition hover:bg-stone-100 sm:flex"
          >
            Iniciar sesión
          </Link>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md border border-white/20 text-white lg:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div
        id="landing-mobile-menu"
        className={clsx(
          "grid overflow-hidden transition-[grid-template-rows] duration-500 lg:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <nav className="min-h-0" aria-label="Navegación móvil">
          <div className="flex h-[calc(100dvh-4rem)] flex-col gap-1 overflow-y-auto px-4 pb-8 pt-4">
            {links.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: open ? `${index * 60 + 100}ms` : "0ms" }}
                className={clsx(
                  "border-b border-white/10 py-4 font-display text-4xl font-bold transition-all duration-500",
                  open ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0",
                )}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-auto grid gap-3 pt-8">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-center rounded-md bg-[#25d366] px-5 font-bold text-stone-950"
              >
                Escríbenos por WhatsApp
              </a>
              <Link href="/login" className="flex min-h-12 items-center justify-center rounded-md bg-white px-5 font-bold text-stone-950">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
