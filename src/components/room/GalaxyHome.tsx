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
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { StudentAvatarHalo } from "@/components/avatars/StudentAvatar";
import { nodeLook } from "@/lib/avatars/look";
import type { EquippedLoadout } from "@/lib/collectibles/catalog";
import type { RoomPack, RoomStudent } from "@/lib/room/types";
import { GalaxyField } from "./GalaxyField";
import {
  placePopover,
  type Placement,
  type Rect,
} from "./galaxy-popover-position";

export const OPEN_DELAY_MS = 500;
export const CLOSE_DELAY_MS = 100;

// Must match the wv-revolve duration in globals.css.
const REVOLVE_MS = 48_000;
const POPOVER_W = 224; // matches w-56
const POPOVER_H_ESTIMATE = 150;

type StudentWithEquipped = RoomStudent & { equipped?: EquippedLoadout };

interface PopoverState {
  student: RoomStudent;
  anchor: Rect;
  x: number;
  y: number;
  side: Placement["side"];
}

function revolveAnimation(el: Element): Animation | undefined {
  return el
    .getAnimations?.()
    .find((a) => (a as CSSAnimation).animationName === "wv-revolve");
}

function DraggableStudentNode({
  student,
  index,
  count,
  packColor,
  onHoverStart,
  onHoverEnd,
  onPointerDown,
}: {
  student: StudentWithEquipped;
  index: number;
  count: number;
  packColor: string;
  onHoverStart: (student: RoomStudent, el: HTMLElement) => void;
  onHoverEnd: () => void;
  onPointerDown: (student: RoomStudent) => void;
}) {
  const orbitRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: student.id,
    data: { packId: student.packId, version: student.version },
  });

  const look = nodeLook(student.id);
  const blinkDelay = `${(index % 7) * 0.41}s`;

  // A node that mounts late copies a sibling's animation time (or the page clock when
  // alone), so the group keeps even spacing instead of stacking on angle zero.
  useLayoutEffect(() => {
    const el = orbitRef.current;
    if (!el) return;
    const sibling = Array.from(el.parentElement?.children ?? []).find(
      (n) => n !== el,
    );
    const theirs = sibling && revolveAnimation(sibling);
    const mine = revolveAnimation(el);
    if (mine && theirs && theirs.currentTime !== null) {
      mine.currentTime = theirs.currentTime;
    } else {
      el.style.animationDelay = `${-(performance.now() % REVOLVE_MS)}ms`;
    }
  }, []);

  return (
    <div
      ref={orbitRef}
      className="wv-orbit-node"
      style={{ "--a": `${(360 * index) / count}deg` } as CSSProperties}
    >
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="wv-student-node group flex cursor-grab flex-col items-center touch-none active:cursor-grabbing"
        data-student-id={student.id}
        data-pack-id={student.packId}
        data-dragging={isDragging ? "true" : undefined}
        style={{ opacity: isDragging ? 0.35 : 1 }}
        onMouseEnter={(e) => onHoverStart(student, e.currentTarget)}
        onMouseLeave={onHoverEnd}
        onPointerDownCapture={() => onPointerDown(student)}
      >
        <Link
          href={`/students/${student.id}`}
          aria-label={`Open ${student.firstName}'s profile`}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="flex flex-col items-center"
        >
          <div
            className="wv-node-bob"
            style={{
              animationDuration: `${5.4 + (index % 4) * 0.4}s`,
              animationDelay: `${(index % 6) * 0.35}s`,
            }}
          >
            <StudentAvatarHalo
              seed={student.id}
              look={look}
              equipped={student.equipped ?? {}}
              ringColor={packColor}
              blinkDelay={blinkDelay}
            />
            <span className="wv-node-name">{student.firstName}</span>
            {student.paceBand === "ahead" && (
              <span className="wv-node-pace" data-pace="fast">
                Fast
              </span>
            )}
            {student.paceBand === "behind" && (
              <span className="wv-node-pace" data-pace="slow">
                Slow
              </span>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

function PackCluster({
  pack,
  members,
  activeStudent,
  isPaused,
  onHoverStart,
  onHoverEnd,
  onPointerDown,
}: {
  pack: RoomPack;
  members: StudentWithEquipped[];
  activeStudent: StudentWithEquipped | null;
  isPaused: boolean;
  onHoverStart: (student: RoomStudent, el: HTMLElement) => void;
  onHoverEnd: () => void;
  onPointerDown: (student: RoomStudent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: pack.id });
  const isTarget =
    activeStudent !== null && isOver && activeStudent.packId !== pack.id;
  const orbitRadius = Math.min(104, Math.max(70, 24 * members.length));

  return (
    <section
      ref={setNodeRef}
      data-galaxy-cell={pack.id}
      data-drag-over={isTarget ? "true" : undefined}
      data-paused={isPaused ? "true" : undefined}
      className="wv-orbit-cell h-full w-full rounded-[24px] p-4 transition-colors"
      style={
        {
          "--orbit-r": `${orbitRadius}px`,
          background: isTarget ? "rgba(74, 222, 128, 0.08)" : "transparent",
          border: isTarget ? "2px dashed #4ade80" : "2px solid transparent",
        } as CSSProperties
      }
    >
      <div className="z-[1] flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-1.5">
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

      <div className="wv-orbit-nodes">
        {members.map((student, index) => (
          <DraggableStudentNode
            key={student.id}
            student={student}
            index={index}
            count={members.length}
            packColor={pack.color}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
            onPointerDown={onPointerDown}
          />
        ))}
      </div>
    </section>
  );
}

export function GalaxyHome({
  packs,
  students,
  paused = false,
  onMoveStudent,
}: {
  packs: RoomPack[];
  students: RoomStudent[];
  paused?: boolean;
  onMoveStudent: (studentId: string, toPackId: string, expectedVersion: number) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [pointerDownPackId, setPointerDownPackId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!pointerDownPackId) return;
    const clearPointerDown = () => setPointerDownPackId(null);
    window.addEventListener("pointerup", clearPointerDown);
    window.addEventListener("pointercancel", clearPointerDown);
    return () => {
      window.removeEventListener("pointerup", clearPointerDown);
      window.removeEventListener("pointercancel", clearPointerDown);
    };
  }, [pointerDownPackId]);

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
    openTimerRef.current = setTimeout(() => {
      const r = target.getBoundingClientRect();
      const anchor: Rect = {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
      const placement = placePopover(
        anchor,
        { width: POPOVER_W, height: POPOVER_H_ESTIMATE },
        { width: window.innerWidth, height: window.innerHeight },
      );
      setPopover({ student, anchor, ...placement });
    }, OPEN_DELAY_MS);
  };

  useLayoutEffect(() => {
    if (!popover || !popoverRef.current) return;
    const { width, height } = popoverRef.current.getBoundingClientRect();
    const next = placePopover(
      popover.anchor,
      { width, height },
      { width: window.innerWidth, height: window.innerHeight },
    );
    if (
      Math.abs(next.x - popover.x) > 0.5 ||
      Math.abs(next.y - popover.y) > 0.5 ||
      next.side !== popover.side
    ) {
      setPopover((cur) => (cur ? { ...cur, ...next } : null));
    }
  }, [popover]);

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
    setPointerDownPackId(null);
    if (!over) return;
    const stu = students.find((s) => s.id === String(active.id));
    const toPackId = String(over.id);
    if (stu && stu.packId !== toPackId) {
      onMoveStudent(stu.id, toPackId, stu.version);
    }
  };

  const handleDragCancel = () => {
    setActiveStudentId(null);
    setPointerDownPackId(null);
  };

  const dragOverlayContent = (
    <DragOverlay>
      {activeStudent ? (
        <div className="flex flex-col items-center gap-1.5 opacity-95">
          <StudentAvatarHalo
            seed={activeStudent.id}
            equipped={
              (activeStudent as StudentWithEquipped).equipped ?? {}
            }
            ringColor={activePackColor}
          />
          <span className="wv-node-name">{activeStudent.firstName}</span>
        </div>
      ) : null}
    </DragOverlay>
  );

  return (
    <GalaxyField fieldRef={fieldRef} paused={paused}>
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
        onDragCancel={handleDragCancel}
      >
        <div className="grid min-h-0 flex-1 grid-cols-2 auto-rows-fr gap-3 sm:gap-4 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCluster
              key={pack.id}
              pack={pack}
              members={students.filter((s) => s.packId === pack.id)}
              activeStudent={activeStudent}
              isPaused={
                popover?.student.packId === pack.id ||
                activeStudentId !== null ||
                pointerDownPackId === pack.id
              }
              onHoverStart={scheduleOpen}
              onHoverEnd={scheduleClose}
              onPointerDown={(student) => setPointerDownPackId(student.packId)}
            />
          ))}
        </div>

        {mounted ? createPortal(dragOverlayContent, document.body) : null}
      </DndContext>

      {popover && (
        <div
          ref={popoverRef}
          data-testid="student-popover"
          data-side={popover.side}
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
