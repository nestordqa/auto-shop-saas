/**
 * Identidad TorkeOS: geometría del isotipo, paleta y tokens.
 * Fuente única para /brand, iconos de la app, OG y los componentes de logo.
 */

/** Tuerca hexagonal girada −15° (el torque aplicado) sobre grilla 120×120. */
export const NUT_PATH = "M104.43 48.09L92.53 92.53L48.09 104.43L15.57 71.91L27.47 27.47L71.91 15.57Z";
/** T recta tallada en espacio negativo: la tuerca gira, la T se mantiene firme. */
export const T_PATH = "M38 38H82V52H67V90H53V52H38Z";
export const MARK_PATH = `${NUT_PATH} ${T_PATH}`;

export const brandColors = {
  graphite: "#171A1F",
  asphalt: "#23272E",
  paper: "#F5F5F4",
  concrete: "#D6D3D1",
  steel: "#78716C",
  signal: "#EF3F26",
  ember: "#FF765F",
  brake: "#B91C1C",
} as const;

type MarkOptions = { nut?: string; tile?: string; radius?: number };

/** SVG del isotipo. Sin `tile` es transparente (la T queda calada). */
export function markSvg({ nut = brandColors.signal, tile, radius = 26 }: MarkOptions = {}) {
  const bg = tile ? `<rect width="120" height="120" rx="${radius}" fill="${tile}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${bg}<path fill-rule="evenodd" d="${MARK_PATH}" fill="${nut}"/></svg>`;
}

export type BrandAsset = {
  id: string;
  name: string;
  use: string;
  svg: string;
  stage: "dark" | "light";
  wordmark?: { layout: "horizontal" | "vertical"; color: string; accent: string };
};

export const brandAssets: BrandAsset[] = [
  {
    id: "torkeos-isologo-horizontal",
    name: "Isologo horizontal",
    use: "Principal: header, documentos, firma de email.",
    svg: markSvg(),
    stage: "dark",
    wordmark: { layout: "horizontal", color: brandColors.paper, accent: brandColors.signal },
  },
  {
    id: "torkeos-isologo-vertical",
    name: "Isologo vertical",
    use: "Portadas, merch, rotulación del taller.",
    svg: markSvg(),
    stage: "dark",
    wordmark: { layout: "vertical", color: brandColors.paper, accent: brandColors.signal },
  },
  {
    id: "torkeos-app-icon",
    name: "App icon",
    use: "PWA, avatar de redes, favicon.",
    svg: markSvg({ tile: brandColors.graphite }),
    stage: "dark",
  },
  {
    id: "torkeos-isologo-claro",
    name: "Sobre claro",
    use: "Facturas, presupuestos impresos, PDFs.",
    svg: markSvg({ nut: brandColors.graphite }),
    stage: "light",
    wordmark: { layout: "horizontal", color: brandColors.graphite, accent: brandColors.signal },
  },
];

export const colorGroups = [
  {
    title: "Neutros · taller",
    colors: [
      { name: "Graphite · dominante", hex: brandColors.graphite, token: "--t-graphite" },
      { name: "Asphalt · elevado", hex: brandColors.asphalt, token: "--t-asphalt" },
      { name: "Paper · fondo app", hex: brandColors.paper, token: "--t-paper" },
      { name: "Concrete · bordes", hex: brandColors.concrete, token: "--t-concrete" },
      { name: "Steel · texto 2", hex: brandColors.steel, token: "--t-steel" },
    ],
  },
  {
    title: "Acento · señal",
    colors: [
      { name: "Signal Red · principal", hex: brandColors.signal, token: "--t-signal" },
      { name: "Ember · hover/glow", hex: brandColors.ember, token: "--t-ember" },
      { name: "Brake · peligro", hex: brandColors.brake, token: "--t-brake" },
    ],
  },
];

export const tokensCss = `/* ===== TorkeOS · Brand tokens ===== */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  /* Neutros */
  --t-graphite: #171A1F;  /* fondo dominante, sidebar */
  --t-asphalt:  #23272E;  /* superficies elevadas sobre graphite */
  --t-paper:    #F5F5F4;  /* fondo de la app en claro */
  --t-concrete: #D6D3D1;  /* bordes, texto sobre graphite */
  --t-steel:    #78716C;  /* texto secundario sobre paper */

  /* Acento */
  --t-signal:   #EF3F26;  /* CTA, isotipo, estados activos */
  --t-ember:    #FF765F;  /* hover, glow, énfasis sobre oscuro */
  --t-brake:    #B91C1C;  /* destructivo, alertas */

  /* Gradientes y glow */
  --t-grad-signal: linear-gradient(90deg, #EF3F26 0%, #FF765F 100%);
  --t-grad-heat:   radial-gradient(circle at 80% 110%, rgba(239, 63, 38, 0.65), transparent 55%), #171A1F;
  --t-glow:        0 0 28px rgba(239, 63, 38, 0.55);

  /* Tipografía */
  --font-display: 'Barlow Condensed', ui-sans-serif, system-ui, sans-serif;
  --font-body:    'Manrope', ui-sans-serif, system-ui, sans-serif;

  /* Radios (base 4px) */
  --r-sm: 6px; --r-md: 8px; --r-lg: 12px; --r-xl: 26px;
}

.t-wordmark { font: 700 1em/1 var(--font-display); letter-spacing: 0.01em; text-transform: uppercase; }
.t-wordmark b { color: var(--t-signal); font-weight: 700; }
`;
