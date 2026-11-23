"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { StudentBlock } from "@/data/demo-set";
import { pinFace } from "@/lib/classroom/pin-board";
import { byId, CHOICES, FACE, type BlockEntry, type BlockRole } from "@/lib/blocks/library";
import { BreakTimer } from "@/components/student-path/BreakTimer";
import { DrawPad } from "@/components/student-path/DrawPad";
import { RiddleBody } from "@/components/lesson/RiddleBody";
import { GameRuntime } from "@/lib/games/GameRuntime";
import "@/styles/room/tokens.css";
import "@/styles/room/flip.css";

export type FlipBlock = BlockEntry & {
  kind?: string;
  choices?: { id: string; text: string }[];
  passage?: string[];
  steps?: string[];
  imageSrc?: string;
  videoSrc?: string;
  audioSrc?: string;
  student?: StudentBlock;
};

type Well = {
  choiceId: string | null;
  tens: number;
  ones: number;
  strokes: number;
  drawData: string;
  top: string;
  bottom: string;
  recorded: boolean;
  matched: number[];
  first: string | null;
  taps: number;
  body: string;
  steps: string[];
  materials: number[];
  guess: string;
  depth: number;
  photo: boolean;
};

const EMPTY: Well = {
  choiceId: null,
  tens: 0,
  ones: 0,
  strokes: 0,
  drawData: "",
  top: "",
  bottom: "",
  recorded: false,
  matched: [],
  first: null,
  taps: 0,
  body: "",
  steps: [],
  materials: [],
  guess: "",
  depth: 0,
  photo: false,
};

const ROLE: Record<StudentBlock["role"], BlockRole> = {
  Start: "start",
  Try: "try",
  Check: "check",
  Next: "next",
  Reward: "next",
  Break: "check",
};

const KIND: Record<StudentBlock["type"], string> = {
  read: "text.read",
  listen: "audio.story",
  watch: "video.story",
  draw: "image.draw",
  questions: "text.question",
  offscreen: "text.instructions",
  entry: "text.write",
  write: "text.write",
  caption: "image.meme",
  reward: "reward",
  break: "break",
  finish: "text.instructions",
};

const PASSAGE = [
  "The arcade on Fifth has one cabinet nobody plays. It has two rows of buttons, and every button is a different colour.",
  "Mia counted the top row. Eight buttons. She counted the bottom row. Eight more.",
  "She wanted to know how many buttons the whole panel had, so she wrote it down instead of guessing.",
  "The number she got is the same number you will get, if you count the same way she did.",
];

const DEFAULT_STEPS: Record<string, string[]> = {
  "text.instructions": ["Get your number line out", "Sharpen one pencil", "Find your partner's seat", "Put your name on the sheet"],
  "pbl.social": ["Say your number sentence out loud", "Ask your partner one question about theirs"],
  "pbl.project": ["Snap the base plate to the frame", "Wire the counter to the sensor", "Run ten tokens through it"],
};
const MATERIALS = ["Base plate", "Sensor", "Counter chip", "Ten tokens"];
const PAIRS: [string, string][] = [["12", "6 + 6"], ["15", "5 × 3"], ["20", "4 × 5"]];
const INTERVENTION: FlipBlock = {
  id: "intervention",
  type: "text",
  sub: "Answer a question",
  role: "check",
  title: "Quick check: scaling ratios",
  instr: "A recipe uses 4 cups of rice for 6 servings. How much rice for 18 servings?",
  cta: "Send my answer",
  completes: "",
  shape: "",
  h: 170,
  kind: "text.question",
  choices: [
    { id: "a", text: "16 cups" },
    { id: "b", text: "12 cups" },
    { id: "c", text: "8 cups" },
    { id: "d", text: "10 cups" },
  ],
};

type Flip = { id: string; rect: { left: number; top: number; width: number; height: number }; phase: "unsettled" | "open" };

function kindOf(block: FlipBlock) {
  return block.kind || block.id;
}

