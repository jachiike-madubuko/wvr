"use client";

import { useEffect, useState } from "react";
import type {
  ActionThreadRecord,
  ApprovedOfflinePlan,
  CheckInPoint,
  MasteryNode,
} from "@/lib/students/model";

export function ProfileDrawer({
  mode,
  studentId,
  firstName,
  selectedCheckIn,
  selectedNode,
  selThread,
  ivThread,
  onClose,
  onThreadUpdated,
}: {
  mode: "sel" | "iv" | null;
  studentId: string;
  firstName: string;
  selectedCheckIn: CheckInPoint | null;
  selectedNode: MasteryNode | null;
  selThread: ActionThreadRecord | null;
  ivThread: ActionThreadRecord | null;
  onClose: () => void;
  onThreadUpdated: (thread: ActionThreadRecord) => void;
}) {
  const [draft, setDraft] = useState("");
  const [guidance, setGuidance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, onClose]);

  if (!mode) return null;

  const submitSel = async (text?: string) => {
    const message = (text ?? draft).trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "sel", message }),
      });
      const json = (await res.json()) as {
        error?: string;
        thread?: ActionThreadRecord;
      };
      if (!res.ok || !json.thread) {
        setError(
          json.error === "PII_BLOCKED"
            ? "Blocked: remove email, phone, or personal identifiers before saving."
            : (json.error ?? "Could not save note."),
        );
        return;
      }
      setDraft("");
      onThreadUpdated(json.thread);
    } finally {
      setBusy(false);
    }
  };

  const submitIv = async (action: "generate" | "approve") => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "iv",
          action,
          guidance,
          misconception: selectedNode?.misconception ?? "unequal parts",
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        thread?: ActionThreadRecord;
      };
      if (!res.ok || !json.thread) {
        setError(
          json.error === "PII_BLOCKED"
            ? "Blocked: remove personal identifiers from guidance."
            : (json.error ?? "Could not update intervention plan."),
        );
        return;
      }
      onThreadUpdated(json.thread);
    } finally {
      setBusy(false);
    }
  };

  const misconceptionText =
    ivThread?.approvedPlan?.misconception ??
    selectedNode?.misconception ??
    "unequal parts";

  const activePlan: ApprovedOfflinePlan = {
    misconception: misconceptionText,
    steps: ivThread?.approvedPlan?.steps ?? [
      `1. Manipulative Check: Work side-by-side with ${firstName} using physical paper strips.`,
      `2. Partner Scaffolding: Pair ${firstName} for a 1-minute verbal comparison.`,
      `3. Quick Check: 2 oral exit prompts offline before resuming.`,
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="flex-1 cursor-default"
      />
      <aside
        role="dialog"
        aria-modal="true"
        data-testid="profile-drawer"
        className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[#111728] p-6 text-[#f6f1ea] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8892b0]">
              {mode === "iv" ? "3-Step Offline Intervention" : "SEL Action Chat"}
            </p>
            <h3 className="text-lg font-bold">
              {mode === "iv"
                ? selectedNode?.label ?? "Targeted Coaching"
                : `${selectedCheckIn?.period.toUpperCase() ?? "SEL"} · ${selectedCheckIn?.mood ?? "Check-in"}`}
            </h3>
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
            data-testid="drawer-error"
            className="rounded-xl border border-[#f87171]/40 bg-[#f87171]/15 px-3 py-2 text-xs text-[#f87171]"
          >
            {error}
          </p>
        )}

        {mode === "sel" ? (
          <div className="flex flex-1 flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#182035] p-4 text-xs text-slate-300">
              {selectedCheckIn?.teacherNote ||
                `${firstName} checked in ${selectedCheckIn?.mood ?? "today"}. Plan a calm offline check-in.`}
            </div>

            <div className="flex flex-col gap-2">
              {(selThread?.messages ?? []).map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl px-3.5 py-2.5 text-xs ${
                    m.role === "teacher"
                      ? "ml-6 bg-[#58b6fa]/20 text-white"
                      : "mr-6 border border-white/10 bg-[#141b2e] text-slate-200"
                  }`}
                >
                  <span className="mb-0.5 block text-[10px] font-bold uppercase text-[#8892b0]">
                    {m.role === "teacher" ? "You" : "Weaver Coach"}
                  </span>
                  {m.text}
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type an offline coaching note..."
                className="w-full rounded-xl border border-white/15 bg-[#090d17] p-3 text-xs text-white"
              />
              <button
                type="button"
                disabled={busy || !draft.trim()}
                onClick={() => void submitSel()}
                className="rounded-xl bg-[#58b6fa] px-4 py-2.5 text-xs font-bold text-black disabled:opacity-45"
              >
                Save coaching note
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="rounded-2xl border border-[#f87171]/30 bg-[#182035] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#f87171]">
                Target Misconception
              </p>
              <p className="mt-1 text-sm font-semibold">{activePlan.misconception}</p>
            </div>

            <div className="rounded-xl border border-[#48e29a]/25 bg-[#48e29a]/10 px-3 py-2 text-[11px] font-semibold text-[#48e29a]">
              Offline teacher plan · Never sent to student deck
            </div>

            <div className="flex flex-col gap-2.5">
              {activePlan.steps.map((step, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-[#1c263f] p-3.5 text-xs leading-relaxed text-slate-200"
                >
                  {step}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="iv-guidance"
                className="text-[10px] font-bold uppercase tracking-wider text-[#8892b0]"
              >
                Optional teacher guidance
              </label>
              <textarea
                id="iv-guidance"
                rows={2}
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder="What manipulatives are on hand?"
                className="w-full rounded-xl border border-white/15 bg-[#090d17] p-2.5 text-xs text-white"
              />
            </div>

            <div className="mt-auto flex flex-col gap-2">
              {ivThread?.teacherApprovedAt && (
                <div
                  data-testid="iv-approved-badge"
                  className="rounded-xl border border-[#48e29a]/40 bg-[#48e29a]/15 px-3 py-2 text-center text-xs font-bold text-[#48e29a]"
                >
                  Approved for offline coaching
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submitIv("generate")}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Regenerate 3-step plan
                </button>
                <button
                  type="button"
                  disabled={busy}
                  data-testid="approve-iv-btn"
                  onClick={() => void submitIv("approve")}
                  className="flex-1 rounded-xl bg-[#48e29a] px-3 py-2.5 text-xs font-bold text-black disabled:opacity-45"
                >
                  Approve Offline Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
