"use client";

import { Check, Copy, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR + link to the garage sign-up with the coupon prefilled. Shown to admins and to the seller. */
export function CouponQr({ code, baseUrl }: { code: string; baseUrl: string }) {
  const url = `${baseUrl}/register?tipo=taller&cupon=${encodeURIComponent(code)}`;
  const [image, setImage] = useState<string>();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: "#171a1f", light: "#ffffff" } }).then((data) => { if (!cancelled) setImage(data); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [url]);

  async function copy(kind: "code" | "link") {
    await navigator.clipboard.writeText(kind === "code" ? code : url).catch(() => undefined);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
      <div className="grid aspect-square w-44 place-items-center justify-self-center rounded-lg border border-stone-200 bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image ? <img src={image} alt={`QR del cupón ${code}`} className="size-full" /> : <QrCode className="text-stone-300" size={48} />}
      </div>
      <div className="grid min-w-0 gap-2">
        <p className="text-xs font-bold uppercase text-stone-500">Cupón</p>
        <p className="font-mono text-2xl font-bold tracking-wide">{code}</p>
        <p className="break-all text-xs text-stone-500">{url}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button type="button" onClick={() => copy("code")} className="flex min-h-10 items-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-bold">{copied === "code" ? <Check size={16} /> : <Copy size={16} />} Copiar cupón</button>
          <button type="button" onClick={() => copy("link")} className="flex min-h-10 items-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-bold">{copied === "link" ? <Check size={16} /> : <Copy size={16} />} Copiar enlace</button>
          {image && <a href={image} download={`torkeos-cupon-${code}.png`} className="flex min-h-10 items-center gap-2 rounded-md bg-stone-900 px-3 text-sm font-bold text-white"><Download size={16} /> Descargar QR</a>}
        </div>
      </div>
    </div>
  );
}
