"use client";

import { useEffect, useId, useRef } from "react";
import { StudentAvatarHalo } from "@/components/avatars/StudentAvatar";
import { nodeLook } from "@/lib/avatars/look";
import { loadoutFromCollectibles } from "@/lib/collectibles/catalog";
import { PACK_COLORS } from "@/lib/room/types";
import type {
  StudentCollectiblesBundle,
  StudentRosterItem,
} from "@/lib/student-path/data";

export type StudentSwitchModalProps = {
  open?: boolean;
  roster: StudentRosterItem[];
  currentStudentId: string;
  collectiblesByStudent: Record<string, StudentCollectiblesBundle>;
  onSelect: (student: StudentRosterItem) => void;
  onClose: () => void;
};

export function StudentSwitchModal({
  open = true,
  roster,
  currentStudentId,
  collectiblesByStudent,
  onSelect,
  onClose,
}: StudentSwitchModalProps) {
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        data-testid="student-switch-backdrop"
        onClick={onClose}
        style={{
          background: "rgba(0, 0, 0, 0.72)",
          backdropFilter: "blur(4px)",
        }}
        className="fixed inset-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="student-switch-modal"
        className="relative z-10 w-full max-w-lg rounded-3xl border border-white/15 bg-[#12151f] p-6 text-[#f6f1ea] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#58b6fa]">
              Class Roster
            </p>
            <h2
              id={titleId}
              className="mt-1 text-2xl font-bold"
              style={{ fontFamily: "var(--font-serif-display)" }}
            >
              Switch student
            </h2>
            <p className="mt-1 text-xs text-[#8892b0]">
              Tap your first name to switch without leaving this lesson.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            data-testid="student-switch-close"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-[#cbd5e1] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#58b6fa]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-0.5 sm:grid-cols-3">
          {roster.map((item) => {
            const isCurrent = item.id === currentStudentId;
            const bundle = collectiblesByStudent[item.id] ?? {
              packId: "pack_space",
              items: [],
            };
            const equipped = loadoutFromCollectibles(bundle.items);
            const ringColor = PACK_COLORS[bundle.packId] ?? "#38bdf8";

            return (
              <button
                key={item.id}
                type="button"
                data-switch-student-pick={item.firstName}
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => onSelect(item)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-base font-bold text-[#f6f1ea] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#58b6fa] ${
                  isCurrent
                    ? "border-[#58b6fa] bg-[#58b6fa]/15 ring-1 ring-[#58b6fa]/50"
                    : "border-white/15 bg-[#0c0f18] hover:border-[#58b6fa]"
                }`}
              >
                {isCurrent && (
                  <span className="rounded-full bg-[#58b6fa] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#08121e]">
                    Current
                  </span>
                )}
                <StudentAvatarHalo
                  seed={item.id}
                  look={nodeLook(item.id)}
                  equipped={equipped}
                  ringColor={ringColor}
                  size="sm"
                />
                <span>{item.firstName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
