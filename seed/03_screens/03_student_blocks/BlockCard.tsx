"use client";

import { HOOK_ASSETS, type LessonBlock } from "@/lib/lesson/content";

export function ExplainPill() {
  return <span className="wv-explain-pill">{"↻"} Teacher explains</span>;
}

// A tile on the lesson grid. Never locked: every tile is always a live button.
export function BlockCard({
  block,
  status,
  index,
  explain = false,
  onOpen,
}: {
  block: LessonBlock;
  status: "open" | "done";
  index: number;
  explain?: boolean;
  onOpen(): void;
}) {
  return (
    <button
      type="button"
      className="wv-tile"
      data-block={block.id}
      data-status={status}
      aria-label={`${block.label}${status === "done" ? ", done" : ""}`}
      onClick={onOpen}
    >
      <span className="wv-tile-n" aria-hidden="true">
        {index + 1}
      </span>
      <span className="wv-tile-label">{block.label}</span>
      <span className="wv-hook-chips" aria-hidden="true">
        {block.hookAssetIds.map((id) => (
          <span key={id} className="wv-hook-chip">
            {HOOK_ASSETS[id]?.label ?? id}
          </span>
        ))}
      </span>
      {explain && <ExplainPill />}
      <span className="wv-tile-state" aria-hidden="true">
        {status === "done" ? "Done" : "Open"}
      </span>
    </button>
  );
}
