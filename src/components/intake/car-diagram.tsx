import type { MouseEvent } from "react";

import { DAMAGE_TYPE_BY_KEY, type CarViewKey, type IntakeDamage } from "@/lib/intake";

type ViewShape = { width: number; height: number; mirror?: boolean; body: React.ReactNode };

const side: ViewShape["body"] = (
  <>
    <path d="M12 80 L12 64 Q14 56 30 54 L72 50 L98 30 Q102 27 108 27 L158 27 Q166 27 172 33 L190 50 L222 54 Q232 56 232 66 L232 80 L208 80 A18 18 0 0 0 172 80 L73 80 A18 18 0 0 0 37 80 Z" />
    <path d="M80 50 L101 32 L130 32 L130 50 Z" />
    <path d="M135 50 L135 32 L158 32 Q163 32 167 36 L181 50 Z" />
    <path d="M80 50 L80 78 M133 50 L133 78 M184 52 L184 78" />
    <path d="M112 60 L122 60 M150 60 L160 60" />
    <rect x="13" y="59" width="9" height="6" rx="2" />
    <rect x="224" y="58" width="7" height="8" rx="2" />
    <circle cx="55" cy="82" r="15" />
    <circle cx="55" cy="82" r="6" />
    <circle cx="190" cy="82" r="15" />
    <circle cx="190" cy="82" r="6" />
  </>
);

const VIEWS: Record<CarViewKey, ViewShape> = {
  izquierda: { width: 244, height: 104, body: side },
  derecha: { width: 244, height: 104, mirror: true, body: side },
  superior: {
    width: 244,
    height: 112,
    body: (
      <>
        <rect x="12" y="14" width="220" height="84" rx="30" />
        <path d="M70 22 L96 30 L96 82 L70 90 Z" />
        <rect x="96" y="30" width="64" height="52" rx="4" />
        <path d="M160 30 L184 22 L184 90 L160 82 Z" />
        <path d="M20 40 Q40 56 20 72 M224 40 Q204 56 224 72" />
        <path d="M30 56 L66 56" strokeDasharray="4 4" />
        <ellipse cx="82" cy="10" rx="8" ry="4" />
        <ellipse cx="82" cy="102" rx="8" ry="4" />
      </>
    ),
  },
  frontal: {
    width: 160,
    height: 120,
    body: (
      <>
        <path d="M20 100 L20 70 Q22 58 34 54 L46 30 Q50 22 60 22 L100 22 Q110 22 114 30 L126 54 Q138 58 140 70 L140 100 Z" />
        <path d="M50 52 L58 32 L102 32 L110 52 Z" />
        <ellipse cx="38" cy="70" rx="10" ry="6" />
        <ellipse cx="122" cy="70" rx="10" ry="6" />
        <rect x="56" y="64" width="48" height="14" rx="3" />
        <path d="M20 88 L140 88" />
        <rect x="24" y="100" width="18" height="12" rx="3" />
        <rect x="118" y="100" width="18" height="12" rx="3" />
        <path d="M34 52 L24 48 L24 54 Z M126 52 L136 48 L136 54 Z" />
      </>
    ),
  },
  trasera: {
    width: 160,
    height: 120,
    body: (
      <>
        <path d="M20 100 L20 66 Q22 58 32 54 L44 30 Q48 22 58 22 L102 22 Q112 22 116 30 L128 54 Q138 58 140 66 L140 100 Z" />
        <path d="M48 52 L56 32 L104 32 L112 52 Z" />
        <rect x="24" y="62" width="20" height="10" rx="3" />
        <rect x="116" y="62" width="20" height="10" rx="3" />
        <rect x="62" y="70" width="36" height="12" rx="2" />
        <path d="M20 88 L140 88" />
        <rect x="24" y="100" width="18" height="12" rx="3" />
        <rect x="118" y="100" width="18" height="12" rx="3" />
        <circle cx="52" cy="94" r="3" />
      </>
    ),
  },
};

type CarDiagramProps = {
  view: CarViewKey;
  damages: IntakeDamage[];
  onAdd?: (point: { x: number; y: number }) => void;
  onSelect?: (id: string) => void;
  selectedId?: string;
  numbering?: Map<string, number>;
  className?: string;
};

/** Line drawing of one car view with its damage markers. Interactive when `onAdd` is given. */
export function CarDiagram({ view, damages, onAdd, onSelect, selectedId, numbering, className }: CarDiagramProps) {
  const shape = VIEWS[view];
  const interactive = Boolean(onAdd);

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    if (!onAdd) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onAdd({
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    });
  }

  return (
    <svg
      viewBox={`0 0 ${shape.width} ${shape.height}`}
      className={`h-auto w-full select-none ${interactive ? "cursor-crosshair touch-manipulation" : ""} ${className ?? ""}`}
      onClick={interactive ? handleClick : undefined}
      role={interactive ? "button" : "img"}
      aria-label={interactive ? "Toca el diagrama para marcar un daño" : "Diagrama de daños del vehículo"}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        transform={shape.mirror ? `translate(${shape.width} 0) scale(-1 1)` : undefined}
      >
        {shape.body}
      </g>
      {damages.filter((damage) => damage.view === view).map((damage) => {
        const type = DAMAGE_TYPE_BY_KEY.get(damage.type);
        const cx = damage.x * shape.width;
        const cy = damage.y * shape.height;
        const selected = damage.id === selectedId;
        return (
          <g
            key={damage.id}
            onClick={onSelect ? (event) => { event.stopPropagation(); onSelect(damage.id); } : undefined}
            className={onSelect ? "cursor-pointer" : undefined}
          >
            <circle cx={cx} cy={cy} r={selected ? 9 : 7} fill={type?.color ?? "#ef3f26"} fillOpacity={0.25} className="intake-marker-ring" />
            <circle cx={cx} cy={cy} r={5} fill={type?.color ?? "#ef3f26"} stroke="#fff" strokeWidth={1.5} />
            {numbering?.has(damage.id) && (
              <text x={cx} y={cy + 2.2} textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff">{numbering.get(damage.id)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
