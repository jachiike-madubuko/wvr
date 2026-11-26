"use client";

import Link from "next/link";
import { useEffect, useRef, type RefObject } from "react";
import type { PaceBand } from "@/domain/pace/pace";
import type { RoomPack } from "@/lib/room/types";
import type { GroupPacing } from "./group-pacing";

const BAND_META: Record<
  PaceBand,
  { label: string; barColor: string; chipClass: string }
> = {
  ahead: {
    label: "Ahead",
    barColor: "#48e29a",
    chipClass: "border-[#48e29a]/35 bg-[#48e29a]/15 text-[#6ee7b7]",
  },
  on: {
    label: "On Track",
    barColor: "#58b6fa",
    chipClass: "border-[#58b6fa]/35 bg-[#58b6fa]/15 text-[#93c5fd]",
  },
  behind: {
    label: "Behind",
    barColor: "#f87171",
    chipClass: "border-[#f87171]/35 bg-[#f87171]/15 text-[#fca5a5]",
  },
};

const SUBJECT_SHORT: Record<string, string> = {
  math: "Math",
  ela: "ELA",
  science: "Sci",
  social_studies: "Soc. St.",
  art: "Art",
};

function formatOffset(subject: string | null, weeks: number): string {
  if (!subject || weeks === 0) return "On pace";
  const label = SUBJECT_SHORT[subject] ?? subject;
  return `${label} ${weeks > 0 ? `+${weeks}W` : `${weeks}W`}`;
}

export function GroupPacingBreakdown({
  id,
  pack,
  data,
  openUpward = false,
  triggerRef,
  onClose,
}: {
  id: string;
  pack: RoomPack;
  data: GroupPacing;
  openUpward?: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose, triggerRef]);

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={`${pack.label} pacing`}
      tabIndex={-1}
      data-testid="group-pacing-breakdown"
      data-pack-id={pack.id}
      data-total={data.total}
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute left-1/2 z-40 w-72 -translate-x-1/2 rounded-2xl border border-[#2a344d] bg-[#111625] p-4 text-left shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#58b6fa] ${
        openUpward ? "bottom-full mb-2" : "top-full mt-2"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: pack.color }}
          />
          <h3
            className="text-sm font-bold text-[#f6f1ea]"
            style={{ fontFamily: "var(--font-serif-display)" }}
          >
            {pack.label} · Pacing
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#8892b0]">
            {data.total} {data.total === 1 ? "student" : "students"}
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              triggerRef.current?.focus();
            }}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] text-[#cbd5e1] hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#58b6fa]"
          >
            ✕
          </button>
        </div>
      </div>

      {data.total === 0 ? (
        <p className="text-xs text-[#8892b0]">No students in this group yet.</p>
      ) : (
        <>
          <div
            className="mb-2.5 flex h-2 w-full overflow-hidden rounded-full bg-white/10"
            aria-hidden="true"
          >
            {(["ahead", "on", "behind"] as const).map((band) =>
              data.counts[band] > 0 ? (
                <div
                  key={band}
                  style={{
                    width: `${(data.counts[band] / data.total) * 100}%`,
                    backgroundColor: BAND_META[band].barColor,
                  }}
                />
              ) : null,
            )}
          </div>

          <div className="mb-3 grid grid-cols-3 gap-1.5 text-center">
            {(["ahead", "on", "behind"] as const).map((band) => (
              <div
                key={band}
                data-band-stat={band}
                className={`rounded-xl border px-2 py-1.5 ${BAND_META[band].chipClass}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-85">
                  {BAND_META[band].label}
                </div>
                <div className="mt-0.5 text-xs font-extrabold">
                  {data.counts[band]} ({data.percents[band]}%)
                </div>
              </div>
            ))}
          </div>

          <ul
            role="list"
            className="flex max-h-36 flex-col divide-y divide-white/5 overflow-y-auto"
          >
            {data.students.map((stu) => (
              <li
                key={stu.id}
                className="flex items-center justify-between gap-2 py-1.5 text-xs"
              >
                <Link
                  href={`/students/${stu.id}`}
                  className="truncate font-semibold text-[#f6f1ea] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#58b6fa]"
                >
                  {stu.firstName}
                </Link>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[10px] text-[#8892b0]">
                    {formatOffset(stu.worstSubject, stu.worstWeeks)}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${BAND_META[stu.band].chipClass}`}
                  >
                    {BAND_META[stu.band].label}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
