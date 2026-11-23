import type { ReactNode } from "react";
import { BlockFlip } from "@/components/student-path/BlockFlip";
import type { ProfileFixture } from "./profile-fixture";
import { interventionToBlocks } from "./intervention-blocks";
import { publishEnabled, type InterventionPhase } from "./intervention-phase";

export type { InterventionPhase } from "./intervention-phase";

export type InterventionDrawerProps = {
  phase: InterventionPhase;
  preview: ProfileFixture["intervention"];
  guidance: string;
  appliedGuidance: string | null;
  onGuidance: (value: string) => void;
  onGenerate: () => void;
  onApprove: () => void;
  onUnapprove: () => void;
  onPublish: () => void;
};

export function ProfileDrawer({
  mode,
  title,
  onClose,
  children,
  intervention,
}: {
  mode: "chat" | "mastery" | "intervention" | null;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  intervention?: InterventionDrawerProps;
}) {
  if (!mode) return null;
  if (mode === "intervention" && intervention) {
    return <InterventionDrawer title={title} onClose={onClose} intervention={intervention} />;
  }
  return (
    <>
      <button type="button" className="wv-scrim wv-scrim--drawer" aria-label="Close panel" onClick={onClose} />
      <aside className="wv-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="wv-drawer-head">
          <h2 className="wv-drawer-title">{title}</h2>
          <button type="button" className="wv-btn wv-btn--ghost wv-btn--sm wv-drawer-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {mode === "chat" || mode === "mastery" ? children : null}
        </div>
      </aside>
    </>
  );
}

/** Same shell as the review packet drawer: wide, scrolling body, pinned foot. */
function InterventionDrawer({
  title,
  onClose,
  intervention,
}: {
  title: string;
  onClose: () => void;
  intervention: InterventionDrawerProps;
}) {
  const { phase, preview, appliedGuidance } = intervention;
  const canPublish = publishEnabled(phase);
  const showGuidedBy =
    appliedGuidance != null &&
    (phase === "generating" || phase === "ready" || phase === "approved" || phase === "sent");

  return (
    <>
      <button type="button" className="wv-scrim wv-scrim--drawer" aria-label="Close panel" onClick={onClose} />
      <aside className="wv-drawer wv-drawer--wide" role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="wv-drawer-head">
            <h2 className="wv-title" style={{ fontSize: "1.125rem" }}>
              {title}
            </h2>
          </div>
          <div className="wv-card">
            <p className="wv-kicker">Target misconception</p>
            <p className="wv-note">{preview.misconception}</p>
          </div>
          <p className="wv-note">
            {preview.title} · {preview.minutes}
          </p>
          {showGuidedBy ? <p className="wv-note">Guided by: {appliedGuidance}</p> : null}
          {phase === "compose" ? (
            <div className="wv-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="wv-kicker" htmlFor="intervention-guidance">
                Guide this intervention
              </label>
              <textarea
                id="intervention-guidance"
                className="wv-input"
                rows={4}
                placeholder="What have you noticed with this student?"
                value={intervention.guidance}
                onChange={(e) => intervention.onGuidance(e.target.value)}
              />
              <button
                type="button"
                className="wv-btn wv-btn--primary wv-btn--sm w-fit"
                onClick={intervention.onGenerate}
              >
                Generate
              </button>
            </div>
          ) : phase === "generating" ? (
            <div className="wv-card" aria-busy="true">
              <p className="wv-note">Claude is writing the module…</p>
            </div>
          ) : (
            <div>
              <p className="wv-kicker">What the kid sees</p>
              {/* An opened block is ~570px tall; a host sized to the closed state clips it. */}
              <div
                style={{
                  minHeight: 600,
                  maxHeight: 640,
                  overflow: "auto",
                  background: "var(--student-bg)",
                  borderRadius: 16,
                }}
              >
                <BlockFlip
                  blocks={interventionToBlocks(preview)}
                  unlockAll
                  compact
                  kicker={preview.minutes}
                  title={preview.title}
                />
              </div>
            </div>
          )}
        </div>
        {phase === "compose" ? null : (
          <div className="wv-drawer-foot" style={{ flexDirection: "column", alignItems: "stretch" }}>
            {phase === "ready" ? (
              <p className="wv-note" style={{ color: "var(--signal-coral)" }}>
                1 block still needs review.
              </p>
            ) : null}
            <div className="wv-row">
              {phase === "sent" ? (
                <span className="wv-badge">Published</span>
              ) : phase === "approved" ? (
                <>
                  <button type="button" className="wv-btn" disabled>
                    Approved
                  </button>
                  <button type="button" className="wv-btn" onClick={intervention.onUnapprove}>
                    Unapprove
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="wv-btn"
                  disabled={phase === "generating"}
                  onClick={intervention.onApprove}
                >
                  Approve
                </button>
              )}
              <button
                type="button"
                className="wv-btn wv-btn--primary"
                disabled={!canPublish}
                onClick={intervention.onPublish}
              >
                Publish
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
