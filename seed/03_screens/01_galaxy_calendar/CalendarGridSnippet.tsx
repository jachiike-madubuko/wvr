// Calendar grid component – renders week/month view with pace bands, navigation, and legend
// Source: web/src/components/room/CalendarGrid.tsx (full file)

"use client";
import { useMemo, useState } from "react";
import { listLocalPathSessions } from "@/lib/classroom/local-path-sessions";
import { addDays, isoDate, mondayOf, monthGrid, shortDate, weekdaysFromMonday } from "@/lib/room/dates";
import { groupsNeedingContent } from "@/lib/room/expiry";
import { dayPace, pacePercents, type PaceSession } from "@/lib/room/pace";
import { useRoom } from "@/components/room/RoomProvider";
import { useLessonPlanOptional } from "@/components/room/lesson-plan";
import { WavyStackBar, useWavePhase } from "@/components/room/WavyStackBar";

function toPaceSessions(): PaceSession[] {
  return listLocalPathSessions().map((row) => ({
    studentId: row.studentId,
    firstName: row.firstName,
    calendarBlockId: row.calendarBlockId,
    blockMs: row.blockMs,
    pins: row.blocks,
  }));
}

export function CalendarGrid({
  mode = "page",
  onPickDate,
}: {
  mode?: "page" | "drawer";
  onPickDate?: (iso: string) => void;
}) {
  const today = isoDate(new Date());
  const { classroom, blocks, selectedPackIds, openPanel } = useRoom();
  const plan = useLessonPlanOptional();
  const planMoves = plan ? Object.keys(plan.moves).length : 0;
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(mondayOf(today));
  const sessions = useMemo(() => toPaceSessions(), []);
  const wavePhase = useWavePhase(0.6, view === "week");

  const days =
    view === "week"
      ? weekdaysFromMonday(cursor)
      : monthGrid(new Date(`${cursor}T12:00:00`).getFullYear(), new Date(`${cursor}T12:00:00`).getMonth());

  const weekHasSessions = days.some((d) => {
    const pace = dayPace({
      date: d,
      blocks,
      students: classroom.students,
      sessions,
    });
    return !pace.empty;
  });

  const heading =
    view === "week"
      ? `${shortDate(days[0]!)} – ${shortDate(days[days.length - 1]!)}`
      : new Date(`${cursor}T12:00:00`).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

  return (
    <div className="wv-stack">
      <div className="wv-head">
        <div className="wv-head-text">
          <p className="wv-kicker">{mode === "drawer" ? "This week" : "Calendar"}</p>
          <h2 className="wv-title" style={{ fontSize: mode === "drawer" ? "1.5rem" : undefined }}>
            {heading}
          </h2>
          <p className="wv-subtitle">
            {weekHasSessions
              ? "Click a colour band to see those students. Click a day to see the groups that need content."
              : "Pace fills in after students open their path."}
          </p>
        </div>
        <div className="wv-row">
          <button type="button" className="wv-disc" aria-label="Previous" onClick={() => setCursor((cur) => addDays(cur, view === "week" ? -7 : -28))}>‹</button>
          <div className="wv-seg" data-wv-seg="cal">
            <button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>Week</button>
            <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>Month</button>
          </div>
          <button type="button" className="wv-disc" aria-label="Next" onClick={() => setCursor((cur) => addDays(cur, view === "week" ? 7 : 28))}>›</button>
        </div>
      </div>
      <div className="wv-legend">
        <span className="wv-legend-item"><span className="wv-dot" style={{ background: "var(--pace-ahead)" }} />Ahead</span>
        <span className="wv-legend-item"><span className="wv-dot" style={{ background: "var(--pace-on)" }} />On pace</span>
        <span className="wv-legend-item"><span className="wv-dot" style={{ background: "var(--pace-behind)" }} />Behind</span>
      </div>
      <div className="wv-cal" data-wv-view={view}>
        <div className="wv-cal-dow">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className={`wv-cal-grid wv-cal-grid--${view}`)}>
          {days.map((iso) => {
            const pace = dayPace({
              date: iso,
              blocks,
              students: classroom.students,
              sessions,
            });
            const percents = pacePercents(pace);
            const expiry = groupsNeedingContent(iso, blocks, selectedPackIds);
            const inMonth = new Date(`${iso}T12:00:00`).getMonth() === new Date(`${cursor}T12:00:00`).getMonth();
            return (
              <button
                key={iso}
                type="button"
                className={`wv-cell ${view === "month" ? "wv-cell--month" : ""}`}
                data-iso={iso}
                onClick={() => {
                  onPickDate?.(iso);
                  if (plan?.active) {
                    plan.pickDate(iso);
                    return;
                  }
                  openPanel("date", iso);
                }}
              >
                <span className="wv-cell-datewrap">
                  <span
                    className={`wv-cell-date ${iso === today ? "wv-cell-date--today" : ""} ${!inMonth && view === "month" ? "wv-cell-date--muted" : ""}`}
                  >
                    {new Date(`${iso}T12:00:00`).getDate()}
                  </span>
                </span>
                {plan && planMoves > 0 && plan.date === iso && (
                  <span className="wv-cell-plan" data-plan-day>
                    Group set · {planMoves}
                  </span>
                )}
                {expiry.length > 0 && (
                  <span className="wv-cell-expiry">{expiry.length}</span>
                )}
                {!pace.empty && (
                  <WavyStackBar
                    instanceId={`${mode}-${iso}`}
                    ahead={percents.ahead}
                    on={percents.on}
                    behind={percents.behind}
                    muted={!inMonth && view === "month"}
                    labels={view === "week"}
                    phase={view === "week" ? wavePhase : 0}
                    cornerRadius={view === "month" ? 18 : 20}
                    waveAmplitude={view === "month" ? 4 : 6}
                    onBandClick={() => openPanel("behind", iso)}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
