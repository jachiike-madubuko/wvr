"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { CollectibleIcon } from "@/components/avatars/CollectibleSvg";
import { StudentAvatarHalo } from "@/components/avatars/StudentAvatar";
import { nodeLook } from "@/lib/avatars/look";
import { FACE } from "@/lib/blocks/library";
import {
  type CollectibleItem,
  RARITY_META,
  type StudentCollectibleRecord,
  evaluateMilestonesForPack,
  loadoutFromCollectibles,
} from "@/lib/collectibles/catalog";
import { RIDDLE } from "@/lib/lesson/space-pins";
import { PACK_COLORS } from "@/lib/room/types";
import type {
  StudentCollectiblesBundle,
  StudentRosterItem,
} from "@/lib/student-path/data";
import {
  buildMosaicDeck,
  isBlockUnlocked,
  type MosaicBlock,
  type RawPathPayload,
} from "@/lib/student-path/deck";
import { BreakTimer } from "./BreakTimer";
import { CollectibleInventory } from "./CollectibleInventory";
import { DrawPad } from "./DrawPad";

type FlipRect = { left: number; top: number; width: number; height: number };
type FlipState = {
  id: string;
  rect: FlipRect;
  phase: "unsettled" | "open";
};

const BRAIN_PAIRS: [string, string][] = [
  ["10", "5 + 5"],
  ["12", "6 + 6"],
  ["16", "8 + 8"],
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatClock(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function BlockFlip({
  token,
  payload,
  initialCompletedIds,
  roster,
  initialCollectiblesByStudent,
}: {
  token: string;
  payload: RawPathPayload;
  initialCompletedIds: string[];
  roster: StudentRosterItem[];
  initialCollectiblesByStudent?: Record<string, StudentCollectiblesBundle>;
}) {
  const deck = useMemo(() => buildMosaicDeck(payload), [payload]);
  const [student, setStudent] = useState<StudentRosterItem | null>(null);
  const [activeTab, setActiveTab] = useState<"blocks" | "inventory">("blocks");
  const [completedIds, setCompletedIds] =
    useState<string[]>(initialCompletedIds);
  const [collectiblesByStudent, setCollectiblesByStudent] = useState<
    Record<string, StudentCollectiblesBundle>
  >(() => initialCollectiblesByStudent ?? {});
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [unlockToast, setUnlockToast] = useState<CollectibleItem | null>(null);

  // Flip & tile feedback state
  const [flip, setFlip] = useState<FlipState | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [justUnlockedId, setJustUnlockedId] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);
  const [viewport, setViewport] = useState({ width: 800, height: 800 });
  const flipTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);

  // Activity state inside flipped card
  const openedAtRef = useRef<number>(0);
  const [watched, setWatched] = useState(0);
  const [strokes, setStrokes] = useState(0);
  const [pickedChoice, setPickedChoice] = useState<string | null>(null);
  const [wrongChoices, setWrongChoices] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [riddleGuess, setRiddleGuess] = useState("");
  const [clueCount, setClueCount] = useState(0);
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);
  const [readDepth, setReadDepth] = useState(0);
  const [writeBody, setWriteBody] = useState("");
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [firstTile, setFirstTile] = useState<string | null>(null);
  const [timerReady, setTimerReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sync = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  const activeBlock = useMemo(
    () => (flip ? deck.find((b) => b.id === flip.id) ?? null : null),
    [flip, deck],
  );
  const flipOpen = flip?.phase === "open";

  const closeFlip = useCallback(() => {
    if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setFlip((cur) => (cur ? { ...cur, phase: "unsettled" } : null));
    closeTimerRef.current = window.setTimeout(() => {
      setFlip(null);
      setBurst(false);
    }, 480);
  }, []);

  useEffect(() => {
    if (!flip) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFlip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, closeFlip]);

  const openTile = (
    block: MosaicBlock,
    unlocked: boolean,
    done: boolean,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    if (flip) return;
    if (!unlocked || done) {
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
      setShakeId(block.id);
      shakeTimerRef.current = window.setTimeout(() => setShakeId(null), 520);
      return;
    }

    const r = event.currentTarget.getBoundingClientRect();
    openedAtRef.current = Date.now();
    setWatched(0);
    setStrokes(0);
    setPickedChoice(null);
    setWrongChoices([]);
    setAttempts(0);
    setRiddleGuess("");
    setClueCount(0);
    setTens(0);
    setOnes(0);
    setReadDepth(0);
    setWriteBody("");
    setMatchedPairs([]);
    setFirstTile(null);
    setTimerReady(false);
    setBurst(false);

    if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);

    const rect: FlipRect = {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
    };
    setFlip({ id: block.id, rect, phase: "unsettled" });
    flipTimerRef.current = window.setTimeout(() => {
      setFlip((cur) =>
        cur && cur.id === block.id ? { ...cur, phase: "open" } : cur,
      );
    }, 20);
  };

  const canComplete = (() => {
    if (!activeBlock) return false;
    if (activeBlock.kind === "video.story") {
      const dur = activeBlock.dur ?? 186;
      return dur > 0 ? watched / dur >= 0.9 : true;
    }
    if (activeBlock.kind === "image.draw" || activeBlock.kind === "image.art") {
      return strokes >= 1;
    }
    if (activeBlock.kind === "text.question") return pickedChoice !== null;
    if (activeBlock.kind === "riddle") return riddleGuess.trim().length > 0;
    if (activeBlock.kind === "placeholder") return true;
    if (activeBlock.kind === "pbl.manipulative") return tens * 10 + ones === 10;
    if (activeBlock.kind === "text.read") return readDepth >= 0.9;
    if (activeBlock.kind === "text.write") return wordCount(writeBody) >= 15;
    if (activeBlock.kind === "game.brain") return matchedPairs.length >= 3;
    if (activeBlock.kind === "pbl.social") return timerReady;
    return true;
  })();

  const mutateCollectible = async (
    studentId: string,
    action: "unlock" | "equip" | "unequip",
    item: CollectibleItem,
    recallNote?: string,
  ): Promise<boolean> => {
    setBusyItemId(item.id);
    try {
      const res = await fetch(
        `/api/student-path/${encodeURIComponent(token)}/collectibles`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            action,
            itemId: item.id,
            ...(recallNote ? { recallNote } : {}),
          }),
        },
      );
      if (!res.ok) return false;
      const data = (await res.json()) as {
        ok: boolean;
        items: StudentCollectibleRecord[];
      };
      if (data.ok && Array.isArray(data.items)) {
        setCollectiblesByStudent((prev) => ({
          ...prev,
          [studentId]: {
            packId: prev[studentId]?.packId ?? "pack_space",
            items: data.items,
          },
        }));
        if (action === "unlock") {
          setUnlockToast(item);
        }
        return true;
      }
      return false;
    } finally {
      setBusyItemId(null);
    }
  };

  const handleComplete = async () => {
    if (!activeBlock || !student || !canComplete || saving) return;
    if (activeBlock.kind === "placeholder") {
      closeFlip();
      return;
    }

    setSaving(true);
    const dwellMs = Math.max(1000, Date.now() - openedAtRef.current);
    const nextCompleted = completedIds.includes(activeBlock.id)
      ? completedIds
      : [...completedIds, activeBlock.id];

    const finalAttempts =
      activeBlock.kind === "text.question" ? Math.max(1, attempts) : 1;

    try {
      const res = await fetch(
        `/api/student-path/${encodeURIComponent(token)}/session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.id,
            completedBlockIds: nextCompleted,
            blockMs: { [activeBlock.id]: dwellMs },
            blockEvents: [
              {
                blockId: activeBlock.id,
                subject: activeBlock.subject,
                attempts: finalAttempts,
                durationSec: Math.max(1, Math.round(dwellMs / 1000)),
                errorLog: wrongChoices,
              },
            ],
          }),
        },
      );
      if (res.ok) {
        setBurst(true);
        const currentIdx = deck.findIndex((b) => b.id === activeBlock.id);
        const nextBlock = deck[currentIdx + 1];
        setCompletedIds(nextCompleted);

        const bundle = collectiblesByStudent[student.id] ?? {
          packId: "pack_space",
          items: [],
        };
        const newlyUnlocked = evaluateMilestonesForPack({
          packId: bundle.packId,
          completedBlockCount: nextCompleted.length,
          totalBlocks: Math.min(deck.length, 5),
          adaptiveCredits: 0,
          unlockedItemIds: bundle.items.map((r) => r.itemId),
        });
        for (const item of newlyUnlocked) {
          await mutateCollectible(
            student.id,
            "unlock",
            item,
            item.defaultRecallNote,
          );
        }

        if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
        burstTimerRef.current = window.setTimeout(() => {
          if (nextBlock) setJustUnlockedId(nextBlock.id);
          closeFlip();
        }, 550);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!student) {
    return (
      <main
        data-testid="roster-picker"
        style={{ background: "var(--student-bg)" }}
        className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-12 text-[#f6f1ea]"
      >
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#58b6fa]">
            {payload.packLabel ?? "Grade 2 · Space"}
          </p>
          <h1
            className="mt-2 text-3xl font-bold"
            style={{ fontFamily: "var(--font-serif-display)" }}
          >
            {payload.title ?? "Sunny and her sister on Station Luna"}
          </h1>
          <p className="mt-2 text-sm text-[#8892b0]">
            Tap your first name to begin.
          </p>
          {token === "demo-space-lesson" && (
            <Link
              href="/"
              data-testid="demo-back-home"
              className="mt-3 inline-block rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-[#cbd5e1] hover:bg-white/10"
            >
              ← Home
            </Link>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {roster.map((item) => {
            const bundle = collectiblesByStudent[item.id] ?? {
              packId: "pack_space",
              items: [],
            };
            const equipped = loadoutFromCollectibles(bundle.items);
            const ringColor = PACK_COLORS[bundle.packId] ?? "#38bdf8";

            return (
              <button
                key={item.id}
                type="button"
                data-student-pick={item.firstName}
                onClick={() => {
                  setStudent(item);
                  setActiveTab("blocks");
                  setUnlockToast(null);
                }}
                className="flex flex-col items-center gap-2.5 rounded-2xl border border-white/15 bg-[#12151f] px-4 py-5 text-lg font-bold text-[#f6f1ea] transition-transform hover:-translate-y-0.5 hover:border-[#58b6fa]"
              >
                <StudentAvatarHalo
                  seed={item.id}
                  look={nodeLook(item.id)}
                  equipped={equipped}
                  ringColor={ringColor}
                  size="sm"
                />
                <span>{item.firstName}</span>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  const doneCount = deck.filter((b) => completedIds.includes(b.id)).length;
  const studentBundle = collectiblesByStudent[student.id] ?? {
    packId: "pack_space",
    items: [],
  };
  const studentLoadout = loadoutFromCollectibles(studentBundle.items);
  const studentRingColor = PACK_COLORS[studentBundle.packId] ?? "#38bdf8";

  const focusW = Math.min(460, viewport.width * 0.92);
  const focusH = Math.min(620, Math.max(500, viewport.height * 0.8));
  const targetBox: FlipRect = {
    left: Math.max(12, (viewport.width - focusW) / 2),
    top: Math.max(24, (viewport.height - focusH) / 2),
    width: focusW,
    height: focusH,
  };
  const flipBox = flip ? (flipOpen ? targetBox : flip.rect) : null;
  const flipFace = activeBlock ? FACE[activeBlock.role] : null;
  const activeIndex = activeBlock
    ? deck.findIndex((b) => b.id === activeBlock.id)
    : -1;

  return (
    <div style={{ background: "var(--student-bg)" }} className="min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-[760px] flex-col gap-5 px-4 py-8 text-[#f6f1ea]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div data-testid="student-deck-avatar" className="shrink-0">
              <StudentAvatarHalo
                seed={student.id}
                look={nodeLook(student.id)}
                equipped={studentLoadout}
                ringColor={studentRingColor}
                size="md"
              />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#58b6fa]">
                Grade 2 · {payload.packLabel ?? "Space"} · {student.firstName}
              </p>
              <h1
                className="mt-1 text-2xl font-bold"
                style={{ fontFamily: "var(--font-serif-display)" }}
              >
                {payload.title ?? "Sunny and her sister on Station Luna"}
              </h1>
              <p
                data-testid="deck-progress"
                className="mt-1 text-xs text-[#8892b0]"
              >
                {doneCount} of {deck.length} done
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {token === "demo-space-lesson" && (
              <Link
                href="/"
                data-testid="demo-back-home"
                className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-[#cbd5e1] hover:bg-white/10"
              >
                ← Home
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setStudent(null);
                setFlip(null);
                setUnlockToast(null);
              }}
              className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-[#cbd5e1] hover:bg-white/10"
            >
              Switch
            </button>
          </div>
        </header>

        {/* Blocks / Inventory Tabs */}
        <nav
          aria-label="Student views"
          className="flex items-center gap-2 border-b border-white/10 pb-2"
        >
          <button
            type="button"
            data-testid="student-tab-blocks"
            onClick={() => setActiveTab("blocks")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "blocks"
                ? "bg-[#58b6fa] text-[#08121e]"
                : "bg-[#121622] text-[#cbd5e1] hover:text-white"
            }`}
          >
            Blocks
          </button>
          <button
            type="button"
            data-testid="student-tab-inventory"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "inventory"
                ? "bg-[#58b6fa] text-[#08121e]"
                : "bg-[#121622] text-[#cbd5e1] hover:text-white"
            }`}
          >
            <span>Inventory</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                activeTab === "inventory"
                  ? "bg-[#08121e]/15 text-[#08121e]"
                  : "bg-white/10 text-[#cbd5e1]"
              }`}
            >
              {studentBundle.items.length}
            </span>
          </button>
        </nav>

        {unlockToast && (
          <div
            data-testid="unlock-toast"
            role="status"
            style={{
              borderColor: RARITY_META[unlockToast.rarity].border,
              backgroundColor: RARITY_META[unlockToast.rarity].bg,
            }}
            className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <CollectibleIcon
                itemId={unlockToast.id}
                className="h-9 w-9 shrink-0"
              />
              <div>
                <p
                  style={{ color: RARITY_META[unlockToast.rarity].color }}
                  className="text-[10px] font-extrabold uppercase tracking-[0.14em]"
                >
                  New {unlockToast.rarity} Collectible Unlocked!
                </p>
                <p className="text-sm font-bold text-[#f6f1ea]">
                  {unlockToast.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeTab !== "inventory" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("inventory")}
                  className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/25"
                >
                  Equip
                </button>
              )}
              <button
                type="button"
                aria-label="Dismiss unlock notice"
                onClick={() => setUnlockToast(null)}
                className="rounded-lg px-2 py-1 text-xs text-[#cbd5e1] hover:bg-white/10"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {activeTab === "inventory" ? (
          <CollectibleInventory
            studentId={student.id}
            firstName={student.firstName}
            packId={studentBundle.packId}
            records={studentBundle.items}
            busyItemId={busyItemId}
            onEquipToggle={async (item, currentlyEquipped) => {
              await mutateCollectible(
                student.id,
                currentlyEquipped ? "unequip" : "equip",
                item,
              );
            }}
            onUnlockItem={async (item) => {
              await mutateCollectible(
                student.id,
                "unlock",
                item,
                item.defaultRecallNote,
              );
            }}
          />
        ) : (
          <div
            data-testid="mosaic-grid"
            className="grid grid-cols-2 items-start gap-4"
          >
            {deck.map((block, index) => {
              const unlocked = isBlockUnlocked(index, completedIds, deck);
              const done = completedIds.includes(block.id);
              const hidden = flip?.id === block.id;
              const face = FACE[block.role];
              const wide = block.span === 2;

              return (
                <button
                  key={block.id}
                  type="button"
                  aria-disabled={!unlocked || undefined}
                  data-block-id={block.id}
                  data-role={block.role}
                  data-span={wide ? "2" : undefined}
                  data-locked={unlocked ? "false" : "true"}
                  data-done={done ? "true" : "false"}
                  onClick={(e) => openTile(block, unlocked, done, e)}
                  style={{
                    gridColumn: wide ? "1 / -1" : undefined,
                    height: block.h ?? 168,
                    borderRadius: "var(--radius-pin)",
                    background: face.bg,
                    color: face.ink,
                    opacity: hidden ? 0 : unlocked ? 1 : 0.55,
                    filter: done ? "saturate(0.92)" : undefined,
                    transform:
                      justUnlockedId === block.id ? "scale(1.03)" : undefined,
                  }}
                  className={`relative flex w-full flex-col justify-between gap-2 p-4 text-left transition-transform ${
                    unlocked && !done
                      ? "cursor-pointer hover:-translate-y-0.5"
                      : "cursor-default"
                  } ${
                    shakeId === block.id
                      ? "wv-pin-shake"
                      : justUnlockedId === block.id
                        ? "wv-pin-glow"
                        : ""
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                      {face.kicker}
                    </span>
                    <span
                      style={{ background: face.ink, color: face.bg }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black"
                    >
                      {done ? "✓" : index + 1}
                    </span>
                  </div>

                  <span
                    className="text-lg font-semibold leading-snug"
                    style={{ fontFamily: "var(--font-serif-display)" }}
                  >
                    {block.title}
                  </span>

                  <span className="mt-auto text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-75">
                    {done ? "Done" : unlocked ? "Open" : "Locked"}
                    {block.continuation && payload.profile === "sales_walkthrough"
                      ? " · Generated for Demo Purposes"
                      : ""}
                  </span>

                  {!unlocked && (
                    <div
                      aria-hidden="true"
                      style={{
                        borderRadius: "var(--radius-pin)",
                        background:
                          "color-mix(in srgb, var(--student-lock) 72%, transparent)",
                        backdropFilter: "blur(2px)",
                      }}
                      className="absolute inset-0 grid place-items-center"
                    >
                      <svg viewBox="0 0 32 32" width="34" height="34">
                        <rect
                          x="6"
                          y="14"
                          width="20"
                          height="14"
                          rx="4"
                          fill="#d4d4d8"
                        />
                        <path
                          d="M10 14V11a6 6 0 0 1 12 0v3"
                          fill="none"
                          stroke="#d4d4d8"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="16" cy="21" r="2.2" fill="#3f3f46" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* In-Place 3D Flip Activation Overlay */}
        {flip && activeBlock && flipFace && flipBox && (
          <>
            <button
              type="button"
              aria-label="Close block"
              onClick={closeFlip}
              style={{
                background: flipOpen ? "rgba(0,0,0,0.68)" : "transparent",
                backdropFilter: flipOpen ? "blur(3px)" : undefined,
              }}
              className="fixed inset-0 z-40 border-0 transition-colors"
            />
            <div
              data-testid="block-modal"
              data-flip-phase={flip.phase}
              className="wv-flip-move fixed z-50"
              style={{
                left: flipBox.left,
                top: flipBox.top,
                width: flipBox.width,
                height: flipBox.height,
                perspective: 1600,
              }}
            >
              <div
                className="wv-flip-turn relative h-full w-full"
                style={{
                  transformStyle: "preserve-3d",
                  transform: `rotateY(${flipOpen ? 180 : 0}deg)`,
                }}
              >
                {/* Front Face (matches clicked tile) */}
                <div
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    borderRadius: "var(--radius-pin)",
                    background: flipFace.bg,
                    color: flipFace.ink,
                  }}
                  className="absolute inset-0 flex items-center justify-center p-4"
                >
                  <p
                    className="m-0 text-xl font-semibold"
                    style={{ fontFamily: "var(--font-serif-display)" }}
                  >
                    {activeBlock.title}
                  </p>
                </div>

                {/* Back Face (interactive activity card) */}
                <div
                  role="dialog"
                  aria-modal="true"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    borderRadius: "var(--radius-pin)",
                    background: flipFace.bg,
                    color: flipFace.ink,
                  }}
                  className="absolute inset-0 flex flex-col gap-3 overflow-auto p-5 shadow-2xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                      {flipFace.kicker}
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span
                        style={{
                          background: flipFace.ink,
                          color: flipFace.bg,
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black"
                      >
                        {completedIds.includes(activeBlock.id)
                          ? "✓"
                          : activeIndex + 1}
                      </span>
                      <button
                        type="button"
                        aria-label="Close"
                        onClick={closeFlip}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  </div>

                  <div>
                    <h2
                      className="text-2xl font-semibold leading-tight"
                      style={{ fontFamily: "var(--font-serif-display)" }}
                    >
                      {activeBlock.title}
                    </h2>
                    <p className="mt-1 text-sm opacity-90">
                      {activeBlock.instr}
                    </p>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 overflow-auto rounded-2xl bg-black/10 p-3.5">
                    {activeBlock.kind === "video.story" && (
                      <>
                        <div className="relative h-48 overflow-hidden rounded-xl bg-[#1a1410]">
                          {activeBlock.videoSrc && (
                            <iframe
                              data-testid="hook-video-frame"
                              src={activeBlock.videoSrc}
                              title={activeBlock.title}
                              allow="autoplay; encrypted-media; picture-in-picture"
                              allowFullScreen
                              className="h-full w-full border-0"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span>{formatClock(watched)}</span>
                          <div
                            role="slider"
                            tabIndex={0}
                            aria-label="Seek"
                            aria-valuemin={0}
                            aria-valuemax={activeBlock.dur ?? 186}
                            aria-valuenow={Math.round(watched)}
                            onClick={(e) => {
                              const dur = activeBlock.dur ?? 186;
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const ratio = rect.width
                                ? (e.clientX - rect.left) / rect.width
                                : 1;
                              setWatched(
                                Math.min(dur, Math.max(0, ratio * dur)),
                              );
                            }}
                            className="h-2.5 flex-1 cursor-pointer rounded-full bg-black/20"
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.round((watched / (activeBlock.dur ?? 186)) * 100))}%`,
                                background: flipFace.ink,
                              }}
                              className="h-full rounded-full transition-all"
                            />
                          </div>
                          <span>{formatClock(activeBlock.dur ?? 186)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>
                            Watched{" "}
                            {Math.round(
                              (watched / (activeBlock.dur ?? 186)) * 100,
                            )}
                            %
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setWatched((v) => Math.max(0, v - 15))
                            }
                            className="rounded-full bg-black/15 px-3 py-1 font-bold"
                          >
                            ↺ 15s
                          </button>
                        </div>
                      </>
                    )}

                    {(activeBlock.kind === "image.draw" ||
                      activeBlock.kind === "image.art") && (
                      <DrawPad
                        prompt={activeBlock.instr}
                        onStrokeChange={setStrokes}
                      />
                    )}

                    {activeBlock.kind === "text.question" &&
                      activeBlock.choices && (
                        <div className="flex flex-col gap-2">
                          {activeBlock.choices.map((c, idx) => {
                            const selected = pickedChoice === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                data-choice-id={c.id}
                                onClick={() => {
                                  setPickedChoice(c.id);
                                  setAttempts((a) => a + 1);
                                  if (c.ok === false) {
                                    setWrongChoices((prev) =>
                                      prev.includes(c.text)
                                        ? prev
                                        : [...prev, c.text],
                                    );
                                  }
                                }}
                                style={{
                                  background: selected
                                    ? "rgba(255,255,255,0.88)"
                                    : "rgba(255,255,255,0.52)",
                                }}
                                className="flex items-center gap-3 rounded-full px-4 py-3 text-left text-sm font-semibold transition-colors"
                              >
                                <span
                                  style={{
                                    background: selected
                                      ? "rgba(0,0,0,0.85)"
                                      : "rgba(0,0,0,0.16)",
                                    color: selected ? "#fff" : "inherit",
                                  }}
                                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                                >
                                  {"ABCD"[idx]}
                                </span>
                                <span>{c.text}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                    {activeBlock.kind === "placeholder" && (
                      <p className="m-0 text-sm font-medium">
                        {activeBlock.instr}
                      </p>
                    )}

                    {activeBlock.kind === "riddle" && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                            Think & Guess
                          </span>
                          {clueCount < RIDDLE.clues.length && (
                            <button
                              type="button"
                              onClick={() => setClueCount((c) => c + 1)}
                              className="rounded-full bg-black/15 px-3 py-1 text-xs font-bold"
                            >
                              Need a clue?
                            </button>
                          )}
                        </div>
                        {RIDDLE.clues.slice(0, clueCount).map((clue) => (
                          <p
                            key={clue}
                            className="m-0 rounded-xl bg-white/55 px-3 py-2 text-xs font-semibold"
                          >
                            Clue: {clue}
                          </p>
                        ))}
                        <input
                          type="text"
                          aria-label="Your guess"
                          data-testid="riddle-input"
                          placeholder="Type your answer..."
                          value={riddleGuess}
                          onChange={(e) => setRiddleGuess(e.target.value)}
                          className="w-full rounded-xl border-0 bg-white/75 px-3.5 py-2.5 text-sm font-semibold text-[#04243b] placeholder:text-[#04243b]/50"
                        />
                      </div>
                    )}

                    {activeBlock.kind === "pbl.manipulative" && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-bold">
                            {tens * 10 + ones}
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-wider opacity-70">
                            Target: 10
                          </span>
                        </div>
                        <div className="flex min-h-[72px] flex-wrap items-end gap-1.5 rounded-xl bg-white/50 p-3">
                          {Array.from({ length: tens }, (_, i) => (
                            <button
                              key={`ten-${i}`}
                              type="button"
                              aria-label="Remove a ten"
                              onClick={() => setTens((t) => Math.max(0, t - 1))}
                              className="h-14 w-4 rounded bg-[#3d6cff]"
                            />
                          ))}
                          {Array.from({ length: ones }, (_, i) => (
                            <button
                              key={`one-${i}`}
                              type="button"
                              aria-label="Remove a one"
                              onClick={() => setOnes((o) => Math.max(0, o - 1))}
                              className="h-4 w-4 rounded bg-[#f5b400]"
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setTens((t) => Math.min(5, t + 1))}
                            style={{
                              background: flipFace.ink,
                              color: flipFace.bg,
                            }}
                            className="flex-1 rounded-full py-2 text-xs font-bold"
                          >
                            + Ten rod
                          </button>
                          <button
                            type="button"
                            onClick={() => setOnes((o) => Math.min(20, o + 1))}
                            className="flex-1 rounded-full bg-black/15 py-2 text-xs font-bold"
                          >
                            + One
                          </button>
                        </div>
                      </div>
                    )}

                    {activeBlock.kind === "text.read" &&
                      activeBlock.passage && (
                        <>
                          <div
                            ref={(el) => {
                              if (!el || readDepth > 0) return;
                              if (el.scrollHeight - el.clientHeight <= 0) {
                                setReadDepth(1);
                              }
                            }}
                            onScroll={(e) => {
                              const el = e.currentTarget;
                              const span = el.scrollHeight - el.clientHeight;
                              setReadDepth(
                                span <= 0 ? 1 : el.scrollTop / span,
                              );
                            }}
                            style={{ fontFamily: "var(--font-serif-display)" }}
                            className="max-h-44 overflow-auto rounded-xl bg-white/60 p-3 text-sm"
                          >
                            {activeBlock.passage.map((p) => (
                              <p key={p} className="mb-2.5 last:mb-0">
                                {p}
                              </p>
                            ))}
                          </div>
                          <span className="text-xs font-bold">
                            {Math.round(readDepth * 100)}% read
                          </span>
                        </>
                      )}

                    {activeBlock.kind === "text.write" && (
                      <>
                        <textarea
                          aria-label="Answer"
                          rows={4}
                          value={writeBody}
                          onChange={(e) => setWriteBody(e.target.value)}
                          placeholder="Explain in your own words..."
                          style={{ fontFamily: "var(--font-serif-display)" }}
                          className="w-full rounded-xl border-0 bg-white/70 p-3 text-sm"
                        />
                        <span className="text-xs font-bold">
                          {wordCount(writeBody)} words · 15 to finish
                        </span>
                      </>
                    )}

                    {activeBlock.kind === "game.brain" && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold">
                          {matchedPairs.length} of 3 pairs
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {BRAIN_PAIRS.flatMap((pair, pIdx) =>
                            pair.map((label, sIdx) => {
                              const key = `${pIdx}-${sIdx}`;
                              const solved = matchedPairs.includes(pIdx);
                              const picked = firstTile === key;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  disabled={solved}
                                  onClick={() => {
                                    if (firstTile === null) {
                                      setFirstTile(key);
                                      return;
                                    }
                                    if (firstTile === key) {
                                      setFirstTile(null);
                                      return;
                                    }
                                    const prevPair = Number(
                                      firstTile.split("-")[0],
                                    );
                                    if (prevPair === pIdx) {
                                      setMatchedPairs((m) => [...m, pIdx]);
                                    }
                                    setFirstTile(null);
                                  }}
                                  className={`rounded-xl py-2.5 text-xs font-bold ${
                                    solved
                                      ? "bg-black/20 opacity-50"
                                      : picked
                                        ? "bg-white"
                                        : "bg-white/65"
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            }),
                          )}
                        </div>
                      </div>
                    )}

                    {activeBlock.kind === "pbl.social" && (
                      <BreakTimer
                        seconds={60}
                        onReady={() => setTimerReady(true)}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    data-testid="block-complete-btn"
                    disabled={!canComplete || saving}
                    onClick={() => void handleComplete()}
                    style={{
                      background: flipFace.ink,
                      color: flipFace.bg,
                      opacity: canComplete && !saving ? 1 : 0.45,
                    }}
                    className="w-full rounded-full py-3.5 text-xs font-black uppercase tracking-wider disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : activeBlock.cta}
                  </button>

                  {burst && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 text-2xl"
                    >
                      <span
                        style={{
                          animation:
                            "student-burst var(--dur-burst) var(--ease-pin) both",
                        }}
                      >
                        ✦
                      </span>
                      <span
                        style={{
                          animation:
                            "student-burst var(--dur-burst) var(--ease-pin) 80ms both",
                        }}
                      >
                        ★
                      </span>
                      <span
                        style={{
                          animation:
                            "student-burst var(--dur-burst) var(--ease-pin) 160ms both",
                        }}
                      >
                        ✧
                      </span>
                      <span
                        style={{
                          animation:
                            "student-burst var(--dur-burst) var(--ease-pin) 240ms both",
                        }}
                      >
                        ●
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
