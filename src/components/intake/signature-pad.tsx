"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

const WIDTH = 600;
const HEIGHT = 200;

/** Finger/mouse signature captured as a compact PNG data URL. */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#171a1f";
  }, []);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * WIDTH, y: ((event.clientY - rect.top) / rect.height) * HEIGHT };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 0.1, y + 0.1);
    context.stroke();
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange(canvasRef.current?.toDataURL("image/png") ?? null);
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, WIDTH, HEIGHT);
    setEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-md border-2 border-dashed border-stone-300 bg-white">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block aspect-[3/1] w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-label="Área de firma"
        />
        {empty && <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-semibold text-stone-400">Firma aquí con el dedo</p>}
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-stone-300" />
      </div>
      <button type="button" onClick={clear} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-stone-600 hover:bg-stone-100">
        <Eraser size={16} /> Borrar firma
      </button>
    </div>
  );
}
