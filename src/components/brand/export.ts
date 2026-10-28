import type { BrandAsset } from "@/lib/brand";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** En móvil abre la hoja nativa (Guardar imagen / Archivos); si no, descarga. */
async function deliver(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return;
    }
  }
  saveBlob(blob, filename);
}

export function downloadText(text: string, filename: string, type: string) {
  saveBlob(new Blob([text], { type }), filename);
}

function wordmarkSvg(asset: BrandAsset) {
  const w = asset.wordmark!;
  const inner = asset.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const text = (x: number, y: number, anchor: string) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="'Barlow Condensed', sans-serif" font-weight="700" font-size="64" letter-spacing="0.6" fill="${w.color}">TORKE<tspan fill="${w.accent}">OS</tspan></text>`;
  return w.layout === "horizontal"
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 120"><g>${inner}</g>${text(128, 82, "start")}</svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 190"><g transform="translate(40 0)">${inner}</g>${text(100, 180, "middle")}</svg>`;
}

export function downloadSvg(asset: BrandAsset) {
  const markup = asset.wordmark ? wordmarkSvg(asset) : asset.svg;
  void deliver(new Blob([markup], { type: "image/svg+xml" }), `${asset.id}.svg`);
}

function loadSvg(markup: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

/** Renderiza el asset a PNG transparente. El wordmark usa Barlow Condensed ya cargada en la página. */
export async function downloadPng(asset: BrandAsset, size = 1024) {
  await document.fonts.ready;
  const img = await loadSvg(asset.svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const w = asset.wordmark;

  if (!w) {
    canvas.width = canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);
  } else {
    const family =
      getComputedStyle(document.documentElement).getPropertyValue("--font-barlow-condensed").trim() || "sans-serif";
    const icon = size * 0.5;
    const big = icon * 0.62;
    ctx.font = `700 ${big}px ${family}`;
    const torke = ctx.measureText("TORKE").width;
    const os = ctx.measureText("OS").width;
    const textW = torke + os;
    const pad = icon * 0.1;

    const draw = (x: number, y: number) => {
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = `700 ${big}px ${family}`;
      ctx.fillStyle = w.color;
      ctx.fillText("TORKE", x, y);
      ctx.fillStyle = w.accent;
      ctx.fillText("OS", x + torke, y);
    };

    if (w.layout === "horizontal") {
      canvas.width = Math.ceil(icon + textW + pad * 2);
      canvas.height = Math.ceil(icon);
      ctx.drawImage(img, 0, 0, icon, icon);
      draw(icon + pad * 0.6, icon * 0.5 + big * 0.36);
    } else {
      canvas.width = Math.ceil(Math.max(icon, textW) + pad * 2);
      canvas.height = Math.ceil(icon + big * 1.05);
      ctx.drawImage(img, (canvas.width - icon) / 2, 0, icon, icon);
      draw((canvas.width - textW) / 2, icon + big * 0.9);
    }
  }

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (blob) await deliver(blob, `${asset.id}-${size}.png`);
}
