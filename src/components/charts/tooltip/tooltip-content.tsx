"use client";

import type { ReactNode } from "react";

export interface TooltipRow {
  color: string;
  label: string;
  value: string;
}

export function TooltipContent({
  title,
  rows,
  children,
}: {
  title: string;
  rows: TooltipRow[];
  children?: ReactNode;
}) {
  return (
    <div className="min-w-[160px] rounded-xl border border-[#2a344d] bg-[#111625]/95 p-3 text-xs text-[#f6f1ea] shadow-xl backdrop-blur">
      <div className="mb-1.5 font-semibold text-[#f6f1ea]">{title}</div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#8892b0]">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: r.color }}
              />
              {r.label}
            </span>
            <span className="font-semibold text-[#f6f1ea]">{r.value}</span>
          </div>
        ))}
      </div>
      {children ? <div className="mt-1.5 text-[11px] text-[#8892b0]">{children}</div> : null}
    </div>
  );
}
