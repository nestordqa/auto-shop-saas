import { ImageResponse } from "next/og";

import { markSvg } from "@/lib/brand";

const mark = `data:image/svg+xml,${encodeURIComponent(markSvg())}`;

export const alt = "TorkeOS · El taller completo, bajo control";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "white",
          background: "radial-gradient(circle at 80% 110%, rgba(239,63,38,0.65), transparent 55%), #171a1f",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo acepta <img> */}
          <img src={mark} width={72} height={72} alt="" />
          <div style={{ display: "flex", fontSize: 48, fontWeight: 800, letterSpacing: 1 }}>
            TORKE<span style={{ color: "#ef3f26" }}>OS</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1 }}>El taller completo,</div>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1, color: "#ff765f" }}>bajo control.</div>
          <div style={{ marginTop: 28, fontSize: 32, color: "#d6d3d1" }}>Citas, diagnósticos y presupuestos para talleres mecánicos.</div>
        </div>
        <div style={{ height: 6, width: 360, background: "linear-gradient(90deg, #ef3f26, transparent)" }} />
      </div>
    ),
    size,
  );
}
