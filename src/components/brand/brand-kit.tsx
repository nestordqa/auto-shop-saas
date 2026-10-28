"use client";

import { ArrowLeft, Check, ClipboardList, Copy, Download, Gauge, MessageCircle, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { TorkeLogo, TorkeMark } from "@/components/brand/torke-logo";
import { brandAssets, brandColors, colorGroups, tokensCss, type BrandAsset } from "@/lib/brand";

import { downloadPng, downloadSvg, downloadText } from "./export";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* Portapapeles bloqueado: no hacemos nada */
    }
  };
  return { copied, copy };
}

const card = "rounded-xl border border-white/10 bg-[#1d2027]";
const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white transition hover:bg-[#d9341d] hover:shadow-[0_0_40px_rgba(239,63,38,0.55)] active:scale-[.98] disabled:pointer-events-none disabled:opacity-40";
const btnSecondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/20 px-5 font-bold text-white transition hover:border-[#ff765f] hover:bg-white/5 active:scale-[.98] disabled:pointer-events-none disabled:opacity-40";
const btnGhost =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 font-bold text-stone-300 transition hover:bg-white/10 hover:text-white active:scale-[.98] disabled:pointer-events-none disabled:opacity-40";

function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl border-t border-white/10 px-4 py-14 sm:px-8">
      <p className="flex items-center gap-3 text-xs font-bold tracking-[0.18em] text-[#ff765f] uppercase">
        <span className="h-px w-8 bg-[#ef3f26]" aria-hidden />
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-4xl leading-none font-bold sm:text-5xl">{title}</h2>
      {intro && <div className="mt-4 max-w-[65ch] leading-7 text-stone-300">{intro}</div>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function AssetPreview({ asset }: { asset: BrandAsset }) {
  const w = asset.wordmark;
  const mark = <span className="block size-16 shrink-0 md:size-20 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: asset.svg }} />;
  if (!w) return mark;
  return (
    <div className={w.layout === "vertical" ? "flex flex-col items-center gap-1" : "flex items-center gap-3"}>
      {mark}
      <span className="font-display text-4xl leading-none font-bold tracking-[0.01em]" style={{ color: w.color }}>
        TORKE<span style={{ color: w.accent }}>OS</span>
      </span>
    </div>
  );
}

function AssetCard({ asset }: { asset: BrandAsset }) {
  const [busy, setBusy] = useState(false);
  const png = async (size: number) => {
    setBusy(true);
    try {
      await downloadPng(asset, size);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`${card} flex flex-col gap-4 p-4 md:p-5`}>
      <div className={`flex min-h-40 items-center justify-center rounded-lg p-6 ${asset.stage === "light" ? "bg-[#f5f5f4]" : "bg-[#171a1f]"}`}>
        <AssetPreview asset={asset} />
      </div>
      <div>
        <h3 className="font-bold">{asset.name}</h3>
        <p className="text-sm text-stone-400">{asset.use}</p>
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 text-sm">
        <button type="button" className={`${btnSecondary} !min-h-10 !px-2`} onClick={() => downloadSvg(asset)}>
          SVG
        </button>
        <button type="button" disabled={busy} className={`${btnPrimary} !min-h-10 !px-2`} onClick={() => png(1024)}>
          <Download size={14} />
          PNG
        </button>
        <button type="button" disabled={busy} className={`${btnGhost} !min-h-10 border border-white/10 !px-2`} onClick={() => png(2048)}>
          PNG 2×
        </button>
      </div>
    </article>
  );
}

/** Conceptos descartados, dibujados para comparar con el elegido. */
const discarded = [
  {
    key: "B",
    name: "Arco de torque",
    why: "Una T con la barra convertida en flecha de giro. Comunica movimiento, pero a 16 px la flecha se vuelve ruido y recuerda a los iconos de “recargar”.",
    svg: (
      <>
        <path d="M24 52A40 40 0 0 1 96 52" fill="none" stroke={brandColors.signal} strokeWidth="15" />
        <path d="M89 31L106 54L83 56Z" fill={brandColors.signal} />
        <rect x="52" y="42" width="16" height="54" fill={brandColors.paper} />
      </>
    ),
  },
  {
    key: "C",
    name: "Llave de vaso",
    why: "Una T de herramienta con un vaso en el cruce. Es literal y amable, pero se parece a cualquier ferretería y no tiene nada que se descubra al mirarlo de nuevo.",
    svg: (
      <>
        <path d="M26 28H94V44H68V98H52V44H26Z" fill={brandColors.paper} />
        <circle cx="60" cy="36" r="11" fill={brandColors.signal} />
        <circle cx="60" cy="36" r="4.5" fill={brandColors.graphite} />
      </>
    ),
  },
  {
    key: "D",
    name: "Manómetro",
    why: "La T como aguja de un indicador que marca torque máximo. Es potente en motion, pero en estático compite con el icono de “velocidad” de mil apps de autos.",
    svg: (
      <>
        <path d="M22 84A40 40 0 1 1 98 84" fill="none" stroke={brandColors.concrete} strokeWidth="10" strokeLinecap="round" />
        <path d="M58 86L84 40L66 90Z" fill={brandColors.signal} />
        <circle cx="62" cy="86" r="8" fill={brandColors.paper} />
      </>
    ),
  },
];

export default function BrandKit() {
  const { copied, copy } = useCopy();

  return (
    <div className="relative isolate min-h-dvh bg-[#171a1f] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px]"
        style={{ background: "radial-gradient(circle at 85% 0%, rgba(239,63,38,0.35), transparent 55%)" }}
      />

      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className={`${btnGhost} -ml-4 !min-h-10 text-sm`}>
          <ArrowLeft size={16} />
          Volver al sitio
        </Link>
        <span className="text-xs font-semibold text-stone-500">v1.0 · 2026</span>
      </header>

      <main>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-8 pb-14 sm:px-8 md:flex-row md:items-center md:gap-12 md:pt-14">
          <TorkeMark className="brand-hero-mark size-28 md:size-44" />
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#ff765f] uppercase">Brand Kit &amp; Design System</p>
            <h1 className="mt-3 font-display text-6xl leading-none font-bold uppercase md:text-8xl">
              Torke<span className="text-[#ef3f26]">OS</span>
            </h1>
            <p className="mt-4 max-w-[60ch] leading-7 text-stone-300">
              Logo, colores, tipografía y componentes oficiales del sistema operativo del taller. Descarga cualquier pieza o
              toca un color para copiar su código.
            </p>
          </div>
        </div>

        <Section
          id="concepto"
          eyebrow="01 · Concepto"
          title="La tuerca gira, la T no se mueve"
          intro={
            <p>
              El isotipo es una <strong className="text-white">tuerca hexagonal girada −15°</strong>: el instante exacto en que se
              aplica el torque. Dentro, calada en espacio negativo, está la <strong className="text-white">T</strong> de Torke,
              perfectamente recta. Esa tensión entre lo que gira y lo que se mantiene firme es la promesa del producto: el taller
              se mueve todo el día y TorkeOS lo mantiene bajo control. La T es un hueco, no un trazo, así que toma el color de lo
              que hay detrás y funciona igual sobre grafito, papel o una foto.
            </p>
          }
        >
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <div className={`${card} relative flex min-h-72 items-center justify-center overflow-hidden p-8`}>
              <svg viewBox="0 0 120 120" className="absolute inset-0 m-auto size-64 opacity-60" aria-hidden>
                <defs>
                  <pattern id="brand-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M10 0H0V10" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".4" />
                  </pattern>
                </defs>
                <rect width="120" height="120" fill="url(#brand-grid)" />
                <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,118,95,.45)" strokeWidth=".5" strokeDasharray="2 2" />
                <line x1="60" y1="8" x2="60" y2="112" stroke="rgba(255,255,255,.18)" strokeWidth=".4" />
                <line x1="8" y1="60" x2="112" y2="60" stroke="rgba(255,255,255,.18)" strokeWidth=".4" />
              </svg>
              <TorkeMark className="relative size-64" title="Isotipo TorkeOS sobre su grilla de construcción" />
            </div>
            <ul className="grid gap-3 text-sm leading-6 text-stone-300">
              <li className={`${card} p-4`}><strong className="text-white">Grilla:</strong> 120×120. Tuerca inscrita en un círculo de radio 46, girada −15° sobre su centro.</li>
              <li className={`${card} p-4`}><strong className="text-white">T:</strong> barra de 44×14 y asta de 14, la misma unidad en todo el trazo, con un margen óptico de 8 a 13 respecto a las caras de la tuerca.</li>
              <li className={`${card} p-4`}><strong className="text-white">Unidad x:</strong> el grosor de la T (14). Área de respeto de 1x en los cuatro lados, 2x en gran formato.</li>
              <li className={`${card} p-4`}><strong className="text-white">Prohibido:</strong> enderezar la tuerca, rotar la T, rellenar el calado, contornear o usar el rojo sobre fondos rojos.</li>
            </ul>
          </div>

          <h3 className="mt-10 font-display text-2xl font-bold">Conceptos explorados</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article className={`${card} border-[#ef3f26]/50 p-4`}>
              <div className="flex items-center justify-center gap-4 rounded-lg bg-[#171a1f] p-6">
                <TorkeMark className="size-20" title="" />
                <TorkeMark className="size-4" title="" />
              </div>
              <h4 className="mt-4 font-bold">A · Tuerca calada <span className="text-[#ff765f]">(elegido)</span></h4>
              <p className="mt-1 text-sm leading-6 text-stone-400">
                Se reconoce por silueta, sin depender del color. Es macizo a 16 px, propio del oficio sin ser literal, y la T se
                descubre a la segunda mirada.
              </p>
            </article>
            {discarded.map((d) => (
              <article key={d.key} className={`${card} p-4`}>
                <div className="flex items-center justify-center gap-4 rounded-lg bg-[#171a1f] p-6">
                  <svg viewBox="0 0 120 120" className="size-20" aria-hidden>{d.svg}</svg>
                  <svg viewBox="0 0 120 120" className="size-4" aria-hidden>{d.svg}</svg>
                </div>
                <h4 className="mt-4 font-bold">{d.key} · {d.name}</h4>
                <p className="mt-1 text-sm leading-6 text-stone-400">{d.why}</p>
              </article>
            ))}
          </div>

          <h3 className="mt-10 font-display text-2xl font-bold">Escalas y versiones</h3>
          <div className="mt-4 flex flex-wrap items-end gap-6">
            {[96, 48, 32, 16].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <span className="block rounded-[22%] ring-1 ring-white/10" style={{ width: s, height: s }}>
                  <TorkeMark tile={brandColors.graphite} className="size-full" title="" />
                </span>
                <span className="text-xs text-stone-500">{s} px</span>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-lg bg-[#f5f5f4] p-4">
              <TorkeMark color={brandColors.graphite} className="size-12" title="" />
              <TorkeMark color={brandColors.signal} className="size-12" title="" />
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-[#ef3f26] p-4">
              <TorkeMark color={brandColors.graphite} className="size-12" title="" />
              <TorkeMark color="#ffffff" className="size-12" title="" />
            </div>
          </div>
        </Section>

        <Section
          id="logos"
          eyebrow="02 · Logotipo"
          title="Descarga los logos"
          intro={
            <p>
              Wordmark: <strong className="text-white">TORKE</strong> en Barlow Condensed Bold con tracking +10 y{" "}
              <strong className="text-[#ef3f26]">OS</strong> en Signal Red, del mismo peso, para que se lea como un sistema. PNG
              transparente (1024 o 2048 px) y SVG vectorial; en el teléfono se abre el menú para guardar.
            </p>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {brandAssets.map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
          </div>
          <ul className="mt-6 grid gap-3 text-sm text-stone-300 md:grid-cols-3">
            <li className={`${card} p-4`}><strong className="text-white">Favicon y PWA:</strong> app icon grafito, generado desde el mismo path que usa la interfaz.</li>
            <li className={`${card} p-4`}><strong className="text-white">Tamaño mínimo:</strong> isologo 88 px / 22 mm de ancho; isotipo 16 px / 5 mm.</li>
            <li className={`${card} p-4`}><strong className="text-white">Talleres cliente:</strong> en el portal del cliente manda la marca del taller; TorkeOS firma como “Powered by” con el isotipo a 16 px.</li>
          </ul>
        </Section>

        <Section id="color" eyebrow="03 · Color" title="Grafito de taller, rojo de señal" intro={<p>80 % neutros · 15 % texto · 5 % Signal Red. El rojo marca lo accionable y el estado activo; nunca se usa para decorar. Toca un color para copiar su HEX.</p>}>
          <div className="space-y-8">
            {colorGroups.map((g) => (
              <div key={g.title}>
                <h3 className="text-xs font-bold tracking-[0.14em] text-stone-500 uppercase">{g.title}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                  {g.colors.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => copy(c.hex)}
                      className={`group overflow-hidden text-left transition hover:border-[#ff765f]/60 ${card}`}
                    >
                      <span className="relative block h-20 md:h-24" style={{ background: c.hex }}>
                        <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-md bg-black/40 text-white opacity-80 group-hover:opacity-100">
                          {copied === c.hex ? <Check size={14} /> : <Copy size={14} />}
                        </span>
                      </span>
                      <span className="block p-3 text-xs leading-relaxed text-stone-400">
                        <b className="block text-sm text-white">{c.name}</b>
                        {c.hex} · <span className="text-stone-500">{c.token}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex h-24 items-end rounded-xl p-3 text-xs font-bold" style={{ background: "linear-gradient(90deg,#EF3F26,#FF765F)" }}>--t-grad-signal · CTA destacado, barras de progreso</div>
              <div className="flex h-24 items-end rounded-xl border border-white/10 p-3 text-xs font-bold" style={{ background: "radial-gradient(circle at 80% 110%, rgba(239,63,38,0.65), transparent 55%), #171A1F" }}>--t-grad-heat · hero, OG, portadas</div>
            </div>
            <p className="text-sm text-stone-400">Contraste: Paper sobre Graphite ≈ 16:1 y Graphite sobre Paper igual. Signal Red sobre Graphite ≈ 4.6:1 (AA para texto grande e iconos). Para texto rojo pequeño sobre claro usa <code className="text-[#ff765f]">#D9341D</code>.</p>
          </div>
        </Section>

        <Section id="tipografia" eyebrow="04 · Tipografía" title="Condensada para mandar, legible para trabajar">
          <div className={`${card} overflow-hidden`}>
            {[
              { spec: "Display · Barlow Condensed 700", el: <p className="font-display text-5xl leading-none font-bold sm:text-6xl">El taller completo, bajo control.</p> },
              { spec: "H2 · Barlow Condensed 700", el: <p className="font-display text-4xl leading-none font-bold">Orden #1042 · Diagnóstico listo</p> },
              { spec: "H3 · Manrope 800", el: <p className="text-xl font-extrabold">Presupuesto pendiente de aprobación</p> },
              { spec: "Body · Manrope 400", el: <p className="leading-7 text-stone-300">Recepción, diagnóstico y presupuesto en el teléfono del mecánico, con el cliente informado por WhatsApp.</p> },
              { spec: "Label · Manrope 700 · +0.18em", el: <p className="text-xs font-bold tracking-[0.18em] text-[#ff765f] uppercase">Estado · En reparación</p> },
              { spec: "Cifras · Manrope tabular", el: <p className="text-2xl font-bold tabular-nums">$ 1.284.500 · 3 h 40 min</p> },
            ].map((r) => (
              <div key={r.spec} className="grid gap-2 border-b border-white/10 p-4 last:border-b-0 md:grid-cols-[220px_1fr] md:gap-6 md:p-5">
                <span className="text-xs text-stone-500">{r.spec}</span>
                <div className="min-w-0 [overflow-wrap:anywhere]">{r.el}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a className={btnSecondary} href="https://fonts.google.com/specimen/Barlow+Condensed" target="_blank" rel="noopener noreferrer">Descargar Barlow Condensed</a>
            <a className={btnSecondary} href="https://fonts.google.com/specimen/Manrope" target="_blank" rel="noopener noreferrer">Descargar Manrope</a>
          </div>
        </Section>

        <Section id="componentes" eyebrow="05 · Componentes" title="Botones, estados e iconos" intro={<p>Botones de 44 px mínimos: se usan con guantes y en el foso. Una sola acción en rojo por pantalla.</p>}>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" className={btnPrimary}>Crear orden</button>
            <button type="button" className={btnSecondary}>Ver agenda</button>
            <button type="button" className={btnGhost}>Cancelar</button>
            <button type="button" className={btnPrimary} disabled>Deshabilitado</button>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: ClipboardList, tag: "Ingreso", title: "Formato de recepción", text: "Kilometraje, daños sobre el diagrama, fotos y firma en un solo flujo." },
              { icon: Stethoscope, tag: "Diagnóstico", title: "Historia clínica", text: "Cada intervención queda en la historia del vehículo, con marca de repuesto y durabilidad." },
              { icon: MessageCircle, tag: "Cliente", title: "Presupuesto por WhatsApp", text: "El cliente aprueba o rechaza desde su teléfono, sin llamadas." },
            ].map(({ icon: Icon, tag, title, text }) => (
              <div key={title} className={`${card} p-5 transition hover:-translate-y-0.5 hover:border-[#ef3f26]/50`}>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-[#ef3f26]/40 bg-[#ef3f26]/10 px-2.5 py-0.5 text-xs font-bold text-[#ff765f]">{tag}</span>
                  <Icon size={22} className="text-stone-400" />
                </div>
                <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-400">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-stone-400">
            <Gauge size={18} className="text-[#ff765f]" /> Iconos: Lucide a 20–24 px, trazo 2, en Concrete en reposo y Signal Red cuando están activos.
          </p>
        </Section>

        <Section id="tokens" eyebrow="06 · Tokens" title="CSS listo para usar">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className={btnPrimary} onClick={() => downloadText(tokensCss, "torkeos-tokens.css", "text/css")}>
              <Download size={16} />
              Descargar torkeos-tokens.css
            </button>
            <button type="button" className={btnSecondary} onClick={() => copy(tokensCss)}>
              {copied === tokensCss ? <Check size={16} /> : <Copy size={16} />}
              {copied === tokensCss ? "Copiado" : "Copiar CSS"}
            </button>
          </div>
          <pre className="mt-6 max-h-96 overflow-auto rounded-xl border border-white/10 bg-[#111317] p-4 text-xs leading-relaxed text-stone-300 md:p-5">{tokensCss}</pre>
        </Section>

        <Section id="aplicaciones" eyebrow="07 · Aplicaciones" title="Redes, WhatsApp y documentos">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Avatar", "App icon grafito con la tuerca roja centrada al 72 %. El mismo archivo sirve para Instagram, WhatsApp Business y Google Business."],
              ["Feed 1080×1350", "Foto real de taller en low-key con overlay grafito al 65 %. Titular en Barlow Condensed y una sola palabra en Signal Red."],
              ["Presupuestos y PDFs", "Isologo sobre claro arriba a la izquierda; totales en Manrope tabular; el estado (aprobado o pendiente) como chip rojo."],
              ["Firma", "Isotipo de 48 px abajo a la izquierda y torkeos.com en Manrope Bold a la derecha, a 64 px de los bordes."],
            ].map(([t, d]) => (
              <div key={t} className={`${card} p-4`}>
                <span className="rounded-full border border-[#ef3f26]/40 bg-[#ef3f26]/10 px-2.5 py-0.5 text-xs font-bold text-[#ff765f]">{t}</span>
                <p className="mt-3 text-sm leading-6 text-stone-300">{d}</p>
              </div>
            ))}
          </div>
        </Section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-4 border-t border-white/10 px-4 py-8 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <TorkeLogo markClassName="size-7" className="[&>span:last-child]:text-xl" />
        <span>TorkeOS · Brand Kit &amp; Design System v1.0 · Tokens listos para CSS / Tailwind / Figma Variables</span>
      </footer>
    </div>
  );
}
