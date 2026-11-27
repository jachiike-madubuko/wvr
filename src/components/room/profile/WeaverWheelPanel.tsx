"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  EMPTY_SCORES,
  WHEEL_HINTS,
  countSet,
  formatRelativeTime,
  lowestCaption,
  parseWheelScores,
  sameScores,
  valuesLine,
  type WheelDimension,
  type WheelLoad,
  type WheelRecord,
  type WheelScore,
  type WheelScores,
} from "@/lib/students/wheel";
import { ProfileRadar } from "./ProfileRadar";
import {
  WheelEditOverlay,
  type WheelEditOverlayHandle,
} from "./WheelEditOverlay";
import { WheelStepperDisclosure } from "./WheelStepperDisclosure";

type LocalDraft = {
  scores: WheelScores;
  draftAt: string;
  baseVersion: number | null;
};

const draftKey = (id: string) => `weavr:wheel-draft:v1:${id}`; // ids + ints only; no names (OQ-14)

function readDraft(id: string): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalDraft>;
    const scores = parseWheelScores(parsed.scores);
    if (
      !scores ||
      typeof parsed.draftAt !== "string" ||
      Number.isNaN(Date.parse(parsed.draftAt))
    ) {
      return null;
    }
    return {
      scores,
      draftAt: parsed.draftAt,
      baseVersion:
        typeof parsed.baseVersion === "number" ? parsed.baseVersion : null,
    };
  } catch {
    return null;
  }
}

function writeDraft(id: string, draft: LocalDraft): void {
  try {
    window.localStorage.setItem(draftKey(id), JSON.stringify(draft));
  } catch {
    // Storage quota/private-mode errors never crash editing.
  }
}

function clearDraft(id: string): void {
  try {
    window.localStorage.removeItem(draftKey(id));
  } catch {
    // Ignore storage removal errors.
  }
}

function parseServerWheelRecord(input: unknown): WheelRecord | null | "bad" {
  if (input === null) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) return "bad";
  const r = input as Record<string, unknown>;
  const scores = parseWheelScores(r.scores);
  if (
    !scores ||
    typeof r.updatedAt !== "string" ||
    typeof r.version !== "number" ||
    !Number.isInteger(r.version) ||
    r.version < 1
  ) {
    return "bad";
  }
  return {
    scores,
    updatedAt: r.updatedAt,
    version: r.version,
    setByYou: Boolean(r.setByYou),
  };
}

type PanelState =
  | { kind: "loading" }
  | { kind: "error" }
  | {
      kind: "view";
      saved: WheelRecord | null;
      draftNotice: LocalDraft | null;
      justSaved: boolean;
    }
  | {
      kind: "edit";
      saved: WheelRecord | null;
      draft: WheelScores;
      saving: boolean;
      saveError: "network" | "conflict" | null;
      emptyError: boolean;
      steppersOpen: boolean; // starts false; not persisted (OQ-D1)
    };

const MARGIN = 44;

function initialStateFromLoad(load: WheelLoad): PanelState {
  if (load.status === "error") return { kind: "error" };
  return {
    kind: "view",
    saved: load.wheel,
    draftNotice: null,
    justSaved: false,
  };
}

