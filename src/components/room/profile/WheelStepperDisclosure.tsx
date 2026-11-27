"use client";

import { useId, useRef } from "react";
import {
  WHEEL_ANCHORS,
  WHEEL_DIMENSIONS,
  ariaValueText,
  type WheelDimension,
  type WheelScore,
  type WheelScores,
} from "@/lib/students/wheel";

type Props = {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: WheelScores;
  disabled: boolean;
  hints: Record<WheelDimension, string>;
  hintIdFor: (d: WheelDimension) => string;
  onChange: (d: WheelDimension, v: WheelScore | null) => void;
};

export function WheelStepperDisclosure({
  studentId,
  open,
  onOpenChange,
  draft,
  disabled,
  hints,
  hintIdFor,
  onChange,
}: Props) {
  const panelId = `wheel-steppers-${studentId}`;
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const nameId = useId();

  const toggle = () => {
    if (
      open &&
      typeof document !== "undefined" &&
      panelRef.current?.contains(document.activeElement)
    ) {
      btnRef.current?.focus({ preventScroll: true }); // R-15
    }
    onOpenChange(!open);
  };

  const bump = (d: WheelDimension, dir: 1 | -1) => {
    if (disabled) return;
    const v = draft[d];
    if (dir > 0) {
      onChange(d, v === null ? 1 : (Math.min(5, v + 1) as WheelScore));
    } else if (v !== null) {
      onChange(d, Math.max(1, v - 1) as WheelScore); // − at 1 / Not set: no-op
    }
  };

  return (
    <div className="mt-3">
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        data-testid="wheel-steppers-toggle"
        className="min-h-11 w-full rounded-full border border-white/15 px-4 text-sm font-semibold text-[#58b6fa] hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd479]"
      >
        {open ? "Hide +/− controls" : "Show +/− controls"}
      </button>

      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className="mt-3 flex flex-col gap-4"
      >
        {WHEEL_DIMENSIONS.map((d) => {
          const v = draft[d];
          return (
            <div
              key={d}
              data-testid={`wheel-stepper-row-${d}`}
              className="flex flex-col gap-1"
            >
              {/* Line 1: bold name + Clear only (no value text -> >= 16px slack at 360px, R-11) */}
              <div
                data-testid={`wheel-stepper-line1-${d}`}
                className="flex min-h-11 items-center justify-between gap-2 whitespace-nowrap"
              >
                <span
                  id={`${nameId}-${d}`}
                  className="text-sm font-bold text-[#f6f1ea]"
                >
                  {d}
                </span>
                {v !== null && (
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Clear ${d}`}
                    onClick={() => onChange(d, null)}
                    className="min-h-11 min-w-11 px-2 text-sm font-bold text-[#58b6fa] underline disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd479]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Line 2: observation hint (also aria-describedby target for radar handle) */}
              <p
                id={hintIdFor(d)}
                className="text-xs leading-snug text-[#8892b0]"
              >
                {hints[d]}
              </p>

              {/* Line 3: [−] [value box] [+], 52x48 buttons with 8px gaps */}
              <div className="mt-1 flex items-stretch gap-2">
                <button
                  type="button"
                  aria-label={`Decrease ${d}`}
                  disabled={disabled}
                  onClick={() => bump(d, -1)}
                  className="min-h-12 w-[52px] shrink-0 rounded-xl border border-white/15 text-xl font-semibold text-[#f6f1ea] hover:bg-white/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd479]"
                >
                  −
                </button>
                <div
                  role="spinbutton"
                  tabIndex={0}
                  aria-labelledby={`${nameId}-${d}`}
                  aria-describedby={hintIdFor(d)}
                  aria-valuemin={1}
                  aria-valuemax={5}
                  aria-valuenow={v ?? undefined}
                  aria-valuetext={ariaValueText(v)}
                  aria-disabled={disabled || undefined}
                  data-testid={`wheel-stepper-value-${d}`}
                  className="flex min-h-12 flex-1 flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0b1020] px-1.5 py-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd479]"
                  onKeyDown={(e) => {
                    if (disabled) return;
                    const k = e.key;
                    if (k === "ArrowUp" || k === "ArrowRight") bump(d, 1);
                    else if (k === "ArrowDown" || k === "ArrowLeft") bump(d, -1);
                    else if (k === "Home") onChange(d, 1);
                    else if (k === "End") onChange(d, 5);
                    else if (k === "Delete" || k === "Backspace") onChange(d, null);
                    else return;
                    e.preventDefault();
                  }}
                >
                  {v === null ? (
                    <span className="text-sm font-bold text-[#f6f1ea]">
                      Not set
                    </span>
                  ) : (
                    <>
                      <span className="text-sm font-bold leading-tight text-[#f6f1ea]">
                        {v}
                      </span>
                      <span className="whitespace-nowrap text-[0.8rem] leading-tight text-[#cbd5e1]">
                        {WHEEL_ANCHORS[v]}
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Increase ${d}`}
                  disabled={disabled}
                  onClick={() => bump(d, 1)}
                  className="min-h-12 w-[52px] shrink-0 rounded-xl border border-white/15 text-xl font-semibold text-[#f6f1ea] hover:bg-white/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd479]"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
