"use client";

import { useEffect, useState } from "react";

export function BreakTimer({
  seconds = 60,
  onReady,
}: {
  seconds?: number;
  onReady: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || left <= 0) return;
    const id = setTimeout(() => {
      const next = left - 1;
      setLeft(next);
      if (next <= 0) {
        setRunning(false);
        onReady();
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [running, left, onReady]);

  const mins = String(Math.floor(left / 60)).padStart(2, "0");
  const secs = String(left % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#0c0e15] p-5 text-center">
      <div className="text-3xl font-bold tabular-nums text-[#58b6fa]">
        {mins}:{secs}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white"
        >
          {running ? "Pause" : "Start Timer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setLeft(0);
            onReady();
          }}
          className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-slate-300"
        >
          Done early
        </button>
      </div>
    </div>
  );
}