function wideHook(entry: FlipBlock) {
  if (entry.id === "pbl.social" || entry.kind === "pbl.social") return false;
  if (entry.student?.kind === "hook") return true;
  if (entry.role !== "start") return false;
  const kind = entry.kind || entry.id;
  return kind === "video.story" || kind === "text.read" || entry.type === "read";
}

function words(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function clock(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function ready(block: FlipBlock, well: Well, watched: number) {
  const kind = kindOf(block);
  const dur = block.dur ?? 0;
  const ratio = dur ? watched / dur : 0;
  const steps = block.steps?.length ? block.steps : DEFAULT_STEPS[kind] ?? [];
  if (kind === "text.question") return well.choiceId != null;
  if (kind === "text.write") return words(well.body) >= 15;
  if (kind === "text.read") return well.depth >= 0.9;
  if (kind === "text.instructions" || kind === "pbl.social") {
    return steps.every((step) => well.steps.includes(step)) && (kind !== "pbl.social" || well.taps >= 2);
  }
  if (kind === "pbl.project") {
    return steps.every((step) => well.steps.includes(step)) && MATERIALS.every((_, i) => well.materials.includes(i)) && well.photo;
  }
  if (kind === "pbl.manipulative") return well.tens * 10 + well.ones === 24;
  if (kind === "image.draw" || kind === "image.art") return well.strokes > 0;
  if (kind === "image.meme") return well.top.trim().length > 0 && well.bottom.trim().length > 0;
  if (kind === "image.display" || kind === "video.reference" || kind === "audio.music") return true;
  if (kind === "game.brain") return well.matched.length >= 3;
  if (kind === "game.viewer3d") return /^\d+$/.test(well.guess.trim());
  if (kind === "audio.question") return well.recorded;
  if (kind === "video.lesson" || kind === "video.instructions") return ratio >= 0.8;
  if (kind === "audio.instructions") return ratio >= 0.95;
  if (dur) return ratio >= 0.9;
  return false;
}

export function toFlipPin(block: StudentBlock): FlipBlock {
  const face = pinFace(block);
  return {
    id: block.id,
    type: block.type,
    sub: block.media,
    role: ROLE[block.role] ?? "start",
    title: face.title,
    instr: KIND[block.type] === "text.read"
      ? "Read the whole thing. The button turns on when you reach the end."
      : face.body,
    cta: face.action,
    completes: "",
    shape: "",
    kind: KIND[block.type],
    dur: block.durationSec,
    h: block.videoSrc ? 300 : block.type === "reward" || block.type === "break" ? 160 : 168,
    choices: block.questions?.map((q, i) => ({ id: q.label || String(i), text: q.text })),
    passage: [block.body, block.body2].filter((line): line is string => Boolean(line)),
    steps: block.steps,
    imageSrc: block.imageSrc,
    videoSrc: block.videoSrc,
    audioSrc: block.audioSrc,
    student: block,
  };
}

function pill(label: string, onClick: () => void) {
  return (
    <button type="button" onClick={onClick} style={{ border: 0, cursor: "pointer", borderRadius: 999, padding: "6px 12px", fontWeight: 700, background: "rgba(0,0,0,.12)", color: "inherit" }}>
      {label}
    </button>
  );
}

function RiddleWell() {
  const [value, setValue] = useState<unknown>({ answer: "", clues: 0 });
  return <RiddleBody value={value} onChange={setValue} />;
}

function Activity({
  block,
  well,
  setWell,
  watched,
  setWatched,
  playing,
  setPlaying,
  breakLeft,
  onSpecial,
}: {
  block: FlipBlock;
  well: Well;
  setWell: (update: (current: Well) => Well) => void;
  watched: number;
  setWatched: (value: number | ((current: number) => number)) => void;
  playing: boolean;
  setPlaying: (value: boolean | ((current: boolean) => boolean)) => void;
  breakLeft: number;
  onSpecial: () => void;
}) {
  const kind = kindOf(block);
  const dur = block.dur ?? 0;
  const choices = block.choices?.length ? block.choices : block.id === "intervention" ? INTERVENTION.choices! : CHOICES;
  const passage = block.passage?.length ? block.passage : PASSAGE;
  const steps = block.steps?.length ? block.steps : DEFAULT_STEPS[kind] ?? [];
  const seek = (event: MouseEvent<HTMLDivElement>) => {
    if (!dur) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 1;
    setWatched(Math.min(dur, Math.max(0, ratio * dur)));
  };

  if (kind === "reward" && block.student) {
    return (
      <GameRuntime
        block={block.student}
        nextLabel="Back to the board"
        onDone={onSpecial}
        onLeave={onSpecial}
      />
    );
  }
  if (kind === "break" && block.student) {
    return (
      <BreakTimer
        position={1}
        total={1}
        doneCount={0}
        left={breakLeft}
        title={block.title}
        nextLabel="Back to the board"
        onAct={onSpecial}
      />
    );
  }
  if (kind === "placeholder") {
    return <p style={{ margin: 0 }}>{block.instr}</p>;
  }
  if (kind === "riddle") {
    return <RiddleWell />;
  }
  if (kind === "text.question") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {choices.map((choice, index) => (
          <button key={choice.id} type="button" onClick={() => setWell((current) => ({ ...current, choiceId: choice.id }))} style={{ display: "flex", alignItems: "center", gap: 12, border: 0, borderRadius: 999, padding: "12px 16px", textAlign: "left", fontWeight: 600, background: well.choiceId === choice.id ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.5)", color: "inherit" }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, background: well.choiceId === choice.id ? "rgba(0,0,0,.8)" : "rgba(0,0,0,.15)" }}>{"ABCD"[index]}</span>
            {choice.text}
          </button>
        ))}
      </div>
    );
  }
  if (kind === "text.write") {
    return (
      <>
        <textarea aria-label="Answer" value={well.body} rows={5} onChange={(event) => setWell((current) => ({ ...current, body: event.target.value }))} style={{ width: "100%", boxSizing: "border-box", border: 0, borderRadius: 16, padding: 12, background: "rgba(255,255,255,.65)", color: "inherit", fontFamily: "var(--font-serif-display)" }} />
        <span>{words(well.body)} words · 15 to finish</span>
      </>
    );
  }
  if (kind === "text.read") {
    return (
      <>
        <div ref={(el) => {
          if (!el || well.depth > 0) return;
          const span = el.scrollHeight - el.clientHeight;
          if (span <= 0) setWell((current) => ({ ...current, depth: 1 }));
        }} onScroll={(event) => {
          const el = event.currentTarget;
          const span = el.scrollHeight - el.clientHeight;
          setWell((current) => ({ ...current, depth: span <= 0 ? 1 : el.scrollTop / span }));
        }} style={{ maxHeight: 180, overflow: "auto", borderRadius: 16, padding: 12, background: "rgba(255,255,255,.6)", fontFamily: "var(--font-serif-display)" }}>
          {passage.map((line) => <p key={line} style={{ margin: "0 0 12px" }}>{line}</p>)}
        </div>
        <span>{Math.round(well.depth * 100)}%</span>
      </>
    );
  }
  if (kind === "text.instructions" || kind === "pbl.social" || kind === "pbl.project") {
    return (
      <>
        {kind === "pbl.social" ? <button type="button" onClick={() => setWell((current) => ({ ...current, taps: current.taps + 1 }))}>Switch turns</button> : null}
        {kind === "pbl.project" ? MATERIALS.map((item, index) => (
          <button key={item} type="button" onClick={() => setWell((current) => ({ ...current, materials: current.materials.includes(index) ? current.materials : current.materials.concat(index) }))}>{item}</button>
        )) : null}
        {steps.map((step) => (
          <button key={step} type="button" onClick={() => setWell((current) => ({ ...current, steps: current.steps.includes(step) ? current.steps : current.steps.concat(step), taps: kind === "pbl.social" ? current.taps + 1 : current.taps }))}>{step}</button>
        ))}
        {kind === "pbl.project" ? <button type="button" onClick={() => setWell((current) => ({ ...current, photo: true }))}>Photo of your build</button> : null}
      </>
    );
  }
  if (kind === "image.draw" || kind === "image.art") {
    return (
      <DrawPad
        body={block.instr}
        live
        strokes={well.strokes}
        drawData={well.drawData}
        onStroke={(n) => setWell((current) => ({ ...current, strokes: n }))}
        onDrawData={(data) => setWell((current) => ({ ...current, drawData: data }))}
      />
    );
  }
  if (kind === "image.display") {
    return (
      <>
        <div style={{ height: 200, borderRadius: 16, background: "rgba(255,255,255,.5)", overflow: "hidden" }}>
          {block.imageSrc ? <img src={block.imageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Look at the picture"}
        </div>
      </>
    );
  }
  if (kind === "image.meme") {
    return (
      <>
        <p style={{ margin: 0, textAlign: "center", fontWeight: 900, textTransform: "uppercase" }}>{well.top}</p>
        <p style={{ margin: 0, textAlign: "center", fontWeight: 900, textTransform: "uppercase" }}>{well.bottom}</p>
        <input aria-label="Top line" placeholder="Top line" value={well.top} onChange={(event) => setWell((current) => ({ ...current, top: event.target.value }))} />
        <input aria-label="Bottom line" placeholder="Bottom line" value={well.bottom} onChange={(event) => setWell((current) => ({ ...current, bottom: event.target.value }))} />
      </>
    );
  }
  if (kind.startsWith("video") && dur) {
    return (
      <>
        <div style={{ position: "relative", height: 190, borderRadius: 16, overflow: "hidden", background: "#1a1410" }}>
          {block.videoSrc?.includes("youtube") ? (
            <iframe
              src={block.videoSrc}
              title={block.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          ) : block.videoSrc ? (
            <video src={block.videoSrc} controls playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} onTimeUpdate={(event) => setWatched(event.currentTarget.currentTime)} />
          ) : null}
          {block.videoSrc && !block.videoSrc.includes("youtube") ? null : block.videoSrc?.includes("youtube") ? null : (
          <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((value) => !value)} style={{ position: "absolute", inset: 0, border: 0, background: "rgba(0,0,0,.28)" }}>
            <span style={{ width: 62, height: 62, borderRadius: 999, background: "rgba(255,253,248,.94)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{playing ? "❚❚" : "▶"}</span>
          </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>{clock(watched)}</span>
          <div role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={dur} aria-valuenow={Math.round(watched)} onClick={seek} style={{ flex: 1, height: 8, borderRadius: 999, background: "rgba(0,0,0,.15)" }} />
          <span>{clock(dur)}</span>
        </div>
        <p style={{ margin: 0 }}>Watched {Math.round((watched / dur) * 100)}%</p>
        {pill("↺ 15s", () => setWatched((value) => Math.max(0, value - 15)))}
      </>
    );
  }
  if (kind.startsWith("audio")) {
    return (
      <>
        <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((value) => !value)} style={{ width: 52, height: 52, borderRadius: 999, border: 0 }}>{playing ? "❚❚" : "▶"}</button>
        {dur ? <div role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={dur} aria-valuenow={Math.round(watched)} onClick={seek} style={{ height: 8, borderRadius: 999, background: "rgba(0,0,0,.15)" }} /> : null}
        <span>{clock(watched)} / {clock(dur)}</span>
        {kind === "audio.question" ? <button type="button" aria-label="Record" onClick={() => setWell((current) => ({ ...current, recorded: true }))}>Record</button> : null}
        {kind === "audio.music" ? <input aria-label="Volume" type="range" min={0} max={100} defaultValue={60} /> : null}
      </>
    );
  }
  if (kind === "pbl.manipulative") {
    const total = well.tens * 10 + well.ones;
    const faceBg = FACE[block.role].bg;
    return (
      <>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontFamily: "var(--font-serif-display)", fontSize: "1.8rem", fontWeight: 600 }}>{total}</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.6 }}>Build 24</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 96, alignContent: "flex-start", alignItems: "flex-end", borderRadius: "var(--radius-card, 16px)", padding: 12, background: "rgba(255,255,255,.5)" }}>
          {Array.from({ length: well.tens }, (_, index) => (
            <button key={`ten-${index}`} type="button" aria-label="Remove a ten" onClick={() => setWell((current) => ({ ...current, tens: Math.max(0, current.tens - 1) }))} style={{ width: 18, height: 84, border: 0, borderRadius: 6, background: "var(--signal-blue)", cursor: "pointer" }} />
          ))}
          {Array.from({ length: well.ones }, (_, index) => (
            <button key={`one-${index}`} type="button" aria-label="Remove a one" onClick={() => setWell((current) => ({ ...current, ones: Math.max(0, current.ones - 1) }))} style={{ width: 18, height: 18, border: 0, borderRadius: 4, background: "#f5b400", cursor: "pointer" }} />
          ))}
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-serif-display)", fontWeight: 600 }}>{well.tens} tens + {well.ones} ones = {total}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setWell((current) => ({ ...current, tens: Math.min(9, current.tens + 1) }))} style={{ flex: 1, border: 0, borderRadius: 999, padding: 12, fontWeight: 700, background: "rgba(0,0,0,.78)", color: faceBg, cursor: "pointer" }}>+ Ten rod</button>
          <button type="button" onClick={() => setWell((current) => ({ ...current, ones: Math.min(20, current.ones + 1) }))} style={{ flex: 1, border: 0, borderRadius: 999, padding: 12, fontWeight: 700, background: "rgba(0,0,0,.12)", color: "inherit", cursor: "pointer" }}>+ One</button>
        </div>
      </>
    );
  }
  if (kind === "game.brain") {
    const tiles = PAIRS.flatMap((pair, pairIndex) => pair.map((label, side) => ({ key: `${pairIndex}-${side}`, pairIndex, label })));
    return (
      <>
        <span>{well.matched.length} of 3 pairs</span>
        <span>{well.taps} taps</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {tiles.map((tile) => (
            <button key={tile.key} type="button" onClick={() => setWell((current) => {
              if (current.matched.includes(tile.pairIndex)) return current;
              const taps = current.taps + 1;
              if (current.first == null) return { ...current, first: tile.key, taps };
              if (current.first === tile.key) return { ...current, first: null, taps };
              const firstPair = Number(current.first.split("-")[0]);
              if (firstPair === tile.pairIndex) return { ...current, matched: current.matched.concat(tile.pairIndex), first: null, taps };
              return { ...current, first: null, taps };
            })}>{tile.label}</button>
          ))}
        </div>
      </>
    );
  }
  if (kind === "game.viewer3d") {
    return (
      <>
        <div style={{ height: 160, borderRadius: 16, background: "rgba(255,255,255,.5)" }}>Drag to turn it</div>
        <input aria-label="Count" placeholder="How many cubes?" value={well.guess} onChange={(event) => setWell((current) => ({ ...current, guess: event.target.value }))} />
      </>
    );
  }
  return null;
}

