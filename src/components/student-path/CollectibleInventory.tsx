"use client";

import { useMemo, useState } from "react";
import { CollectibleIcon } from "@/components/avatars/CollectibleSvg";
import { StudentAvatarHalo } from "@/components/avatars/StudentAvatar";
import { nodeLook } from "@/lib/avatars/look";
import {
  COLLECTIBLE_CATALOG,
  type CollectibleItem,
  type CollectibleRarity,
  type CollectibleSlot,
  RARITY_META,
  RARITY_ORDER,
  type StudentCollectibleRecord,
  collectiblesForTheme,
  loadoutFromCollectibles,
  nextLockedMilestoneItem,
} from "@/lib/collectibles/catalog";
import { PACK_COLORS } from "@/lib/room/types";

const SLOT_LABELS: Record<CollectibleSlot, string> = {
  hat: "Hat",
  eyewear: "Eyewear",
  pet: "Pet",
};

const SLOTS: readonly CollectibleSlot[] = ["hat", "eyewear", "pet"];

export function CollectibleInventory({
  studentId,
  firstName,
  packId,
  records,
  busyItemId,
  onEquipToggle,
  onUnlockItem,
}: {
  studentId: string;
  firstName: string;
  packId: string;
  records: StudentCollectibleRecord[];
  busyItemId: string | null;
  onEquipToggle: (
    item: CollectibleItem,
    currentlyEquipped: boolean,
  ) => Promise<void>;
  onUnlockItem: (item: CollectibleItem) => Promise<void>;
}) {
  const [themeFilter, setThemeFilter] = useState<"mine" | "all">("mine");
  const [rarityFilter, setRarityFilter] = useState<CollectibleRarity | "all">(
    "all",
  );

  const recordById = useMemo(
    () => new Map(records.map((r) => [r.itemId, r])),
    [records],
  );
  const loadout = useMemo(() => loadoutFromCollectibles(records), [records]);
  const look = useMemo(() => nodeLook(studentId), [studentId]);
  const ringColor = PACK_COLORS[packId] ?? "#38bdf8";

  const themeItems = useMemo(() => collectiblesForTheme(packId), [packId]);
  const unlockedIds = useMemo(
    () => new Set(records.map((r) => r.itemId)),
    [records],
  );
  const unlockedInThemeCount = useMemo(
    () => themeItems.filter((item) => unlockedIds.has(item.id)).length,
    [themeItems, unlockedIds],
  );
  const nextMilestone = useMemo(
    () => nextLockedMilestoneItem(packId, unlockedIds),
    [packId, unlockedIds],
  );

  const filteredItems = useMemo(() => {
    const base =
      themeFilter === "mine" ? themeItems : [...COLLECTIBLE_CATALOG];
    if (rarityFilter === "all") return base;
    return base.filter((item) => item.rarity === rarityFilter);
  }, [themeFilter, rarityFilter, themeItems]);

  const [selectedId, setSelectedId] = useState<string>(
    () => themeItems[0]?.id ?? COLLECTIBLE_CATALOG[0]!.id,
  );

  const selectedItem = useMemo(() => {
    return (
      filteredItems.find((i) => i.id === selectedId) ??
      filteredItems[0] ??
      themeItems[0] ??
      COLLECTIBLE_CATALOG[0]!
    );
  }, [filteredItems, selectedId, themeItems]);

  const selectedRecord = recordById.get(selectedItem.id);
  const selectedUnlocked = Boolean(selectedRecord);
  const selectedEquipped = Boolean(selectedRecord?.equipped);
  const selectedMeta = RARITY_META[selectedItem.rarity];
  const isBusy = busyItemId === selectedItem.id;

  return (
    <section
      aria-label={`${firstName}'s Collectible Inventory`}
      className="flex flex-col gap-5"
    >
      {/* Live Avatar & Equipped Slots Panel */}
      <div className="flex flex-col items-center gap-4 rounded-[24px] border border-white/10 bg-[#121622] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <StudentAvatarHalo
            seed={studentId}
            look={look}
            equipped={loadout}
            ringColor={ringColor}
            size="lg"
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#58b6fa]">
              Live Avatar Loadout
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-[#f6f1ea]">
              {firstName}
            </h2>
            <p className="mt-0.5 text-xs text-[#8892b0]">
              {records.length} unlocked · {Object.keys(loadout).length} of 3
              slots equipped
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
          {SLOTS.map((slot) => {
            const equippedId = loadout[slot];
            const equippedItem = equippedId
              ? COLLECTIBLE_CATALOG.find((i) => i.id === equippedId)
              : undefined;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  if (equippedItem) {
                    if (
                      themeFilter === "mine" &&
                      equippedItem.interestTheme !== packId
                    ) {
                      setThemeFilter("all");
                    }
                    setRarityFilter("all");
                    setSelectedId(equippedItem.id);
                  }
                }}
                className="flex min-w-[84px] flex-col items-center gap-1 rounded-2xl border border-white/10 bg-[#0d1019] px-2.5 py-2 text-center transition-colors hover:border-white/25"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8892b0]">
                  {SLOT_LABELS[slot]}
                </span>
                <div className="flex h-9 w-9 items-center justify-center">
                  {equippedItem ? (
                    <CollectibleIcon
                      itemId={equippedItem.id}
                      className="h-9 w-9"
                    />
                  ) : (
                    <span className="text-xs text-[#4b556b]">—</span>
                  )}
                </div>
                <span className="max-w-[78px] truncate text-[10px] font-medium text-[#cbd5e1]">
                  {equippedItem ? equippedItem.name : "Empty"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Demo / Test Milestone Trigger Bar */}
      <div
        data-testid="demo-milestone-bar"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#38bdf8]/25 bg-[#0f172a]/80 px-4 py-3"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#38bdf8]">
            Theme Milestones · {unlockedInThemeCount} / {themeItems.length}
          </p>
          <p className="mt-0.5 text-xs text-[#cbd5e1]">
            {nextMilestone
              ? `Next: ${nextMilestone.name} (${nextMilestone.rarity}) — ${nextMilestone.milestoneLabel}`
              : "All 6 theme milestones unlocked!"}
          </p>
        </div>
        <button
          type="button"
          data-testid="trigger-next-milestone"
          disabled={!nextMilestone || busyItemId !== null}
          onClick={() => {
            if (nextMilestone) void onUnlockItem(nextMilestone);
          }}
          className="rounded-xl bg-[#38bdf8] px-3.5 py-2 text-xs font-bold text-[#08121e] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {nextMilestone
            ? busyItemId === nextMilestone.id
              ? "Unlocking..."
              : `Unlock Next (${nextMilestone.rarity})`
            : "All Unlocked"}
        </button>
      </div>

      {/* Theme & Rarity Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121622] p-1">
          <button
            type="button"
            onClick={() => setThemeFilter("mine")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              themeFilter === "mine"
                ? "bg-[#38bdf8] text-[#08121e]"
                : "text-[#cbd5e1] hover:text-white"
            }`}
          >
            My Theme ({themeItems.length})
          </button>
          <button
            type="button"
            onClick={() => setThemeFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              themeFilter === "all"
                ? "bg-[#38bdf8] text-[#08121e]"
                : "text-[#cbd5e1] hover:text-white"
            }`}
          >
            All Themes ({COLLECTIBLE_CATALOG.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setRarityFilter("all")}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              rarityFilter === "all"
                ? "border-[#58b6fa] bg-[#58b6fa]/20 text-[#f6f1ea]"
                : "border-white/10 text-[#8892b0] hover:text-[#cbd5e1]"
            }`}
          >
            All
          </button>
          {RARITY_ORDER.map((rarity) => {
            const meta = RARITY_META[rarity];
            const active = rarityFilter === rarity;
            return (
              <button
                key={rarity}
                type="button"
                onClick={() => setRarityFilter(rarity)}
                style={
                  active
                    ? {
                        borderColor: meta.color,
                        backgroundColor: meta.bg,
                        color: meta.color,
                      }
                    : undefined
                }
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? ""
                    : "border-white/10 text-[#8892b0] hover:text-[#cbd5e1]"
                }`}
              >
                {rarity}
              </button>
            );
          })}
        </div>
      </div>

      {/* Collection Grid + Item Inspector */}
      <div className="grid gap-4 md:grid-cols-[1.25fr_1fr]">
        <div
          data-testid="collectible-grid"
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
        >
          {filteredItems.map((item) => {
            const record = recordById.get(item.id);
            const unlocked = Boolean(record);
            const equipped = Boolean(record?.equipped);
            const selected = selectedItem.id === item.id;
            const meta = RARITY_META[item.rarity];

            return (
              <button
                key={item.id}
                type="button"
                data-collectible-id={item.id}
                data-unlocked={unlocked ? "true" : "false"}
                data-equipped={equipped ? "true" : "false"}
                onClick={() => setSelectedId(item.id)}
                style={{
                  borderColor: selected ? meta.color : meta.border,
                  backgroundColor: unlocked ? meta.bg : "rgba(18, 22, 34, 0.7)",
                  boxShadow: selected && unlocked ? meta.glow : undefined,
                }}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-transform hover:-translate-y-0.5 ${
                  selected ? "ring-2 ring-white/30" : ""
                }`}
              >
                <div className="flex w-full items-center justify-between text-[10px] font-bold">
                  <span style={{ color: meta.color }}>{item.rarity}</span>
                  {equipped ? (
                    <span className="rounded-full bg-[#34d399]/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-[#34d399]">
                      Equipped
                    </span>
                  ) : !unlocked ? (
                    <span className="text-[10px] text-[#64748b]" aria-hidden="true">
                      🔒
                    </span>
                  ) : null}
                </div>

                <CollectibleIcon
                  itemId={item.id}
                  locked={!unlocked}
                  className="h-12 w-12"
                />

                <span className="line-clamp-2 text-xs font-bold text-[#f6f1ea]">
                  {item.name}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#8892b0]">
                  {SLOT_LABELS[item.slot]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Item Inspector */}
        <aside
          data-testid="collectible-inspector"
          className="flex flex-col justify-between gap-4 rounded-[22px] border border-white/10 bg-[#121622] p-5"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span
                style={{
                  color: selectedMeta.color,
                  backgroundColor: selectedMeta.bg,
                  borderColor: selectedMeta.border,
                }}
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
              >
                {selectedItem.rarity}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8892b0]">
                {SLOT_LABELS[selectedItem.slot]} · {selectedItem.themeLabel}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#0c0f18]">
                <CollectibleIcon
                  itemId={selectedItem.id}
                  locked={!selectedUnlocked}
                  className="h-12 w-12"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#f6f1ea]">
                  {selectedItem.name}
                </h3>
                <p className="text-xs text-[#8892b0]">
                  {selectedItem.conceptLabel}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0c0f18] p-3 text-xs">
              <p className="font-semibold text-[#cbd5e1]">Milestone</p>
              <p className="mt-0.5 text-[#8892b0]">
                {selectedItem.milestoneLabel}
              </p>
            </div>

            {selectedUnlocked && (
              <div className="rounded-xl border border-[#34d399]/25 bg-[#34d399]/10 p-3 text-xs">
                <p className="font-semibold text-[#6ee7b7]">Memory Recall</p>
                <p className="mt-0.5 text-[#cbd5e1]">
                  {selectedRecord?.recallNote || selectedItem.defaultRecallNote}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            data-testid="collectible-equip-btn"
            disabled={!selectedUnlocked || isBusy}
            onClick={() => {
              if (selectedUnlocked) {
                void onEquipToggle(selectedItem, selectedEquipped);
              }
            }}
            className={`w-full rounded-xl py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              selectedEquipped
                ? "border border-white/20 bg-[#1e293b] text-[#f6f1ea] hover:bg-[#334155]"
                : "bg-[#38bdf8] text-[#08121e] hover:opacity-90"
            }`}
          >
            {!selectedUnlocked
              ? "Locked · Complete Milestone"
              : isBusy
                ? "Saving..."
                : selectedEquipped
                  ? "Unequip"
                  : "Equip"}
          </button>
        </aside>
      </div>
    </section>
  );
}
