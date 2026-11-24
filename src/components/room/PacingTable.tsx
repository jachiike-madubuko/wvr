"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PaceBand } from "@/domain/pace/pace";
import type { RoomStudent } from "@/lib/room/types";

const BAND_ORDER: Record<PaceBand, number> = {
  behind: 0,
  on: 1,
  ahead: 2,
};

const BAND_LABEL: Record<PaceBand, string> = {
  behind: "Behind",
  on: "On Track",
  ahead: "Ahead",
};

function PillBadge({ band }: { band: PaceBand }) {
  const cls =
    band === "ahead"
      ? "bg-[#48e29a]/15 text-[#48e29a]"
      : band === "behind"
        ? "bg-[#f87171]/15 text-[#f87171]"
        : "bg-[#58b6fa]/15 text-[#58b6fa]";
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      {BAND_LABEL[band]}
    </span>
  );
}

export function PacingTable({ students }: { students: RoomStudent[] }) {
  const [subject, setSubject] = useState<"overall" | "math" | "ela">("overall");
  const [statusFilter, setStatusFilter] = useState<"all" | PaceBand>("all");

  const counts = useMemo(() => {
    const out = { behind: 0, on: 0, ahead: 0 };
    for (const s of students) {
      const band = subject === "overall" ? s.paceBand : (s.subjectBands[subject] ?? s.paceBand);
      out[band] += 1;
    }
    return out;
  }, [students, subject]);

  const visible = useMemo(() => {
    return students
      .map((s) => ({
        student: s,
        band: subject === "overall" ? s.paceBand : (s.subjectBands[subject] ?? s.paceBand),
      }))
      .filter((row) => statusFilter === "all" || row.band === statusFilter)
      .sort((a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band]);
  }, [students, subject, statusFilter]);

  return (
    <section
      className="rounded-[20px] border border-white/10 bg-[#131826] p-6"
      aria-label="Individual Student Pacing Swimlanes"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Subject filters">
          {(
            [
              ["overall", "Overall"],
              ["math", "Math"],
              ["ela", "ELA"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={subject === id}
              onClick={() => setSubject(id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                subject === id
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/5 text-[#8892b0]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2" role="group" aria-label="Class pace summary">
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
                onClick={() => setStatusFilter((prev) => (prev === band ? "all" : band))}
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

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#8892b0]">
            <th className="px-3 py-2.5">Student</th>
            <th className="px-3 py-2.5">Math</th>
            <th className="px-3 py-2.5">ELA</th>
            <th className="px-3 py-2.5">Overall</th>
            <th className="px-3 py-2.5">Action</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(({ student, band }) => (
            <tr
              key={student.id}
              data-testid={`student-row-${student.id}`}
              className="border-b border-white/5"
            >
              <td className="px-3 py-3 font-semibold text-[#f6f1ea]">
                <Link href={`/students/${student.id}`} className="hover:underline">
                  {student.firstName}
                </Link>
              </td>
              <td className="px-3 py-3">
                <PillBadge band={student.subjectBands.math ?? student.paceBand} />
              </td>
              <td className="px-3 py-3">
                <PillBadge band={student.subjectBands.ela ?? student.paceBand} />
              </td>
              <td className="px-3 py-3">
                <PillBadge band={band} />
              </td>
              <td className="px-3 py-3">
                <Link
                  href={`/students/${student.id}`}
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/10"
                >
                  {band === "behind" ? "Plan Intervention" : "View"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
