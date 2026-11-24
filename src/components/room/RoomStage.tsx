"use client";

import { useEffect, useState } from "react";
import type { RoomSnapshot } from "@/lib/room/types";
import { CalendarGrid } from "./CalendarGrid";
import { GalaxyHome } from "./GalaxyHome";

export function RoomStage({ initialRoom }: { initialRoom: RoomSnapshot }) {
  const [room, setRoom] = useState<RoomSnapshot>(initialRoom);
  const [face, setFace] = useState<"galaxy" | "calendar">("galaxy");
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "g") setFace("galaxy");
      if (k === "c") setFace("calendar");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let lastRefreshAt = 0;

    const refreshRoom = async () => {
      const now = Date.now();
      if (inFlight || now - lastRefreshAt < 250) return;
      inFlight = true;
      lastRefreshAt = now;
      try {
        const res = await fetch("/api/room", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const fresh = (await res.json()) as RoomSnapshot;
        if (!cancelled) {
          setRoom(fresh);
        }
      } catch {
        // Ignore transient background refresh failures.
      } finally {
        inFlight = false;
      }
    };

    const onFocus = () => {
      void refreshRoom();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshRoom();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const handleMoveStudent = async (
    studentId: string,
    toPackId: string,
    expectedVersion: number,
  ) => {
    setConflictMsg(null);
    const prev = room;
    setRoom((cur) => ({
      ...cur,
      students: cur.students.map((s) =>
        s.id === studentId ? { ...s, packId: toPackId } : s,
      ),
    }));

    try {
      const res = await fetch("/api/room/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, toPackId, expectedVersion }),
      });

      if (res.status === 409) {
        setConflictMsg("Group changed in another tab — refreshed latest room state.");
        const fresh = await fetch("/api/room");
        if (fresh.ok) {
          setRoom((await fresh.json()) as RoomSnapshot);
        } else {
          setRoom(prev);
        }
        return;
      }

      if (!res.ok) {
        setRoom(prev);
        return;
      }

      const data = (await res.json()) as { version: number };
      setRoom((cur) => ({
        ...cur,
        students: cur.students.map((s) =>
          s.id === studentId ? { ...s, version: data.version } : s,
        ),
      }));
    } catch {
      setRoom(prev);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070e] text-[#f6f1ea]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-[#0a0e1a]/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-bold tracking-tight">Weavr</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-200">
            {room.className}
          </span>
        </div>

        <nav
          className="flex gap-1 rounded-full bg-white/5 p-1"
          aria-label="Room view"
        >
          <button
            type="button"
            data-testid="tab-galaxy"
            aria-pressed={face === "galaxy"}
            onClick={() => setFace("galaxy")}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
              face === "galaxy" ? "bg-white text-black" : "text-[#8892b0]"
            }`}
          >
            Galaxy G
          </button>
          <button
            type="button"
            data-testid="tab-calendar"
            aria-pressed={face === "calendar"}
            onClick={() => setFace("calendar")}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
              face === "calendar" ? "bg-white text-black" : "text-[#8892b0]"
            }`}
          >
            Calendar C
          </button>
        </nav>

        <div className="text-xs text-[#8892b0]">Grade {room.grade}</div>
      </header>

      {conflictMsg && (
        <div
          role="status"
          className="flex items-center justify-between border-b border-amber-400/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-200"
        >
          <span>{conflictMsg}</span>
          <button
            type="button"
            onClick={() => setConflictMsg(null)}
            className="underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <main
        id="room-stage"
        data-testid="room-flip-scene"
        data-face={face}
        className="wv-flip-scene"
      >
        <div className="wv-flip-card">
          <div
            className="wv-flip-face wv-flip-face--front"
            aria-hidden={face !== "galaxy"}
          >
            <GalaxyHome
              packs={room.packs}
              students={room.students}
              paused={face !== "galaxy"}
              onMoveStudent={handleMoveStudent}
            />
          </div>

          <div
            className="wv-flip-face wv-flip-face--back"
            aria-hidden={face !== "calendar"}
          >
            <CalendarGrid
              className={room.className}
              students={room.students}
              blocks={room.blocks}
              sessions={room.sessions}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
