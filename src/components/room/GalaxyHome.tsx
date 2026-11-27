"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
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
import { AlertMark } from "./AlertMark";
import { GalaxyField } from "./GalaxyField";
import {
  placePopover,
  type Placement,
  type Rect,
} from "./galaxy-popover-position";
import { groupPacing } from "./group-pacing";
import { GroupPacingBreakdown } from "./GroupPacingBreakdown";

export const OPEN_DELAY_MS = 500;
export const CLOSE_DELAY_MS = 100;

// Must match the wv-revolve duration in globals.css.
const REVOLVE_MS = 48_000;
const POPOVER_W = 224; // matches w-56
const POPOVER_H_ESTIMATE = 196;

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
        <div className="relative flex flex-col items-center">
          {student.alert && (
            <AlertMark
              studentId={student.id}
              alert={student.alert}
              className="absolute -right-1 -top-1 z-10"
            />
          )}
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
    </div>
  );
}

function PackCluster({
  pack,
  packIndex,
  members,
  activeStudent,
  isPaused,
  isBreakdownOpen,
  onToggleBreakdown,
  onCloseBreakdown,
  onHoverStart,
  onHoverEnd,
  onPointerDown,
}: {
  pack: RoomPack;
  packIndex: number;
  members: StudentWithEquipped[];
  activeStudent: StudentWithEquipped | null;
  isPaused: boolean;
  isBreakdownOpen: boolean;
  onToggleBreakdown: () => void;
  onCloseBreakdown: () => void;
  onHoverStart: (student: RoomStudent, el: HTMLElement) => void;
  onHoverEnd: () => void;
  onPointerDown: (student: RoomStudent) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { setNodeRef, isOver } = useDroppable({ id: pack.id });
  const isTarget =
    activeStudent !== null && isOver && activeStudent.packId !== pack.id;
  const orbitRadius = Math.min(104, Math.max(70, 24 * members.length));
  const pacingData = isBreakdownOpen ? groupPacing(members, pack.id) : null;

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
      <div
        className={`relative flex flex-col items-center ${isBreakdownOpen ? "z-30" : "z-[1]"}`}
      >
        <button
          ref={triggerRef}
          type="button"
          data-testid={`group-title-${pack.id}`}
          aria-expanded={isBreakdownOpen}
          aria-controls={`group-pacing-${pack.id}`}
          onClick={onToggleBreakdown}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-1.5 transition-colors hover:border-white/25 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#58b6fa]"
        >
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
        </button>

        {isBreakdownOpen && pacingData && (
          <GroupPacingBreakdown
            id={`group-pacing-${pack.id}`}
            pack={pack}
            data={pacingData}
            openUpward={packIndex >= 3}
            triggerRef={triggerRef}
            onClose={onCloseBreakdown}
          />
        )}
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

function EmptyPackDropItem({ pack }: { pack: RoomPack }) {
  const { setNodeRef, isOver } = useDroppable({ id: pack.id });

  return (
    <div
      ref={setNodeRef}
      data-empty-pack-drop={pack.id}
      data-drag-over={isOver ? "true" : undefined}
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition-colors ${
        isOver
          ? "border-2 border-dashed border-[#4ade80] bg-[#4ade80]/15 text-white"
          : "border border-white/10 bg-white/[0.04] text-[#f6f1ea]"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: pack.color }}
        />
        <span
          className="font-bold"
          style={{ fontFamily: "var(--font-serif-display)" }}
        >
          {pack.label}
        </span>
      </span>
      {isOver && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4ade80]">
          Drop
        </span>
      )}
    </div>
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
  const [openPackId, setOpenPackId] = useState<string | null>(null);
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

  const membersByPack = new Map<string, StudentWithEquipped[]>();
  for (const stu of students) {
    const list = membersByPack.get(stu.packId) ?? [];
    list.push(stu);
    membersByPack.set(stu.packId, list);
  }
  const occupiedPacks = packs.filter(
    (p) => (membersByPack.get(p.id)?.length ?? 0) > 0,
  );
  const emptyPacks = packs.filter(
    (p) => (membersByPack.get(p.id)?.length ?? 0) === 0,
  );
  const emptyPackIds = new Set(emptyPacks.map((p) => p.id));

  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    const popoverHit = pointerHits.find((c) => emptyPackIds.has(String(c.id)));
    if (popoverHit) return [popoverHit];
    if (pointerHits.length > 0) return pointerHits;
    return rectIntersection(args);
  };

  const gridColsClass =
    occupiedPacks.length <= 1
      ? "grid-cols-1"
      : occupiedPacks.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 lg:grid-cols-3";

  const handleDragStart = (event: DragStartEvent) => {
    clearTimers();
    setPopover(null);
    setOpenPackId(null);
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
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`grid min-h-0 flex-1 auto-rows-fr gap-3 sm:gap-4 ${gridColsClass}`}>
          {occupiedPacks.map((pack, packIndex) => (
            <PackCluster
              key={pack.id}
              pack={pack}
              packIndex={packIndex}
              members={membersByPack.get(pack.id) ?? []}
              activeStudent={activeStudent}
              isPaused={
                popover?.student.packId === pack.id ||
                openPackId === pack.id ||
                activeStudentId !== null ||
                pointerDownPackId === pack.id
              }
              isBreakdownOpen={openPackId === pack.id}
              onToggleBreakdown={() => {
                clearTimers();
                setPopover(null);
                setOpenPackId((cur) => (cur === pack.id ? null : pack.id));
              }}
              onCloseBreakdown={() =>
                setOpenPackId((cur) => (cur === pack.id ? null : cur))
              }
              onHoverStart={scheduleOpen}
              onHoverEnd={scheduleClose}
              onPointerDown={(student) => setPointerDownPackId(student.packId)}
            />
          ))}
        </div>

        {activeStudent && emptyPacks.length > 0 && (
          <aside
            data-testid="empty-packs-popover"
            aria-label="Unoccupied interest groups"
            className="absolute right-0 top-0 z-40 w-56 rounded-2xl border border-[#2a344d] bg-[#111625]/95 p-3 shadow-2xl backdrop-blur-md"
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8892b0]">
              Unoccupied groups
            </p>
            <div className="flex flex-col gap-1.5">
              {emptyPacks.map((pack) => (
                <EmptyPackDropItem key={pack.id} pack={pack} />
              ))}
            </div>
          </aside>
        )}

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
          <div className="flex flex-col gap-2">
            {popover.student.currentPathToken && (
              <Link
                href={`/s/${popover.student.currentPathToken}?student=${popover.student.id}`}
                data-testid="popover-view-blocks"
                className="block w-full rounded-[10px] bg-[#58b6fa] px-3 py-2 text-center text-xs font-bold text-black hover:opacity-90"
              >
                View current blocks ↗
              </Link>
            )}
            <Link
              href={`/students/${popover.student.id}`}
              className="block w-full rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-white/15"
            >
              View profile
            </Link>
          </div>
        </div>
      )}
    </GalaxyField>
  );
}