export function WeaverWheelPanel({
  studentId,
  initialWheel,
  onDirtyChange,
}: {
  studentId: string;
  initialWheel: WheelLoad;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [state, setState] = useState<PanelState>(() =>
    initialStateFromLoad(initialWheel),
  );
  const [politeMsg, setPoliteMsg] = useState("");
  const [assertiveMsg, setAssertiveMsg] = useState("");
  const [radarSize, setRadarSize] = useState(280);

  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<WheelEditOverlayHandle>(null);
  const hintPrefix = useId();
  const hintIdFor = useCallback(
    (d: WheelDimension) =>
      `${hintPrefix}-hint-${d.toLowerCase().replace(/\s+/g, "-")}`,
    [hintPrefix],
  );

  // Measure container width so radar stays <= 340px and fits 360px/430px without horizontal scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setRadarSize(Math.min(Math.max(w, 240), 340));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Sync background poll updates ONLY in view mode (never clobber active edit or error).
  useEffect(() => {
    setState((prev) => {
      if (prev.kind !== "view") return prev;
      if (initialWheel.status === "error") return prev;
      const incoming = initialWheel.wheel;
      const sameServer =
        prev.saved?.version === incoming?.version &&
        sameScores(
          prev.saved?.scores ?? EMPTY_SCORES,
          incoming?.scores ?? EMPTY_SCORES,
        );
      if (sameServer) return prev;
      return { ...prev, saved: incoming };
    });
  }, [initialWheel]);

  // Read local draft ONLY after a successful load (never in loading or error, B-8).
  const loadedOk = state.kind === "view";
  const viewSavedScores = state.kind === "view" ? state.saved?.scores ?? null : null;
  useEffect(() => {
    if (!loadedOk) return;
    const local = readDraft(studentId);
    if (!local) return;
    const base = viewSavedScores ?? EMPTY_SCORES;
    if (sameScores(local.scores, base)) {
      clearDraft(studentId);
      return;
    }
    setState((prev) =>
      prev.kind === "view" && !prev.draftNotice
        ? { ...prev, draftNotice: local }
        : prev,
    );
  }, [loadedOk, studentId, viewSavedScores]);

  const dirty =
    state.kind === "edit" &&
    !sameScores(state.draft, state.saved?.scores ?? EMPTY_SCORES);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  // Desktop extra beforeunload guard (B-6).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const focusFirstHandle = useCallback(() => {
    overlayRef.current?.focusHandle(0);
  }, []);

  const announcePolite = (msg: string) => {
    setPoliteMsg("");
    requestAnimationFrame(() => setPoliteMsg(msg));
  };

  const announceAssertive = (msg: string) => {
    setAssertiveMsg("");
    requestAnimationFrame(() => setAssertiveMsg(msg));
  };

  const openEdit = (saved: WheelRecord | null, startingDraft: WheelScores) => {
    setState({
      kind: "edit",
      saved,
      draft: { ...startingDraft },
      saving: false,
      saveError: null,
      emptyError: false,
      steppersOpen: false, // collapsed by default every time edit opens (D-2, R-17)
    });
  };

  const handleCancel = useCallback(() => {
    if (state.kind !== "edit" || state.saving) return;
    const isDirty = !sameScores(
      state.draft,
      state.saved?.scores ?? EMPTY_SCORES,
    );
    if (isDirty && !window.confirm("Discard unsaved changes?")) return;
    clearDraft(studentId);
    setState({
      kind: "view",
      saved: state.saved,
      draftNotice: null,
      justSaved: false,
    });
  }, [state, studentId]);

  // Escape works like Cancel (R-18, AC-9).
  useEffect(() => {
    if (state.kind !== "edit") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.kind, handleCancel]);

  const handleRetryLoad = async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/students/${studentId}/wheel`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { wheel?: unknown };
      const parsed = parseServerWheelRecord(body.wheel ?? null);
      if (parsed === "bad") throw new Error("WHEEL_BAD_VALUE");
      const local = readDraft(studentId);
      const base = parsed?.scores ?? EMPTY_SCORES;
      const draftNotice =
        local && !sameScores(local.scores, base) ? local : null;
      setState({
        kind: "view",
        saved: parsed,
        draftNotice,
        justSaved: false,
      });
    } catch {
      setState({ kind: "error" });
    }
  };

  const handleDraftChange = (d: WheelDimension, v: WheelScore | null) => {
    setState((prev) => {
      if (prev.kind !== "edit" || prev.saving) return prev;
      const nextDraft: WheelScores = { ...prev.draft, [d]: v };
      writeDraft(studentId, {
        scores: nextDraft,
        draftAt: new Date().toISOString(),
        baseVersion: prev.saved?.version ?? null,
      });
      return {
        ...prev,
        draft: nextDraft,
        emptyError: prev.emptyError && countSet(nextDraft) === 0,
        saveError: null,
      };
    });
  };

  const handleSave = async () => {
    if (state.kind !== "edit" || state.saving) return;
    if (countSet(state.draft) === 0) {
      setState({ ...state, emptyError: true, saveError: null });
      announceAssertive("Set at least one dimension before saving.");
      focusFirstHandle(); // R-3: preventScroll
      return;
    }

    setState({ ...state, saving: true, saveError: null, emptyError: false });
    try {
      const res = await fetch(`/api/students/${studentId}/wheel`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scores: state.draft,
          expectedVersion: state.saved?.version ?? null,
        }),
      });
      if (res.status === 409) {
        setState((prev) =>
          prev.kind === "edit"
            ? { ...prev, saving: false, saveError: "conflict" }
            : prev,
        );
        announcePolite("Not saved");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { wheel?: unknown };
      const parsed = parseServerWheelRecord(body.wheel ?? null);
      if (parsed === "bad" || parsed === null) throw new Error("WHEEL_BAD_VALUE");
      clearDraft(studentId);
      setState({
        kind: "view",
        saved: parsed,
        draftNotice: null,
        justSaved: true,
      });
      announcePolite("Saved");
    } catch {
      setState((prev) =>
        prev.kind === "edit"
          ? { ...prev, saving: false, saveError: "network" }
          : prev,
      );
      announcePolite("Not saved");
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="profile-radar"
      className={state.kind === "edit" ? "pb-24" : undefined}
    >
      {/* Live regions (AC-26) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {politeMsg}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertiveMsg}
      </div>

      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#f6f1ea]">
          {state.kind === "edit" ? "Weaver Wheel · editing" : "Weaver Wheel"}
        </h2>
        {state.kind === "view" && (
          <button
            type="button"
            data-testid="wheel-edit-btn"
            onClick={() =>
              openEdit(state.saved, state.saved?.scores ?? EMPTY_SCORES)
            }
            className="min-h-11 rounded-full border border-[#58b6fa]/50 bg-[#58b6fa]/10 px-4 text-sm font-semibold text-[#58b6fa] hover:bg-[#58b6fa]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd479]"
          >
            {state.saved ? "Edit" : "Set Weaver Wheel"}
          </button>
        )}
      </div>

      {/* Loading skeleton (AC-11, B-8): leaks no values, no Edit, no draft notice */}
      {state.kind === "loading" && (
        <div
          data-testid="wheel-loading"
          aria-busy="true"
          className="flex flex-col items-center gap-3 py-8"
        >
          <div className="h-56 w-56 animate-pulse rounded-full bg-white/5" />
          <div className="h-4 w-48 animate-pulse rounded bg-white/5" />
        </div>
      )}

      {/* Fail-closed load error (AC-12, B-8): no cached/draft data read or painted */}
      {state.kind === "error" && (
        <div
          data-testid="wheel-load-error"
          role="alert"
          className="rounded-2xl border border-[#f87171]/40 bg-[#f87171]/10 p-4"
        >
          <p className="text-sm font-semibold text-[#fca5a5]">
            Couldn&apos;t load the Weaver Wheel.
          </p>
          <button
            type="button"
            data-testid="wheel-retry-btn"
            onClick={() => void handleRetryLoad()}
            className="mt-3 min-h-11 rounded-full border border-white/20 px-4 text-sm font-semibold text-[#f6f1ea] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd479]"
          >
            Retry
          </button>
        </div>
      )}

      {/* View mode */}
      {state.kind === "view" && (
        <div>
          {state.draftNotice && (
            <div
              data-testid="wheel-draft-notice"
              className="mb-3 rounded-2xl border border-[#ffd479]/40 bg-[#ffd479]/10 p-3"
            >
              <p className="text-sm text-[#f6f1ea]">
                You have unsaved changes from{" "}
                {formatRelativeTime(state.draftNotice.draftAt)}.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="wheel-draft-resume"
                  onClick={() => openEdit(state.saved, state.draftNotice!.scores)}
                  className="min-h-11 rounded-full bg-[#58b6fa] px-4 text-sm font-bold text-[#05070e] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  Resume
                </button>
                <button
                  type="button"
                  data-testid="wheel-draft-discard"
                  onClick={() => {
                    clearDraft(studentId);
                    setState({ ...state, draftNotice: null });
                  }}
                  className="min-h-11 rounded-full border border-white/20 px-4 text-sm font-semibold text-[#f6f1ea] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd479]"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          <div
            role="img"
            aria-label={
              state.saved
                ? valuesLine(state.saved.scores)
                : "Weaver Wheel: no scores set yet"
            }
            className="relative mx-auto"
            style={{ width: radarSize, height: radarSize }}
          >
            <ProfileRadar
              scores={state.saved?.scores ?? null}
              size={radarSize}
              margin={MARGIN}
            />
          </div>

          {state.saved ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8892b0]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full bg-[#58b6fa]"
                    aria-hidden="true"
                  />
                  Your view
                </span>
                <span data-testid="wheel-updated-at">
                  {state.justSaved
                    ? "Updated just now by you"
                    : `Updated ${formatRelativeTime(state.saved.updatedAt)} by you`}
                </span>
              </div>

              {state.justSaved && (
                <p
                  data-testid="wheel-saved-status"
                  className="text-xs font-semibold text-[#4ade80]"
                >
                  Saved
                </p>
              )}

              <p
                data-testid="wheel-values-line"
                className="text-xs leading-relaxed text-[#cbd5e1]"
              >
                {valuesLine(state.saved.scores)}
              </p>

              {lowestCaption(state.saved.scores) && (
                <p
                  data-testid="wheel-lowest-caption"
                  className="text-xs font-medium text-[#f6f1ea]"
                >
                  {lowestCaption(state.saved.scores)}
                </p>
              )}
            </div>
          ) : (
            <p
              data-testid="wheel-empty-copy"
              className="mt-2 text-center text-sm text-[#8892b0]"
            >
              No scores yet. These are your observations, not a diagnosis.
            </p>
          )}

          <p
            data-testid="wheel-provenance"
            className="mt-3 text-xs text-[#8892b0]"
          >
            Set by you (teacher). Teacher observation, not a diagnosis.
          </p>
        </div>
      )}

      {/* Edit mode */}
      {state.kind === "edit" && (
        <div>
          <p className="mb-2 text-xs text-[#8892b0]">
            Tap or drag any wedge (1–5). Delete clears a focused handle.
          </p>

          <div
            role="group"
            aria-label="Weaver Wheel editor"
            className="relative mx-auto"
            style={{ width: radarSize, height: radarSize }}
          >
            <ProfileRadar
              scores={state.saved?.scores ?? null}
              axisScores={state.draft}
              size={radarSize}
              margin={MARGIN}
              faintSaved
            />
            <WheelEditOverlay
              ref={overlayRef}
              size={radarSize}
              margin={MARGIN}
              draft={state.draft}
              disabled={state.saving}
              onChange={handleDraftChange}
              hintIdFor={hintIdFor}
            />
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[#8892b0]">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-[#58b6fa]"
                aria-hidden="true"
              />
              Your view
            </div>

            <p
              data-testid="wheel-values-line"
              className="text-xs leading-relaxed text-[#cbd5e1]"
            >
              {valuesLine(state.draft)}
            </p>

            {lowestCaption(state.draft) && (
              <p
                data-testid="wheel-lowest-caption"
                className="text-xs font-medium text-[#f6f1ea]"
              >
                {lowestCaption(state.draft)}
              </p>
            )}
          </div>

          {state.emptyError && (
            <p
              data-testid="wheel-empty-error"
              role="alert"
              className="mt-3 rounded-xl border border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2 text-sm text-[#fca5a5]"
            >
              Set at least one dimension before saving.
            </p>
          )}

          {state.saveError === "network" && (
            <p
              data-testid="wheel-save-error"
              role="alert"
              className="mt-3 rounded-xl border border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2 text-sm text-[#fca5a5]"
            >
              Not saved. Check your connection and try again.
            </p>
          )}

          {state.saveError === "conflict" && (
            <div
              data-testid="wheel-conflict-error"
              role="alert"
              className="mt-3 rounded-xl border border-[#ffd479]/40 bg-[#ffd479]/10 p-3 text-sm text-[#ffd479]"
            >
              <p>This wheel changed since you opened it. Reload to see the latest.</p>
              <button
                type="button"
                onClick={() => void handleRetryLoad()}
                className="mt-2 min-h-11 rounded-full border border-[#ffd479]/50 px-4 text-xs font-semibold text-[#f6f1ea] hover:bg-white/10"
              >
                Reload
              </button>
            </div>
          )}

          <WheelStepperDisclosure
            studentId={studentId}
            open={state.steppersOpen}
            onOpenChange={(open) =>
              setState((prev) =>
                prev.kind === "edit" ? { ...prev, steppersOpen: open } : prev,
              )
            }
            draft={state.draft}
            disabled={state.saving}
            hints={WHEEL_HINTS}
            hintIdFor={hintIdFor}
            onChange={handleDraftChange}
          />

          <p
            data-testid="wheel-provenance"
            className="mt-3 text-xs text-[#8892b0]"
          >
            Set by you (teacher). Teacher observation, not a diagnosis.
          </p>

          {/* Sticky bottom action bar with safe-area padding (R-12, B-7) */}
          <div
            data-testid="wheel-sticky-bar"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/15 bg-[#0b1020]/95 px-4 pt-3 backdrop-blur"
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
              <div className="min-w-0">
                {dirty && (
                  <span
                    data-testid="wheel-unsaved-chip"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd479]/40 bg-[#ffd479]/10 px-2.5 py-1 text-xs font-semibold text-[#ffd479]"
                  >
                    <span
                      className="h-2 w-2 rounded-full bg-[#ffd479]"
                      aria-hidden="true"
                    />
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="wheel-cancel-btn"
                  disabled={state.saving}
                  onClick={handleCancel}
                  className="min-h-11 rounded-full border border-white/20 px-4 text-sm font-semibold text-[#f6f1ea] hover:bg-white/10 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd479]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="wheel-save-btn"
                  disabled={state.saving}
                  onClick={() => void handleSave()}
                  className="min-h-11 rounded-full bg-[#58b6fa] px-5 text-sm font-bold text-[#05070e] hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  {state.saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
