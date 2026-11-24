"use client";

import { useRef, useState } from "react";

export function DrawPad({
  prompt,
  onStrokeChange,
}: {
  prompt: string;
  onStrokeChange: (count: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const [strokes, setStrokes] = useState(0);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * c.width) / rect.width,
      y: ((e.clientY - rect.top) * c.height) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, c.width, c.height));
    drawingRef.current = true;
    lastRef.current = getPoint(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = getPoint(e);
    ctx.strokeStyle = "#04243b";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const next = strokes + 1;
    setStrokes(next);
    onStrokeChange(next);
  };

  const undo = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    const prev = historyRef.current.pop();
    if (!c || !ctx || !prev) return;
    ctx.putImageData(prev, 0, 0);
    const next = Math.max(0, strokes - 1);
    setStrokes(next);
    onStrokeChange(next);
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    historyRef.current = [];
    setStrokes(0);
    onStrokeChange(0);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-300">{prompt}</p>
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-[#58b6fa]/50 bg-[#e2f2ff]">
        <canvas
          ref={canvasRef}
          data-testid="drawpad-canvas"
          width={480}
          height={240}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
          className="block h-44 w-full cursor-crosshair touch-none"
        />
        <div className="absolute right-2 top-2 flex gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={strokes === 0}
            className="rounded-full bg-[#04243b]/15 px-3 py-1 text-[11px] font-bold text-[#04243b] disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={strokes === 0}
            className="rounded-full bg-[#04243b]/15 px-3 py-1 text-[11px] font-bold text-[#04243b] disabled:opacity-40"
          >
            Clear
          </button>
        </div>
        <span className="pointer-events-none absolute bottom-2 left-3 text-[11px] font-bold text-[#04243b]/60">
          {strokes > 0 ? `${strokes} stroke${strokes === 1 ? "" : "s"}` : "Draw with your finger or mouse"}
        </span>
      </div>
    </div>
  );
}
