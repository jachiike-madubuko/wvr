"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RoomPack, RoomStudent } from "@/lib/room/types";
import { GalaxyField } from "./GalaxyField";

export const OPEN_DELAY_MS = 500;
export const CLOSE_DELAY_MS = 100;

interface PopoverState {
  student: RoomStudent;
  x: number;
  y: number;
}

export function GalaxyHome({
  packs,
  students,
  onMoveStudent,
}: {
  packs: RoomPack[];
  students: RoomStudent[];
  onMoveStudent: (studentId: string, toPackId: string, expectedVersion: number) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [draggedStudent, setDraggedStudent] = useState<RoomStudent | null>(null);
  const [dragOverPackId, setDragOverPackId] = useState<string | null>(null);

  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => clearTimers, []);

  const scheduleOpen = (student: RoomStudent, target: HTMLElement) => {
    clearTimers();
    const rect = target.getBoundingClientRect();
    openTimerRef.current = setTimeout(() => {
      setPopover({
        student,
        x: Math.max(16, Math.min(rect.left - 70, window.innerWidth - 240)),
        y: Math.max(70, rect.top - 125),
      });
    }, OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      setPopover(null);
    }, CLOSE_DELAY_MS);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  return (
    <GalaxyField fieldRef={fieldRef}>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#58b6fa]">
            Interest Galaxy
          </p>
          <h1
            className="text-2xl font-bold text-[#f6f1ea]"
            style={{ fontFamily: "var(--font-serif-display)" }}
          >
            Room Clusters
          </h1>
          <p className="text-xs text-[#8892b0]">
            Hover 500ms for lesson status · Drag a student to regroup
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => {
          const members = students.filter((s) => s.packId === pack.id);
          const isTarget =
            draggedStudent !== null &&
            dragOverPackId === pack.id &&
            draggedStudent.packId !== pack.id;

          return (
            <section
              key={pack.id}
              data-galaxy-cell={pack.id}
              data-drag-over={isTarget ? "true" : undefined}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedStudent && dragOverPackId !== pack.id) {
                  setDragOverPackId(pack.id);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setDragOverPackId((prev) => (prev === pack.id ? null : prev));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const sid = e.dataTransfer.getData("text/plain") || draggedStudent?.id;
                const stu = students.find((s) => s.id === sid);
                setDragOverPackId(null);
                setDraggedStudent(null);
                if (stu && stu.packId !== pack.id) {
                  onMoveStudent(stu.id, pack.id, stu.version);
                }
              }}
              className="relative flex min-h-[210px] flex-col items-center justify-between rounded-[24px] p-5 backdrop-blur-md transition-colors"
              style={{
                background: isTarget
                  ? "rgba(74, 222, 128, 0.08)"
                  : "rgba(14, 20, 36, 0.72)",
                border: isTarget
                  ? "2px dashed #4ade80"
                  : "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: pack.color }}
                />
                <span
                  className="text-sm font-bold text-[#f6f1ea]"
                  style={{ fontFamily: "var(--font-serif-display)" }}
                >
                  {pack.label}
                </span>
                <span className="text-xs text-[#8892b0]">
                  {members.length} {members.length === 1 ? "kid" : "kids"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                {members.map((student) => (
                  <div
                    key={student.id}
                    className="wv-student-node group flex flex-col items-center gap-1"
                    data-student-id={student.id}
                    data-pack-id={student.packId}
                    draggable
                    onDragStart={(e) => {
                      clearTimers();
                      setPopover(null);
                      setDraggedStudent(student);
                      e.dataTransfer.setData("text/plain", student.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggedStudent(null);
                      setDragOverPackId(null);
                    }}
                    onMouseEnter={(e) => scheduleOpen(student, e.currentTarget)}
                    onMouseLeave={scheduleClose}
                  >
                    <Link
                      href={`/students/${student.id}`}
                      aria-label={`Open ${student.firstName}'s profile`}
                      className="flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:scale-110"
                      style={{ border: `3px solid ${pack.color}` }}
                    >
                      <span className="flex h-8 w-8 flex-col items-center justify-center rounded-full border-2 border-black/25 bg-[#d4a373]">
                        <span className="mb-0.5 flex gap-2">
                          <span className="h-1 w-1 rounded-full bg-[#2b1d0c]" />
                          <span className="h-1 w-1 rounded-full bg-[#2b1d0c]" />
                        </span>
                        <span className="h-0.5 w-1.5 rounded-sm bg-[#2b1d0c]" />
                      </span>
                    </Link>
                    <span className="text-[11px] font-semibold text-slate-200">
                      {student.firstName}
                    </span>
                    {student.paceBand === "ahead" && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#48e29a]">
                        FAST
                      </span>
                    )}
                    {student.paceBand === "behind" && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#f87171]">
                        SLOW
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {popover && (
        <div
          data-testid="student-popover"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="fixed z-50 w-56 rounded-2xl border border-[#2a344d] bg-[#111625] p-4 shadow-2xl"
          style={{ left: popover.x, top: popover.y }}
        >
          <div className="mb-1 text-[15px] font-bold text-[#f6f1ea]">
            {popover.student.firstName}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#8892b0]">
            Current Lesson Blocks
          </div>
          <div className="my-2 text-xs text-slate-300">
            {popover.student.currentLessonTitle ?? "No blocks today"}
          </div>
          <Link
            href={`/students/${popover.student.id}`}
            className="block w-full rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-white/15"
          >
            View profile
          </Link>
        </div>
      )}
    </GalaxyField>
  );
}
