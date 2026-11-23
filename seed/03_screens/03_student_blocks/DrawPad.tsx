"use client";

import { useEffect, useRef, useState } from "react";

export function DrawPad({
  body,
  live,
  strokes,
  drawData,
  onStroke,
  onDrawData,
}: {
  body: string;
  live: boolean;
  strokes: number;
  drawData: string;
  onStroke: (n: number) => void;
  onDrawData: (data: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [count, setCount] = useState(strokes);

  useEffect(() => {
    const c = ref.current;
    if (!c || !drawData) return;
    const img = new Image();
    img.onload = () => {
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = drawData;
  }, [drawData]);

  const snapshot = () => {
    const c = ref.current;
    if (!c) return;
    onDrawData(c.toDataURL("image/png"));
  };

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!live) return;
    drawing.current = true;
    last.current = point(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = point(e);
    ctx.strokeStyle = "#04233a";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const n = count + 1;
    setCount(n);
    onStroke(n);
    snapshot();
  };

  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setCount(0);
    onStroke(0);
    onDrawData("");
  };

  return (
    <div className="mt-3 flex flex-1 flex-col gap-3">
      <p className="m-0 text-sm font-medium leading-relaxed opacity-90">{body}</p>
      <div
        className="relative overflow-hidden rounded-[1.25rem]"
        style={{
          border: "2px dashed rgba(127,127,127,.5)",
          background: "rgba(255,255,255,.42)",
        }}
      >
        <canvas
          ref={ref}
          width={640}
          height={440}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          style={{
            display: "block",
            width: "100%",
            height: 230,
            touchAction: "none",
            cursor: "crosshair",
          }}
        />
        <button
          type="button"
          onClick={clear}
          disabled={!live}
          className="absolute right-2.5 top-2.5 h-11 rounded-full px-4 text-[11px] font-extrabold uppercase tracking-wide"
          style={{ background: "rgba(127,127,127,.28)", color: "var(--ink)" }}
        >
          Clear
        </button>
        <p className="absolute bottom-2.5 left-3.5 m-0 text-[11.5px] font-bold opacity-50">
          {count > 0
            ? "Saved on this device"
            : live
              ? "Draw with your finger"
              : "Read it now · act later"}
        </p>
      </div>
    </div>
  );
}
