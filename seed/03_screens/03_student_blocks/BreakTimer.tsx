"use client";

import { clock } from "@/lib/session/chrome";

export function BreakTimer({
  position,
  total,
  doneCount,
  left,
  title,
  nextLabel,
  onAct,
}: {
  position: number;
  total: number;
  doneCount: number;
  left: number;
  title: string;
  nextLabel: string;
  onAct: () => void;
}) {
  const ready = left <= 0;

  return (
    <div className="flex min-h-dvh flex-col bg-black p-[18px]">
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-dashed border-white/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/65">
          ☾ Break · {position} of {total}
        </span>
        <span className="text-[11.5px] font-bold text-white/35">{doneCount} done</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="flex h-[210px] w-[210px] items-center justify-center rounded-full border border-dashed border-white/30">
          <p className="m-0 font-lesson text-[3.4rem] font-normal tabular-nums text-white">
            {clock(left)}
          </p>
        </div>
        <h1 className="m-0 text-center font-lesson text-[1.9rem] font-semibold leading-tight text-white">
          {title}
        </h1>
        <p className="m-0 max-w-[24ch] text-center text-sm font-medium leading-relaxed text-white/50">
          Nothing to tap. Nothing is being timed except the break.
        </p>
      </div>

      <div className="rounded-[1.35rem] border border-dashed border-white/20 p-[15px]">
        <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
          Next when you are back
        </p>
        <p className="mt-2 font-lesson text-[1.05rem] font-semibold text-white">
          {nextLabel}
        </p>
      </div>

      <button
        type="button"
        onClick={onAct}
        disabled={!ready}
        className={`mt-3 rounded-full py-[15px] text-[13px] font-black uppercase tracking-wide ${ready ? "btn-w" : "btn-dead"}`}
      >
        {ready ? "I am back" : `Waiting · ${clock(left)}`}
      </button>
    </div>
  );
}
