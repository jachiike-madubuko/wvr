"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PaceBand } from "@/domain/pace/pace";
import { addDays, isoDate, shortDate } from "@/lib/room/dates";
import type { RoomStudent } from "@/lib/room/types";
import { AlertMark } from "./AlertMark";

const SUBJECTS = [
  { id: "math", label: "Math", code: "M" },
  { id: "ela", label: "ELA", code: "E" },
  { id: "science", label: "Science", code: "S" },
  { id: "social_studies", label: "Social Studies", code: "SS" },
  { id: "art", label: "Art", code: "A" },
] as const;

type SubjectId = (typeof SUBJECTS)[number]["id"];
type SubjectFilter = "overall" | SubjectId;

const WEEK_OFFSETS = [-3, -2, -1, 0, 1, 2] as const;

const BAND_LABEL: Record<PaceBand, string> = {
  behind: "Behind",
  on: "On Track",
  ahead: "Ahead",
};

const BAND_CHIP_STYLE: Record<PaceBand, string> = {
  behind: "border-[#f87171]/35 bg-[#f87171]/15 text-[#fca5a5]",
  on: "border-[#48e29a]/35 bg-[#48e29a]/15 text-[#6ee7b7]",
  ahead: "border-[#58b6fa]/35 bg-[#58b6fa]/15 text-[#93c5fd]",
};

function weekFromBand(band: PaceBand): number {
  if (band === "behind") return -1;
  if (band === "ahead") return 1;
  return 0;
}

function clampWeek(week: number): number {
  return Math.max(-3, Math.min(2, Math.round(week)));
}

function bandFromWeek(week: number): PaceBand {
  if (week < 0) return "behind";
  if (week > 0) return "ahead";
  return "on";
}

