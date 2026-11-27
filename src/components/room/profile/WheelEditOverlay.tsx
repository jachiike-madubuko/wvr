"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import {
  WHEEL_DIMENSIONS,
  ariaValueText,
  type WheelDimension,
  type WheelScore,
  type WheelScores,
} from "@/lib/students/wheel";
import {
  axisAngle,
  hitTest,
  snapScore,
} from "@/lib/students/wheel-geometry";

export type WheelEditOverlayHandle = {
  focusHandle: (index: number) => void;
};

type Props = {
  ref?: Ref<WheelEditOverlayHandle>;
  size: number;
  margin: number;
  draft: WheelScores;
  disabled: boolean;
  onChange: (d: WheelDimension, v: WheelScore | null) => void;
  hintIdFor: (d: WheelDimension) => string;
};

const HIT_R = 24; // 48px CSS target >= 44px (R-9)
const TWEEN_MS = 150;

function targetRadii(draft: WheelScores, radius: number): number[] {
  return WHEEL_DIMENSIONS.map((d) => {
    const v = draft[d];
    return v === null ? 0 : (v / 5) * radius;
  });
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function WheelEditOverlay({
  ref,
  size,
  margin,
  draft,
  disabled,
  onChange,
  hintIdFor,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const handles = useRef<(SVGGElement | null)[]>([]);
  const dragIndex = useRef<number | null>(null);
  const radius = Math.max(20, (size - margin * 2) / 2);

  const [displayRadii, setDisplayRadii] = useState<number[]>(() =>
    targetRadii(draft, radius),
  );
  const currentRadiiRef = useRef<number[]>(displayRadii);
  const rafRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    focusHandle(index: number) {
      handles.current[index]?.focus({ preventScroll: true });
    },
  }));

  // Focus handle 0 once on edit-overlay mount without scrolling (R-3). Never re-focuses on render.
  useEffect(() => {
    handles.current[0]?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const targets = targetRadii(draft, radius);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (prefersReducedMotion()) {
      currentRadiiRef.current = targets;
      setDisplayRadii(targets);
      return;
    }

    const from = currentRadiiRef.current.slice();
    const changed = targets.some((t, i) => Math.abs(t - (from[i] ?? 0)) > 0.25);
    if (!changed) {
      currentRadiiRef.current = targets;
      setDisplayRadii(targets);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const elapsed = Math.max(0, now - start);
      const t = Math.min(1, elapsed / TWEEN_MS);
      const eased = 1 - (1 - t) ** 3; // ease-out cubic
      const next = targets.map((goal, i) => {
        const startVal = from[i] ?? 0;
        return startVal + (goal - startVal) * eased;
      });
      currentRadiiRef.current = next;
      setDisplayRadii(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    // Start moving on the first frame immediately (B-13)
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draft, radius]);

  const localPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - r.left - size / 2,
      y: e.clientY - r.top - size / 2,
    };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const { x, y } = localPoint(e);
    const hit = hitTest(x, y, radius);
    if (!hit) return; // R-6: ignore outside radius + 16px
    dragIndex.current = hit.index;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    handles.current[hit.index]?.focus({ preventScroll: true }); // R-3
    const dim = WHEEL_DIMENSIONS[hit.index]!;
    if (hit.score !== null && hit.score !== draft[dim]) {
      onChange(dim, hit.score);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const i = dragIndex.current;
    if (i === null || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const { x, y } = localPoint(e);
    const score = snapScore(Math.hypot(x, y), radius); // stays on starting wedge
    const dim = WHEEL_DIMENSIONS[i]!;
    if (score !== null && score !== draft[dim]) {
      onChange(dim, score);
    }
  };

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    dragIndex.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown =
    (d: WheelDimension) => (e: React.KeyboardEvent<SVGGElement>) => {
      if (disabled) return;
      const v = draft[d];
      let next: WheelScore | null | undefined;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        next = v === null ? 1 : (Math.min(5, v + 1) as WheelScore);
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        next = v === null ? null : (Math.max(1, v - 1) as WheelScore);
      } else if (e.key === "Home") {
        next = 1;
      } else if (e.key === "End") {
        next = 5;
      } else if (e.key === "Delete" || e.key === "Backspace") {
        next = null; // proposed (OQ-D2)
      } else {
        return;
      }
      e.preventDefault();
      if (next !== v) onChange(d, next);
    };

  const polyPoints = WHEEL_DIMENSIONS.map((_, i) => {
    const r = displayRadii[i] ?? 0;
    const a = axisAngle(i);
    return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      data-testid="wheel-edit-overlay"
      className="absolute inset-0 overflow-visible select-none"
      style={{ touchAction: "none" }} /* R-4: mounted only in edit mode */
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <polygon
          data-testid="wheel-draft-polygon"
          points={polyPoints}
          fill="none"
          stroke="#58b6fa"
          strokeWidth={2.5}
          strokeDasharray="6 4"
          strokeLinejoin="round"
        />
        {WHEEL_DIMENSIONS.map((d, i) => {
          const v = draft[d];
          const a = axisAngle(i);
          const r = v === null ? radius : (displayRadii[i] ?? (v / 5) * radius);
          const x = r * Math.cos(a);
          const y = r * Math.sin(a);
          return (
            <g
              key={d}
              ref={(el) => {
                handles.current[i] = el;
              }}
              data-testid={`wheel-handle-${i}`}
              role="spinbutton"
              tabIndex={0}
              aria-label={d}
              aria-describedby={hintIdFor(d)}
              aria-valuemin={1}
              aria-valuemax={5}
              aria-valuenow={v ?? undefined}
              aria-valuetext={ariaValueText(v)}
              aria-disabled={disabled || undefined}
              onKeyDown={onKeyDown(d)}
              transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
              className="cursor-grab outline-none active:cursor-grabbing [&:focus-visible>.knob]:stroke-[#ffd479] [&:focus-visible>.knob]:stroke-[4]"
            >
              <circle r={HIT_R} fill="transparent" className="hit" />
              <circle
                r={9}
                className="knob"
                fill={v === null ? "#111728" : "#58b6fa"}
                stroke={v === null ? "#58b6fa" : "#082033"}
                strokeWidth={v === null ? 2.5 : 2}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
