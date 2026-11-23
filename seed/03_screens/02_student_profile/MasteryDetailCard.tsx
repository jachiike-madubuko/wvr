import type { MasteryNode } from "./profile-fixture";

export function MasteryDetailCard({
  node,
  sent,
  onGenerate,
}: {
  node: MasteryNode;
  sent: boolean;
  onGenerate: () => void;
}) {
  const detail = node.detail;
  if (!detail) {
    return (
      <article className="wv-card">
        <p className="wv-note">No misconception flagged.</p>
      </article>
    );
  }
  return (
    <article className="wv-card">
      {detail.concept !== node.label ? (
        <h3 className="text-lg font-semibold">{detail.concept}</h3>
      ) : null}
      <p
        className="w-fit rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ background: "var(--error-surface)", color: "var(--signal-coral)" }}
      >
        {detail.misconception}
      </p>
      <p className="wv-note">{detail.rounds}</p>
      <p className="wv-note">{detail.timeOnTask}</p>
      <p className="wv-note">{detail.summary}</p>
      {sent ? (
        <p className="wv-badge wv-badge--changed">Intervention sent</p>
      ) : (
        <button type="button" className="wv-btn wv-btn--primary wv-btn--sm w-fit" onClick={onGenerate}>
          Generate targeted intervention
        </button>
      )}
    </article>
  );
}
