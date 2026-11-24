"use client";

import { useMemo, useRef, useState } from "react";
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
import { PACK_COLORS } from "@/lib/room/types";
import {
  buildMosaicDeck,
  isBlockUnlocked,
  type MosaicBlock,
  type RawPathPayload,
} from "@/lib/student-path/deck";
import type {
  StudentCollectiblesBundle,
  StudentRosterItem,
} from "@/lib/student-path/data";
import { BreakTimer } from "./BreakTimer";
import { CollectibleInventory } from "./CollectibleInventory";
import { DrawPad } from "./DrawPad";

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
  const [completedIds, setCompletedIds] = useState<string[]>(initialCompletedIds);
  const [activeBlock, setActiveBlock] = useState<MosaicBlock | null>(null);
  const [collectiblesByStudent, setCollectiblesByStudent] = useState<
    Record<string, StudentCollectiblesBundle>
  >(() => initialCollectiblesByStudent ?? {});
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [unlockToast, setUnlockToast] = useState<CollectibleItem | null>(null);

  // Modal interaction state
  const openedAtRef = useRef<number>(0);
  const [strokes, setStrokes] = useState(0);
  const [pickedChoice, setPickedChoice] = useState<string | null>(null);
  const [wrongChoices, setWrongChoices] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [timerReady, setTimerReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const openTile = (block: MosaicBlock) => {
    openedAtRef.current = Date.now();
    setStrokes(0);
    setPickedChoice(null);
    setWrongChoices([]);
    setAttempts(0);
    setTimerReady(false);
    setActiveBlock(block);
  };

  const canComplete = (() => {
    if (!activeBlock) return false;
    if (activeBlock.kind === "image.draw") return strokes >= 1;
    if (activeBlock.kind === "text.question") return pickedChoice !== null;
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
        setCompletedIds(nextCompleted);
        setActiveBlock(null);

        const bundle = collectiblesByStudent[student.id] ?? {
          packId: "pack_space",
          items: [],
        };
        const newlyUnlocked = evaluateMilestonesForPack({
          packId: bundle.packId,
          completedBlockCount: nextCompleted.length,
          totalBlocks: deck.length,
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
      }
    } finally {
      setSaving(false);
    }
  };

  if (!student) {
    return (
      <main
        data-testid="roster-picker"
        className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-12 text-[#f6f1ea]"
      >
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#58b6fa]">
            {payload.packLabel ?? "Lesson Deck"}
          </p>
          <h1
            className="mt-2 text-3xl font-bold"
            style={{ fontFamily: "var(--font-serif-display)" }}
          >
            {payload.title ?? "Today's Lesson"}
          </h1>
          <p className="mt-2 text-sm text-[#8892b0]">
            Tap your first name to begin.
          </p>
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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 py-8 text-[#f6f1ea]">
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
              {payload.packLabel ?? "Space"} · {student.firstName}
            </p>
            <h1
              className="mt-1 text-2xl font-bold"
              style={{ fontFamily: "var(--font-serif-display)" }}
            >
              {payload.title ?? "Station Luna"}
            </h1>
            <p data-testid="deck-progress" className="mt-1 text-xs text-[#8892b0]">
              {doneCount} of {deck.length} done
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStudent(null);
            setUnlockToast(null);
          }}
          className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-[#cbd5e1] hover:bg-white/10"
        >
          Switch
        </button>
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
            <CollectibleIcon itemId={unlockToast.id} className="h-9 w-9 shrink-0" />
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
        <div className="grid grid-cols-2 gap-4" data-testid="mosaic-grid">
        {deck.map((block, index) => {
          const unlocked = isBlockUnlocked(index, completedIds, deck);
          const done = completedIds.includes(block.id);
          const face = FACE[block.role];

          if (!unlocked) {
            return (
              <button
                key={block.id}
                type="button"
                disabled
                data-block-id={block.id}
                data-role={block.role}
                data-span={block.span}
                data-locked="true"
                data-done="false"
                className={`${
                  block.span === 2 ? "col-span-2" : ""
                } flex min-h-[140px] cursor-not-allowed flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-[#242c3d] bg-[#171b26] p-4 text-[#4b556b]`}
              >
                <span aria-hidden="true" className="text-xl">
                  🔒
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Locked · {block.title}
                </span>
              </button>
            );
          }

          return (
            <button
              key={block.id}
              type="button"
              data-block-id={block.id}
              data-role={block.role}
              data-span={block.span}
              data-locked="false"
              data-done={done ? "true" : "false"}
              onClick={() => openTile(block)}
              style={{ background: face.bg, color: face.ink }}
              className={`${
                block.span === 2 ? "col-span-2" : ""
              } flex min-h-[140px] flex-col items-start justify-between rounded-[20px] p-4 text-left transition-transform hover:-translate-y-0.5 active:scale-[0.98]`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-85">
                  {face.kicker}
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15 text-xs font-bold">
                  {index + 1}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold leading-snug">
                {block.title}
              </div>
              <div className="mt-auto pt-2 text-[11px] font-extrabold uppercase tracking-wider opacity-80">
                {done ? "✓ Done" : "Open"}
              </div>
            </button>
          );
        })}
        </div>
      )}

      {activeBlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveBlock(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            data-testid="block-modal"
            className="flex w-full max-w-md flex-col gap-4 rounded-[28px] border border-white/15 bg-[#151824] p-6 text-[#f6f1ea] shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#58b6fa]">
                {FACE[activeBlock.role].kicker}
              </span>
              <button
                type="button"
                aria-label="Close block"
                onClick={() => setActiveBlock(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#242b3d] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold">{activeBlock.title}</h2>
              <p className="mt-1 text-xs text-[#8892b0]">{activeBlock.instr}</p>
            </div>

            <div className="rounded-2xl border border-[#1f2536] bg-[#0c0e15] p-4">
              {activeBlock.kind === "video.story" && (
                <div className="py-4 text-center">
                  <div className="text-4xl">🚀</div>
                  <p className="mt-2 text-xs text-slate-300">
                    Station Luna Hook · Equal Parts & Halves
                  </p>
                </div>
              )}

              {activeBlock.kind === "image.draw" && (
                <DrawPad
                  prompt="Sketch two equal halves across the moon."
                  onStrokeChange={setStrokes}
                />
              )}

              {activeBlock.kind === "text.question" && activeBlock.choices && (
                <div className="flex flex-col gap-2">
                  {activeBlock.choices.map((c) => {
                    const selected = pickedChoice === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        data-choice-id={c.id}
                        onClick={() => {
                          setPickedChoice(c.id);
                          setAttempts((a) => a + 1);
                          if (!c.ok) {
                            setWrongChoices((prev) =>
                              prev.includes(c.text) ? prev : [...prev, c.text],
                            );
                          }
                        }}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                          selected
                            ? "border-[#48e29a] bg-[#48e29a]/15 font-semibold text-[#6ee7b7]"
                            : "border-[#28334a] bg-[#191f2e] text-slate-200 hover:bg-[#222b3f]"
                        }`}
                      >
                        {c.text}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeBlock.kind === "pbl.social" && (
                <BreakTimer seconds={60} onReady={() => setTimerReady(true)} />
              )}

              {activeBlock.kind === "next" && (
                <p className="text-xs text-slate-300">
                  Ready to wrap up this mission block!
                </p>
              )}
            </div>

            <button
              type="button"
              data-testid="block-complete-btn"
              disabled={!canComplete || saving}
              onClick={() => void handleComplete()}
              style={{
                background: FACE[activeBlock.role].bg,
                color: FACE[activeBlock.role].ink,
              }}
              className="w-full rounded-2xl py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving..." : activeBlock.cta}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
