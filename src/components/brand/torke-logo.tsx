import { brandColors, MARK_PATH } from "@/lib/brand";
import { clsx as cn } from "clsx";

type MarkProps = {
  className?: string;
  /** Color de la tuerca. Por defecto Signal Red. */
  color?: string;
  /** Fondo tipo app icon. Sin él la T queda calada y muestra lo que hay detrás. */
  tile?: string;
  title?: string;
};

export function TorkeMark({ className, color = brandColors.signal, tile, title = "TorkeOS" }: MarkProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("shrink-0", className)}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      {tile && <rect width="120" height="120" rx="26" fill={tile} />}
      <path fillRule="evenodd" d={MARK_PATH} fill={color} />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  /** Color del texto "TORKE"; "OS" siempre va en Signal Red. */
  tone?: "light" | "dark";
};

export function TorkeLogo({ className, markClassName, tone = "light" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <TorkeMark className={cn("size-10", markClassName)} color={tone === "dark" ? brandColors.graphite : brandColors.signal} title="" />
      <span
        className="font-display text-2xl leading-none font-bold tracking-[0.01em] uppercase"
        style={{ color: tone === "dark" ? brandColors.graphite : brandColors.paper }}
      >
        Torke<span style={{ color: brandColors.signal }}>OS</span>
      </span>
    </span>
  );
}