export function BlockFlip({
  blocks,
  kicker = "Minecraft · Trades and crafting ratios",
  title = "Unit rates",
  unlockAll = false,
  exact = false,
  theme = "dark",
  showIntervention = false,
  doneIds,
  breakLeft = 0,
  compact = false,
  editable = false,
  editLayer = "skill",
  onComplete,
  onOpen,
  onLeavePath,
  onEdit,
}: {
  blocks: FlipBlock[];
  kicker?: string;
  title?: string;
  unlockAll?: boolean;
  /** Skip the default partner pin. The space mosaic is exactly its five blocks. */
  exact?: boolean;
  theme?: "dark" | "light";
  showIntervention?: boolean;
  doneIds?: string[];
  breakLeft?: number;
  compact?: boolean;
  editable?: boolean;
  editLayer?: "skill" | "skin";
  onComplete?: (payload: Record<string, unknown>) => void;
  onOpen?: (id: string) => void;
  onLeavePath?: () => void;
  onEdit?: (
    block: StudentBlock,
    patch: Partial<Pick<StudentBlock, "skillTitle" | "skillBody" | "skillAction" | "skinTitle" | "skinBody" | "skinAction">>,
  ) => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const authored = showIntervention ? blocks.concat(INTERVENTION) : blocks;
  const hasSocial = authored.some((entry) => entry.id === "pbl.social" || entry.kind === "pbl.social");
  const list = exact || hasSocial ? authored : authored.concat(byId("pbl.social"));
  const [localDone, setLocalDone] = useState<string[]>([]);
  const finished = doneIds ?? localDone;
  const [flip, setFlip] = useState<Flip | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [justUnlockedId, setJustUnlockedId] = useState<string | null>(null);
  const [well, setWell] = useState<Well>(EMPTY);
  const [watched, setWatched] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [burst, setBurst] = useState(false);
  const finishing = useRef(false);
  const light = theme === "light";

  const openEntry = flip ? list.find((entry) => entry.id === flip.id) : undefined;
  const flipOpen = flip?.phase === "open";

  useEffect(() => {
    if (!flipOpen || !playing || !openEntry?.dur) return;
    const id = window.setInterval(() => {
      setWatched((value) => Math.min(openEntry.dur!, value + 0.25));
    }, 250);
    return () => window.clearInterval(id);
  }, [flipOpen, playing, openEntry]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function locked(id: string) {
    if (unlockAll || id === "intervention") return false;
    const index = list.findIndex((entry) => entry.id === id);
    return index > 0 && !finished.includes(list[index - 1]!.id);
  }

  function open(entry: FlipBlock, event: MouseEvent<HTMLElement>) {
    if (editable || flip) return;
    if (locked(entry.id) || finished.includes(entry.id)) {
      setShakeId(entry.id);
      window.setTimeout(() => setShakeId(null), 520);
      return;
    }
    const tile = event.currentTarget.getBoundingClientRect();
    const page = pageRef.current?.getBoundingClientRect();
    if (!page) return;
    setWell(EMPTY);
    setWatched(0);
    setPlaying(false);
    finishing.current = false;
    onOpen?.(entry.id);
    const rect = { left: tile.left - page.left, top: tile.top - page.top, width: tile.width, height: tile.height };
    setFlip({ id: entry.id, rect, phase: "unsettled" });
    window.setTimeout(() => {
      setFlip((current) => (current && current.id === entry.id ? { ...current, phase: "open" } : current));
    }, 20);
  }

  function close() {
    setFlip((current) => (current ? { ...current, phase: "unsettled" } : current));
    window.setTimeout(() => setFlip(null), 480);
  }

  function finish(force = false) {
    if (!openEntry || finishing.current) return;
    if (!force && !ready(openEntry, well, watched)) return;
    finishing.current = true;
    setBurst(true);
    const id = openEntry.id;
    onComplete?.({ id, kind: kindOf(openEntry) });
    const index = list.findIndex((entry) => entry.id === id);
    const next = list[index + 1];
    window.setTimeout(() => {
      if (!doneIds) setLocalDone((ids) => ids.concat(id));
      setJustUnlockedId(next && next.id !== "intervention" ? next.id : null);
      setBurst(false);
      close();
    }, 900);
  }

  const page = pageRef.current?.getBoundingClientRect();
  const focusW = Math.min(460, (page?.width ?? 800) * 0.92);
  const focusH = Math.min(620, Math.max(520, (page?.height ?? 800) * 0.78));
  const target = { left: Math.max(12, ((page?.width ?? 800) - focusW) / 2), top: 48, width: focusW, height: focusH };
  const box = flip ? (flipOpen ? target : flip.rect) : null;
  const face = openEntry ? FACE[openEntry.role] : null;
  const canFinish = openEntry ? ready(openEntry, well, watched) : false;
  const ink = light ? "var(--ink)" : "#f6f1ea";
  const muted = light ? "var(--ink-faint)" : "#8a8490";

  return (
    <div ref={pageRef} data-wv-app style={{ position: "relative", minHeight: compact ? undefined : "100vh", boxSizing: "border-box", padding: compact ? 8 : "var(--space-8) var(--space-5) 4rem", background: light ? "var(--canvas)" : "var(--student-bg)", color: ink }}>
      <header style={{ maxWidth: 760, margin: "0 auto 1.5rem", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: light ? "var(--signal-blue)" : "var(--pin-try)" }}>{kicker}</p>
        <h1 style={{ margin: "0.35rem 0 0", fontFamily: "var(--font-serif-display)", fontSize: compact ? "1.35rem" : "2rem", fontWeight: 600, textWrap: "balance" }}>{title}</h1>
        <p style={{ margin: "0.5rem 0 0", fontSize: 13, color: muted }}>{finished.length} of {list.length} done</p>
        {onLeavePath ? (
          <button type="button" onClick={onLeavePath} style={{ marginTop: 8, border: "1px solid rgba(255,255,255,.25)", borderRadius: 999, background: "transparent", color: ink, padding: "6px 12px" }}>Leave path</button>
        ) : null}
      </header>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", alignItems: "start" }}>
        {list.map((entry, index) => {
          const pin = FACE[entry.role];
          const isLocked = locked(entry.id);
          const done = finished.includes(entry.id);
          const hidden = flip?.id === entry.id;
          const wide = wideHook(entry);
          const student = entry.student;
          const editTitle = editLayer === "skill" ? (student?.skillTitle ?? entry.title) : (student?.skinTitle ?? "");
          const editBody = editLayer === "skill" ? (student?.skillBody ?? entry.instr) : (student?.skinBody ?? "");
          const editAction = editLayer === "skill" ? (student?.skillAction ?? entry.cta) : (student?.skinAction ?? "");
          const field = editLayer === "skill"
            ? { title: "skillTitle", body: "skillBody", action: "skillAction" }
            : { title: "skinTitle", body: "skinBody", action: "skinAction" };
          return (
            <div
              key={entry.id}
              role={editable ? undefined : "button"}
              tabIndex={editable ? undefined : 0}
              data-span={wide ? "2" : undefined}
              className={shakeId === entry.id ? "wv-pin-shake" : justUnlockedId === entry.id ? "wv-pin-glow" : undefined}
              onClick={editable ? undefined : (event) => open(entry, event)}
              style={{
                position: "relative",
                gridColumn: wide ? "1 / -1" : undefined,
                width: "100%",
                height: entry.h ?? 168,
                border: 0,
                font: "inherit",
                borderRadius: "var(--radius-pin)",
                background: pin.bg,
                color: pin.ink,
                textAlign: "left",
                padding: "var(--space-4)",
                cursor: editable || isLocked || done ? "default" : "pointer",
                opacity: hidden ? 0 : isLocked ? 0.55 : 1,
                filter: done ? "saturate(0.92)" : undefined,
                transform: justUnlockedId === entry.id ? "scale(1.03)" : undefined,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>{pin.kicker}</span>
                <span style={{ width: 24, height: 24, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: pin.ink, color: pin.bg, fontSize: 11, fontWeight: 900 }}>{done ? "✓" : index + 1}</span>
              </span>
              {editable && student && onEdit ? (
                <>
                  <input aria-label={`${entry.title} title`} value={editTitle} onChange={(event) => onEdit(student, { [field.title]: event.target.value })} style={{ border: 0, background: "transparent", color: "inherit", fontFamily: "var(--font-serif-display)", fontWeight: 600 }} />
                  <textarea aria-label={`${entry.title} body`} value={editBody} rows={3} onChange={(event) => onEdit(student, { [field.body]: event.target.value })} style={{ border: 0, background: "transparent", color: "inherit" }} />
                  <input aria-label={`${entry.title} action`} value={editAction} onChange={(event) => onEdit(student, { [field.action]: event.target.value })} style={{ border: 0, borderRadius: 999, background: pin.ink, color: pin.bg }} />
                </>
              ) : (
                <span style={{ fontFamily: "var(--font-serif-display)", fontWeight: 600 }}>{entry.title}</span>
              )}
              {isLocked ? (
                <div style={{ position: "absolute", inset: 0, borderRadius: "var(--radius-pin)", background: "color-mix(in srgb, var(--student-lock) 70%, transparent)", backdropFilter: "blur(1.5px)", display: "grid", placeItems: "center" }}>
                  <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
                    <rect x="6" y="14" width="20" height="14" rx="4" fill="#d4d4d8" />
                    <path d="M10 14V11a6 6 0 0 1 12 0v3" fill="none" stroke="#d4d4d8" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="16" cy="21" r="2.2" fill="#3f3f46" />
                  </svg>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {flip && openEntry && face && box ? (
        <>
          <button type="button" aria-label="Close block" onClick={close} style={{ position: "absolute", inset: 0, border: 0, background: flipOpen ? "rgba(0,0,0,0.65)" : "transparent", backdropFilter: flipOpen ? "blur(3px)" : undefined, zIndex: 24 }} />
          <div className="wv-flip-move" style={{ position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height, perspective: 1600, zIndex: 25 }}>
            <div className="wv-flip-turn" style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", transform: `rotateY(${flipOpen ? 180 : 0}deg)` }}>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: "var(--radius-pin)", background: face.bg, color: face.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <p style={{ margin: 0, fontFamily: "var(--font-serif-display)", fontWeight: 600 }}>{openEntry.title}</p>
              </div>
              <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: "var(--radius-pin)", background: face.bg, color: face.ink, display: "flex", flexDirection: "column", gap: 12, padding: 20, boxSizing: "border-box", overflow: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>{face.kicker}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: face.ink, color: face.bg, fontSize: 11, fontWeight: 900 }}>{finished.includes(openEntry.id) ? "✓" : list.findIndex((entry) => entry.id === openEntry.id) + 1}</span>
                    <button type="button" aria-label="Close" onClick={close} style={{ border: 0, borderRadius: 999, width: 24, height: 24, background: "rgba(0,0,0,.15)", color: "inherit" }}>×</button>
                  </span>
                </div>
                <h2 style={{ margin: 0, fontFamily: "var(--font-serif-display)", fontSize: "1.5rem", fontWeight: 600 }}>{openEntry.title}</h2>
                <p style={{ margin: 0 }}>{openEntry.instr}</p>
                <div style={{ flex: 1, overflow: "auto", borderRadius: "var(--radius-inset, 16px)", background: "rgba(0,0,0,.09)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Activity
                    block={openEntry}
                    well={well}
                    setWell={setWell}
                    watched={watched}
                    setWatched={setWatched}
                    playing={playing}
                    setPlaying={setPlaying}
                    breakLeft={breakLeft}
                    onSpecial={() => finish(true)}
                  />
                </div>
                {kindOf(openEntry) === "reward" || kindOf(openEntry) === "break" ? null : (
                  <button type="button" disabled={!canFinish} onClick={() => finish()} style={{ border: 0, borderRadius: 999, padding: 14, fontWeight: 900, textTransform: "uppercase", background: face.ink, color: face.bg, opacity: canFinish ? 1 : 0.45 }}>
                    {openEntry.cta}
                  </button>
                )}
                {burst ? (
                  <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, fontSize: 26, pointerEvents: "none" }}>
                    <span style={{ animation: "student-burst var(--dur-burst) var(--ease-pin) both" }}>✦</span>
                    <span style={{ animation: "student-burst var(--dur-burst) var(--ease-pin) 80ms both" }}>★</span>
                    <span style={{ animation: "student-burst var(--dur-burst) var(--ease-pin) 160ms both" }}>✧</span>
                    <span style={{ animation: "student-burst var(--dur-burst) var(--ease-pin) 240ms both" }}>●</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
