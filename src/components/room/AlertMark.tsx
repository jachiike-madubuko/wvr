"use client";

import Link from "next/link";
import type { StudentAlert } from "@/domain/alerts/rules";

export function AlertMark({
  studentId,
  alert,
  className = "",
}: {
  studentId: string;
  alert: StudentAlert;
  className?: string;
}) {
  const struggling = alert.kind !== "fast_student";
  const label = struggling
    ? `Needs help: ${alert.detail}`
    : `Ready for more: ${alert.detail}`;

  return (
    <Link
      href={`/students/${studentId}?alert=${encodeURIComponent(alert.blockEventId)}`}
      data-testid={`alert-mark-${studentId}`}
      data-alert-kind={alert.kind}
      aria-label={label}
      title={label}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[11px] font-black leading-none shadow-md transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
        struggling
          ? "border-[#fca5a5] bg-[#f87171] text-[#05070e]"
          : "border-[#93c5fd] bg-[#58b6fa] text-[#05070e]"
      } ${className}`}
    >
      {struggling ? "!" : "↑"}
    </Link>
  );
}