function PillBadge({ band }: { band: PaceBand }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${BAND_CHIP_STYLE[band]}`}
    >
      {BAND_LABEL[band]}
    </span>
  );
}

export function PacingTable({
  students,
  creditMultiplier = 1,
}: {
  students: RoomStudent[];
  creditMultiplier?: number;
}) {
  const [subject, setSubject] = useState<SubjectFilter>("overall");
  const [statusFilter, setStatusFilter] = useState<"all" | PaceBand>("all");

  const weekColumns = useMemo(() => {
    const today = isoDate(new Date());
    return WEEK_OFFSETS.map((offset) => ({
      offset,
      tag: offset === 0 ? "TODAY" : offset > 0 ? `+${offset}W` : `${offset}W`,
      dateLabel: shortDate(addDays(today, offset * 7)),
    }));
  }, []);

  const rows = useMemo(() => {
    const activeSubjects =
      subject === "overall"
        ? SUBJECTS
        : SUBJECTS.filter((s) => s.id === subject);

    return students.map((student) => {
      const plotted = activeSubjects.map((subj) => {
        const fallbackBand = student.subjectBands[subj.id] ?? student.paceBand;
        const rawWeek =
          student.subjectWeeks?.[subj.id] ?? weekFromBand(fallbackBand);
        const week = clampWeek(rawWeek);
        return {
          ...subj,
          week,
          band: bandFromWeek(week),
        };
      });

      const minWeek = Math.min(...plotted.map((p) => p.week));
      const behindSubjects = plotted.filter((p) => p.band === "behind");
      const overallBand: PaceBand =
        behindSubjects.length > 0
          ? "behind"
          : plotted.every((p) => p.band === "ahead")
            ? "ahead"
            : "on";

      const subtitle =
        behindSubjects.length > 0
          ? `Behind in ${behindSubjects.map((b) => b.label).join(", ")}`
          : "On pace or ahead in all";

      return {
        student,
        plotted,
        minWeek,
        behindCount: behindSubjects.length,
        band: overallBand,
        subtitle,
      };
    });
  }, [students, subject]);

  const counts = useMemo(() => {
    const out = { behind: 0, on: 0, ahead: 0 };
    for (const r of rows) out[r.band] += 1;
    return out;
  }, [rows]);

  const visible = useMemo(() => {
    return rows
      .filter((r) => statusFilter === "all" || r.band === statusFilter)
      .sort((a, b) => {
        if (a.minWeek !== b.minWeek) return a.minWeek - b.minWeek;
        if (a.behindCount !== b.behindCount)
          return b.behindCount - a.behindCount;
        return a.student.firstName.localeCompare(b.student.firstName);
      });
  }, [rows, statusFilter]);

  const activeSubjectLabel =
    subject === "overall"
      ? "All 5 Subjects"
      : (SUBJECTS.find((s) => s.id === subject)?.label ?? subject);

  return (
    <section
      className="rounded-[20px] border border-white/10 bg-[#131826] p-6"
      aria-label="Individual Student Pacing Swimlanes"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Subject filters"
        >
          {(
            [
              { id: "overall", label: "Overall" },
              ...SUBJECTS.map((s) => ({ id: s.id, label: s.label })),
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={subject === tab.id}
              onClick={() => setSubject(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                subject === tab.id
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/5 text-[#8892b0] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Class pace summary"
        >
          {(["behind", "on", "ahead"] as const).map((band) => {
            const active = statusFilter === band;
            const dotColor =
              band === "behind"
                ? "var(--pace-behind)"
                : band === "on"
                  ? "var(--pace-on)"
                  : "var(--pace-ahead)";
            return (
              <button
                key={band}
                type="button"
                data-testid={`pulse-pill-${band}`}
                aria-pressed={active}
                onClick={() =>
                  setStatusFilter((prev) => (prev === band ? "all" : band))
                }
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  active
                    ? "border-white/40 bg-white/15 text-white"
                    : "border-white/10 bg-white/5 text-[#8892b0]"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
                {counts[band]} {BAND_LABEL[band]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h3
            className="text-lg font-bold text-[#f6f1ea]"
            style={{ fontFamily: "var(--font-serif-display)" }}
          >
            {subject === "overall"
              ? "Overall Class Pulse Across All 5 Subjects"
              : `${activeSubjectLabel} Standards Pace`}
          </h3>
          <p className="mt-0.5 text-xs text-[#8892b0]">
            Sorted automatically by urgency (furthest behind at top). Each
            standard spans 1–2 weeks; subjects plot directly on each
            student&apos;s track—no averaged averages hiding struggles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8892b0]">
          {SUBJECTS.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1">
              <span className="font-extrabold text-[#f6f1ea]">{s.code}</span>
              <span>{s.label === "Social Studies" ? "Soc. Studies" : s.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#8892b0]">
              <th className="w-56 px-3 py-2.5">Student (Sorted by Need)</th>
              {weekColumns.map((col) => (
                <th key={col.offset} className="px-2 py-2.5 text-center">
                  <div
                    className={`mx-auto inline-flex flex-col items-center rounded-xl px-3 py-1 ${
                      col.offset === 0
                        ? "bg-white text-black"
                        : "bg-white/5 text-[#cbd5e1]"
                    }`}
                  >
                    <span className="text-[10px] font-extrabold tracking-wider">
                      {col.tag}
                    </span>
                    <span className="text-[11px] font-semibold">
                      {col.dateLabel}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(({ student, band, subtitle, plotted }) => (
              <tr
                key={student.id}
                data-testid={`student-row-${student.id}`}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-semibold text-[#f6f1ea] hover:underline"
                        >
                          {student.firstName}
                        </Link>
                        {student.alert && (
                          <AlertMark
                            studentId={student.id}
                            alert={student.alert}
                          />
                        )}
                      </div>
                      <p className="truncate text-[11px] text-[#8892b0]">
                        {subtitle}
                        {student.creditsEarned !== undefined &&
                        student.creditTarget !== undefined
                          ? ` · ${student.creditsEarned}/${Math.max(5, Math.round(student.creditTarget * creditMultiplier))} cr`
                          : ""}
                        {student.interventionStatus === "resolved"
                          ? " · Plan Resolved"
                          : ""}
                      </p>
                    </div>
                    <PillBadge band={band} />
                  </div>
                </td>

                {weekColumns.map((col) => {
                  const items = plotted.filter((p) => p.week === col.offset);
                  return (
                    <td
                      key={col.offset}
                      data-week-offset={col.offset}
                      className="px-1.5 py-2.5 text-center align-middle"
                    >
                      <div
                        className={`flex min-h-[36px] flex-wrap items-center justify-center gap-1 rounded-xl px-1.5 py-1 ${
                          col.offset === 0
                            ? "border border-white/10 bg-white/[0.04]"
                            : ""
                        }`}
                      >
                        {items.map((item) => (
                          <span
                            key={item.id}
                            title={`${item.label}: ${BAND_LABEL[item.band]} (${col.tag})`}
                            data-subject-chip={item.id}
                            className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border px-1.5 text-[11px] font-extrabold ${BAND_CHIP_STYLE[item.band]}`}
                          >
                            {item.code}
                          </span>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
