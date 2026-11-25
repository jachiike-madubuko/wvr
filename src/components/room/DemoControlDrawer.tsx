"use client";

import Link from "next/link";
import { useState } from "react";
import type { DemoProfile, RoomSnapshot } from "@/lib/room/types";

const PROFILES: Array<{
  id: DemoProfile;
  title: string;
  subtitle: string;
}> = [
  {
    id: "sales_walkthrough",
    title: "Live Sales Walkthrough",
    subtitle: "8 students · Full urgency swimlanes · Fault-injection edge case (Pulsar)",
  },
  {
    id: "interactive_onboarding",
    title: "Interactive Onboarding",
    subtitle: "4 starter students · Guided tutorial · Safe is_demo purge",
  },
];

export function DemoControlDrawer({
  room,
  open,
  face,
  creditMultiplier,
  onClose,
  onRoomUpdated,
  onFaceChange,
  onCreditMultiplierChange,
}: {
  room: RoomSnapshot;
  open: boolean;
  face: "galaxy" | "calendar";
  creditMultiplier: number;
  onClose: () => void;
  onRoomUpdated: (room: RoomSnapshot) => void;
  onFaceChange: (face: "galaxy" | "calendar") => void;
  onCreditMultiplierChange: (val: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const nebula = room.students.find((s) => s.firstName === "Nebula");
  const isOnboarding = room.demoProfile === "interactive_onboarding";
  const isSales = room.demoProfile === "sales_walkthrough";

  const runDemoAction = async (
    payload:
      | { action: "switch" | "reset"; profile: DemoProfile }
      | { action: "clear" },
  ) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        room?: RoomSnapshot;
        error?: string;
      };
      if (!res.ok || !json.room) {
        setError(json.error ?? "Demo update failed.");
        return;
      }
      setBannerDismissed(false);
      onRoomUpdated(json.room);
    } catch {
      setError("Network error while updating demo dataset.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {isOnboarding && !bannerDismissed && (
        <div
          role="region"
          aria-label="Sample Classroom Banner"
          data-testid="onboarding-demo-banner"
          className="border-b border-[#58b6fa]/30 bg-[#0d192d] px-6 py-2.5 text-xs text-slate-200"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-[#58b6fa]/40 bg-[#58b6fa]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#93c5fd]">
                Demo Space Classroom (Sample Data)
              </span>
              {room.hasDemoData ? (
                <span>
                  Viewing Sample Classroom Data ({room.demoStudentCount} sample
                  {room.realStudentCount > 0 ? ` · ${room.realStudentCount} real` : ""})
                </span>
              ) : (
                <span>
                  Sample classroom cleared
                  {room.realStudentCount > 0
                    ? ` · ${room.realStudentCount} real student(s) preserved`
                    : "."}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {room.hasDemoData ? (
                <>
                  {nebula && (
                    <Link
                      href={`/students/${nebula.id}`}
                      data-testid="onboarding-step-nebula"
                      className="rounded-full border border-[#f87171]/40 bg-[#f87171]/15 px-3 py-1 text-[11px] font-semibold text-[#fca5a5] hover:bg-[#f87171]/25"
                    >
                      {nebula.interventionStatus === "resolved"
                        ? "✓ Nebula Intervention Resolved"
                        : "Step 3: Inspect Nebula's Struggle →"}
                    </Link>
                  )}
                  <Link
                    href="/s/demo-space-lesson"
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/10"
                  >
                    Preview Student View ↗
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    data-testid="clear-demo-data-btn"
                    onClick={() => void runDemoAction({ action: "clear" })}
                    className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                  >
                    Clear Demo Data
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  data-testid="reseed-sample-btn"
                  onClick={() =>
                    void runDemoAction({
                      action: "switch",
                      profile: "interactive_onboarding",
                    })
                  }
                  className="rounded-full bg-[#58b6fa] px-3 py-1 text-[11px] font-bold text-black hover:opacity-90 disabled:opacity-50"
                >
                  Re-seed Sample Classroom
                </button>
              )}
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="text-[11px] text-[#8892b0] hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>

          {room.hasDemoData && (
            <div className="mx-auto mt-2 flex max-w-6xl flex-wrap items-center gap-3 border-t border-white/10 pt-2 text-[11px] text-[#94a3b8]">
              <span className="font-semibold text-white">Quick Tour:</span>
              <button
                type="button"
                onClick={() => onFaceChange("galaxy")}
                className={face === "galaxy" ? "text-[#48e29a]" : "hover:text-white"}
              >
                1. View Galaxy
              </button>
              <span>→</span>
              <button
                type="button"
                onClick={() => onFaceChange("calendar")}
                className={face === "calendar" ? "text-[#48e29a]" : "hover:text-white"}
              >
                2. Open Pace Swimlanes
              </button>
              <span>→</span>
              <span>3. Click Nebula&apos;s Red Struggle Node</span>
              <span>→</span>
              <span>4. Approve Offline Plan</span>
              <span>→</span>
              <Link href="/s/demo-space-lesson" className="underline hover:text-white">
                5. Preview /s/demo-space-lesson
              </Link>
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <button
            type="button"
            aria-label="Close Demo Data settings"
            onClick={onClose}
            className="flex-1 cursor-default"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Settings — Demo Data"
            data-testid="demo-control-drawer"
            className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-white/10 bg-[#111728] p-6 text-[#f6f1ea] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#58b6fa]">
                  Settings · Demo Data
                </p>
                <h2 className="text-lg font-bold">Demo Data Mode</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/10"
              >
                Close
              </button>
            </div>

            {error && (
              <p
                role="alert"
                data-testid="demo-drawer-error"
                className="rounded-xl border border-[#f87171]/40 bg-[#f87171]/15 px-3 py-2 text-xs text-[#f87171]"
              >
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Demo Data Profile">
              {PROFILES.map((p) => {
                const active = room.demoProfile === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={busy}
                    data-testid={`demo-mode-${p.id}`}
                    onClick={() =>
                      void runDemoAction({ action: "switch", profile: p.id })
                    }
                    className={`rounded-2xl border p-4 text-left transition-colors disabled:opacity-50 ${
                      active
                        ? "border-[#58b6fa] bg-[#58b6fa]/15"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{p.title}</span>
                      {active && (
                        <span className="rounded-full bg-[#58b6fa] px-2 py-0.5 text-[10px] font-extrabold text-black">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#94a3b8]">{p.subtitle}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-[#cbd5e1]">
              <div className="flex items-center justify-between">
                <span>Demo rows active</span>
                <span className="font-bold text-white" data-testid="demo-student-count">
                  {room.demoStudentCount} sample · {room.realStudentCount} real
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#8892b0]">
                Clear Demo Data deletes strictly <code>WHERE is_demo = true</code> and
                keeps all real students untouched.
              </p>
            </div>

            {isSales && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <label htmlFor="bell-curve-slider">
                    Bell-Curve Pace Threshold Tuner
                  </label>
                  <span className="text-[#58b6fa]">{creditMultiplier.toFixed(2)}×</span>
                </div>
                <input
                  id="bell-curve-slider"
                  data-testid="bell-curve-slider"
                  type="range"
                  min={0.75}
                  max={1.5}
                  step={0.05}
                  value={creditMultiplier}
                  onChange={(e) => onCreditMultiplierChange(Number(e.target.value))}
                  className="mt-2 w-full accent-[#58b6fa]"
                />
                <p className="mt-1 text-[11px] text-[#8892b0]">
                  Adjust adaptive credit thresholds live during stakeholder walkthroughs.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                data-testid="reset-demo-data-btn"
                onClick={() =>
                  void runDemoAction({ action: "reset", profile: room.demoProfile })
                }
                className="rounded-xl bg-[#58b6fa] px-4 py-2.5 text-xs font-bold text-black hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Updating Neon…" : "Reset Current Demo Data"}
              </button>

              {room.hasDemoData ? (
                <button
                  type="button"
                  disabled={busy}
                  data-testid="drawer-clear-demo-btn"
                  onClick={() => void runDemoAction({ action: "clear" })}
                  className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                >
                  Clear Demo Data (Keep Real Rows)
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  data-testid="drawer-reseed-btn"
                  onClick={() =>
                    void runDemoAction({ action: "switch", profile: room.demoProfile })
                  }
                  className="rounded-xl border border-[#48e29a]/40 bg-[#48e29a]/15 px-4 py-2.5 text-xs font-bold text-[#6ee7b7] hover:bg-[#48e29a]/25 disabled:opacity-50"
                >
                  Re-seed Sample Classroom
                </button>
              )}

              <Link
                href="/s/demo-space-lesson"
                data-testid="role-switch-student-view"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold text-white hover:bg-white/10"
              >
                Role Switch → Student View (/s/demo-space-lesson) ↗
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
