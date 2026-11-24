"use client";

import { useState } from "react";
import { WavyStackBar } from "@/components/charts/WavyStackBar";
import { dayPace, pacePercents, type PaceSession } from "@/domain/pace/pace";
import {
  addDays,
  isoDate,
  mondayOf,
  monthGrid,
  shortDate,
  weekdaysFromMonday,
} from "@/lib/room/dates";
import type { RoomCalendarBlock, RoomStudent } from "@/lib/room/types";
import { PacingTable } from "./PacingTable";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function CalendarGrid({
  className,
  students,
  blocks,
  sessions,
}: {
  className: string;
  students: RoomStudent[];
  blocks: RoomCalendarBlock[];
  sessions: PaceSession[];
}) {
  const today = isoDate(new Date());
  const defaultAnchor =
    blocks.find((b) => b.kind === "lesson" && b.startDate <= today && today <= b.endDate)
      ?.startDate ??
    blocks.find((b) => b.kind === "lesson")?.startDate ??
    today;

  const [subView, setSubView] = useState<"grid" | "table">("grid");
  const [rangeView, setRangeView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => mondayOf(defaultAnchor));

  const cursorDate = new Date(`${cursor}T12:00:00`);
  const days =
    rangeView === "week"
      ? weekdaysFromMonday(cursor)
      : monthGrid(cursorDate.getFullYear(), cursorDate.getMonth());

  const heading =
    rangeView === "week"
      ? `${shortDate(days[0]!)} – ${shortDate(days[days.length - 1]!)}`
      : cursorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#58b6fa]">
            Pacing Dashboard · {className}
          </p>
          <h2
            className="text-2xl font-bold text-[#f6f1ea]"
            style={{ fontFamily: "var(--font-serif-display)" }}
          >
            {heading}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-white/5 p-1">
            <button
              type="button"
              data-testid="cal-view-grid"
              aria-pressed={subView === "grid"}
              onClick={() => setSubView("grid")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                subView === "grid" ? "bg-white text-black" : "text-[#8892b0]"
              }`}
            >
              Wavy Calendar
            </button>
            <button
              type="button"
              data-testid="cal-view-table"
              aria-pressed={subView === "table"}
              onClick={() => setSubView("table")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                subView === "table" ? "bg-white text-black" : "text-[#8892b0]"
              }`}
            >
              Swimlane Table
            </button>
          </div>

          {subView === "grid" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous"
                onClick={() =>
                  setCursor((c) => addDays(c, rangeView === "week" ? -7 : -28))
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm text-white"
              >
                ‹
              </button>
              <div className="flex rounded-full bg-white/5 p-1">
                <button
                  type="button"
                  aria-pressed={rangeView === "week"}
                  onClick={() => setRangeView("week")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    rangeView === "week" ? "bg-white text-black" : "text-[#8892b0]"
                  }`}
                >
                  Week
                </button>
                <button
                  type="button"
                  aria-pressed={rangeView === "month"}
                  onClick={() => setRangeView("month")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    rangeView === "month" ? "bg-white text-black" : "text-[#8892b0]"
                  }`}
                >
                  Month
                </button>
              </div>
              <button
                type="button"
                aria-label="Next"
                onClick={() =>
                  setCursor((c) => addDays(c, rangeView === "week" ? 7 : 28))
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm text-white"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {subView === "grid" ? (
        <>
          <div className="mb-4 flex gap-5 text-xs font-semibold text-[#cbd5e1]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#48e29a]" />
              Ahead
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#58b6fa]" />
              On pace
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f87171]" />
              Behind
            </span>
          </div>

          <div className="mb-2 grid grid-cols-5 gap-3.5 text-center text-xs font-bold uppercase tracking-wider text-[#8892b0]">
            {DOW.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-3.5" data-testid="calendar-grid">
            {days.map((iso) => {
              const pace = dayPace({
                date: iso,
                blocks,
                students: students.map((s) => ({ id: s.id, firstName: s.firstName })),
                sessions,
              });
              const pct = pacePercents(pace);
              const isToday = iso === today;
              const dayLesson = blocks.find(
                (b) => b.kind === "lesson" && b.startDate <= iso && iso <= b.endDate,
              );

              return (
                <div
                  key={iso}
                  data-iso={iso}
                  data-today={isToday ? "true" : undefined}
                  className={`flex min-h-[210px] flex-col gap-3 rounded-[18px] bg-[#131826] p-4 ${
                    isToday
                      ? "border-[1.5px] border-[#58b6fa] shadow-[0_0_20px_-5px_rgba(88,182,250,0.3)]"
                      : "border border-[#232c3f]"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-extrabold text-[#f6f1ea]">
                      {new Date(`${iso}T12:00:00`).getDate()}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-extrabold uppercase text-[#58b6fa]">
                        Today
                      </span>
                    )}
                  </div>

                  {dayLesson && (
                    <div className="truncate text-[11px] font-semibold text-[#cbd5e1]">
                      {dayLesson.title}
                    </div>
                  )}

                  {!pace.empty ? (
                    <>
                      <WavyStackBar
                        instanceId={`cal-${iso}`}
                        height={rangeView === "month" ? 72 : 110}
                        animated={rangeView === "week"}
                        showLabels={rangeView === "week"}
                        segments={[
                          { id: "ahead", value: pct.ahead, color: "#48e29a", label: "Ahead" },
                          { id: "on", value: pct.on, color: "#58b6fa", label: "On pace" },
                          { id: "behind", value: pct.behind, color: "#f87171", label: "Behind" },
                        ]}
                      />
                      <div className="mt-auto flex justify-between text-[11px] text-[#8892b0]">
                        <span>{pct.ahead}% ahead</span>
                        <span>{pct.behind}% behind</span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-auto text-[11px] text-[#8892b0]/70">
                      No sessions yet
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <PacingTable students={students} />
      )}
    </div>
  );
}
