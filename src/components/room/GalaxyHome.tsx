"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
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

function StudentAvatar({
  student,
  packColor,
}: {
  student: RoomStudent;
  packColor: string;
}) {
  return (
    <>
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full transition-transform group-hover:scale-110"
        style={{ border: `3px solid ${packColor}` }}
      >
        <span className="flex h-8 w-8 flex-col items-center justify-center rounded-full border-2 border-black/25 bg-[#d4a373]">
          <span className="mb-0.5 flex gap-2">
            <span className="h-1 w-1 rounded-full bg-[#2b1d0c]" />
            <span className="h-1 w-1 rounded-full bg-[#2b1d0c]" />
          </span>
          <span className="h-0.5 w-1.5 rounded-sm bg-[#2b1d0c]" />
        </span>
      </span>
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
    </>
  );
}

function DraggableStudentNode({
  student,
  packColor,
  onHoverStart,
  onHoverEnd,
}: {
  student: RoomStudent;
  packColor: string;
  onHoverStart: (student: RoomStudent, el: HTMLElement) => void;
  onHoverEnd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: student.id,
    data: { packId: student.packId, version: student.version },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="wv-student-node group flex cursor-grab flex-col items-center gap-1 touch-none active:cursor-grabbing"
      data-student-id={student.id}
      data-pack-id={student.packId}
      data-dragging={isDragging ? "true" : undefined}
      style={{ opacity: isDragging ? 0.35 : 1 }}
      onMouseEnter={(e) => onHoverStart(student, e.currentTarget)}
      onMouseLeave={onHoverEnd}
    >
      <Link
        href={`/students/${student.id}`}
        aria-label={`Open ${student.firstName}'s profile`}
        className="flex flex-col items-center gap-1"
      >
        <StudentAvatar student={student} packColor={packColor} />
      </Link>
    </div>
  );
}

function PackCluster({
  pack,
  members,
  activeStudent,
  onHoverStart,
  onHoverEnd,
}: {
  pack: RoomPack;
  members: RoomStudent[];
  activeStudent: RoomStudent | null;
  onHoverStart: (student: RoomStudent, el: HTMLElement) => void;
  onHoverEnd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: pack.id });
  const isTarget =
    activeStudent !== null && isOver && activeStudent.packId !== pack.id;

  return (
    <section
      ref={setNodeRef}
      data-galaxy-cell={pack.id}
      data-drag-over={isTarget ? "true" : undefined}
      className="relative flex h-full w-full flex-col items-center justify-center gap-5 rounded-[24px] p-4 transition-colors"
      style={{
        background: isTarget ? "rgba(74, 222, 128, 0.08)" : "transparent",
        border: isTarget ? "2px dashed #4ade80" : "2px solid transparent",
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
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        {members.map((student) => (
          <DraggableStudentNode
            key={student.id}
            student={student}
            packColor={pack.color}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
          />
        ))}
      </div>
    </section>
  );
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
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

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
    if (activeStudentId) return;
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

  const activeStudent = students.find((s) => s.id === activeStudentId) ?? null;
  const activePackColor =
    packs.find((p) => p.id === activeStudent?.packId)?.color ?? "#58b6fa";

  const handleDragStart = (event: DragStartEvent) => {
    clearTimers();
    setPopover(null);
    setActiveStudentId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStudentId(null);
    if (!over) return;
    const stu = students.find((s) => s.id === String(active.id));
    const toPackId = String(over.id);
    if (stu && stu.packId !== toPackId) {
      onMoveStudent(stu.id, toPackId, stu.version);
    }
  };

  return (
    <GalaxyField fieldRef={fieldRef}>
      <div className="mb-2 flex shrink-0 items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#58b6fa]">
            Interest Galaxy
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveStudentId(null)}
      >
        <div className="grid min-h-0 flex-1 grid-cols-2 auto-rows-fr gap-3 sm:gap-4 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCluster
              key={pack.id}
              pack={pack}
              members={students.filter((s) => s.packId === pack.id)}
              activeStudent={activeStudent}
              onHoverStart={scheduleOpen}
              onHoverEnd={scheduleClose}
            />
          ))}
        </div>

        <DragOverlay>
          {activeStudent ? (
            <div className="flex flex-col items-center gap-1 opacity-95">
              <StudentAvatar student={activeStudent} packColor={activePackColor} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
