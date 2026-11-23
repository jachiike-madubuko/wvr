"use client";

import { useEffect, useRef, useState } from "react";
import { HOOK } from "@/lib/lesson/content";
import { hookSrc } from "@/lib/lesson/space-record";
import { BlockShell, type BodyProps, type ShellBlock, type SubmitResult } from "./BlockShell";

const YT_ORIGIN = "https://www.youtube-nocookie.com";

export type HookVideo = { videoId: string; start: number; title: string };

export function replayHook(iframe: HTMLIFrameElement | null, start = HOOK.start) {
  const win = iframe?.contentWindow;
  if (!win) return;
  try {
    post(win, "seekTo", [start, true]);
    post(win, "playVideo", []);
  } catch {
    // Nothing to replay.
  }
}

function post(win: Window, func: string, args: unknown[]) {
  win.postMessage(JSON.stringify({ event: "command", func, args }), YT_ORIGIN);
}

// Stops the video when the card flips to the questions.
export function pauseHook(iframe: HTMLIFrameElement | null) {
  const win = iframe?.contentWindow;
  if (!win) return;
  try {
    post(win, "pauseVideo", []);
  } catch {
    // Nothing to pause.
  }
}

type HookAnswer = { feeling?: string; why?: string; answers?: Record<string, string> };

const asAnswer = (v: unknown): HookAnswer => (v && typeof v === "object" ? (v as HookAnswer) : {});

// Question side: feeling faces, the reason, then the written questions.
function HookQuestions({ value, onChange }: BodyProps) {
  const a = asAnswer(value);
  const picked = HOOK.feelings.find((f) => f.id === a.feeling);
  const patch = (p: Partial<HookAnswer>) => onChange({ ...a, ...p });
  return (
    <div className="wv-hook-q">
      <fieldset className="wv-feelings" role="radiogroup">
        <legend className="wv-feelings-legend">Pick the face for how Sunny feels</legend>
        {HOOK.feelings.map((f) => (
          <label key={f.id} className="wv-feeling" data-picked={a.feeling === f.id ? "true" : undefined}>
            <input
              type="radio"
              name="hook-feeling"
              className="wv-feeling-input"
              value={f.id}
              checked={a.feeling === f.id}
              onChange={() => patch({ feeling: f.id })}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- small local SVG */}
            <img src={f.src} alt={f.label} width={64} height={64} className="wv-feeling-img" />
            <span className="wv-feeling-label" aria-hidden="true">
              {f.label}
            </span>
          </label>
        ))}
      </fieldset>
      {picked && (
        <label className="wv-hook-field">
          <span>Why did you pick {picked.label}?</span>
          <textarea
            className="wv-block-textarea"
            rows={3}
            value={a.why ?? ""}
            onChange={(e) => patch({ why: e.target.value })}
          />
        </label>
      )}
      {HOOK.questions.map((q) => (
        <label key={q.id} className="wv-hook-field">
          <span>{q.text}</span>
          <input
            type="text"
            className="wv-hook-input"
            value={a.answers?.[q.id] ?? ""}
            onChange={(e) => patch({ answers: { ...a.answers, [q.id]: e.target.value } })}
          />
        </label>
      ))}
    </div>
  );
}

const BACK_BLOCK: ShellBlock = {
  id: HOOK.id,
  label: "Hook · Questions",
  title: "How does Sunny feel?",
  instr: "Pick a face, tell us why, then answer the questions.",
  hookAssetIds: [],
};

export function HookCard({
  status,
  value,
  onChange,
  onSubmit,
  onReopen,
  onOpen,
  paused = false,
  video,
}: {
  paused?: boolean;
  video?: HookVideo;
  onOpen?(): void;
  status: "open" | "done";
  value: unknown;
  onChange(v: unknown): void;
  onSubmit(answer: unknown, result: SubmitResult): void;
  onReopen(): void;
}) {
  const [flipped, setFlipped] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frontTitle = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const played = video ?? { videoId: HOOK.videoId, start: HOOK.start, title: HOOK.title };
  const src = hookSrc(played.videoId, played.start);

  // Both faces stay mounted, so feedback and the rotation survive a flip.
  // Focus follows the flip: the new face's heading.
  useEffect(() => {
    if (!moved.current) return;
    const target = flipped ? backRef.current?.querySelector<HTMLElement>("h2") : frontTitle.current;
    target?.focus();
  }, [flipped]);

  // Publish the card height so the page's scroll-padding-top keeps a
  // keyboard-focused tile from landing under the sticky card (WCAG 2.4.11).
  useEffect(() => {
    const card = cardRef.current;
    const root = document.documentElement;
    if (!card) return;
    const set = () => root.style.setProperty("--wv-hook-h", `${Math.ceil(card.getBoundingClientRect().height)}px`);
    set();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(set);
    ro?.observe(card);
    return () => {
      ro?.disconnect();
      root.style.removeProperty("--wv-hook-h");
    };
  }, []);

  // The teacher paused the lesson: the video must not keep playing over them.
  useEffect(() => {
    if (paused) pauseHook(frameRef.current);
  }, [paused]);

  const flipTo = (next: boolean) => {
    moved.current = true;
    setFlipped(next);
  };

  return (
    <section
      ref={cardRef}
      className="wv-hook-card"
      data-hook="1"
      data-face={flipped ? "back" : "front"}
      aria-label="Hook"
      // Inline as well as in lesson.css so the pinned position never depends on the stylesheet.
      style={{ position: "sticky", top: 0 }}
    >
      <div className="wv-hook-flip">
        <div className="wv-hook-face wv-hook-front" inert={flipped} aria-hidden={flipped || undefined}>
          <p className="wv-block-kicker">Hook · Watch and reflect</p>
          <h2 className="wv-block-title" ref={frontTitle} tabIndex={-1}>
            {played.title}
          </h2>
          <ul className="wv-hook-chips" aria-label="In the video">
            {HOOK.chips.map((c) => (
              <li key={c} className="wv-hook-chip">
                {c}
              </li>
            ))}
          </ul>
          <div className="wv-hook-video">
            <iframe
              ref={frameRef}
              data-testid="hook-frame"
              title="Hook video: Sunny and her sister on Station Luna"
              src={src}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="wv-block-actions">
            <button
              type="button"
              className="wv-btn-submit"
              onClick={() => {
                pauseHook(frameRef.current);
                onOpen?.();
                flipTo(true);
              }}
            >
              Questions
            </button>
          </div>
        </div>
        <div ref={backRef} className="wv-hook-face wv-hook-back" inert={!flipped} aria-hidden={!flipped || undefined}>
          <BlockShell
            focusOnMount={false}
            block={BACK_BLOCK}
            status={status}
            value={value}
            Body={HookQuestions}
            onChange={onChange}
            onSubmit={onSubmit}
            onReopen={onReopen}
            onClose={() => flipTo(false)}
            closeLabel="Back to video"
            actions={
              <button
                type="button"
                className="wv-btn-ghost"
                onClick={() => {
                  replayHook(frameRef.current, played.start);
                  flipTo(false);
                }}
              >
                Watch again
              </button>
            }
          />
        </div>
      </div>
    </section>
  );
}
