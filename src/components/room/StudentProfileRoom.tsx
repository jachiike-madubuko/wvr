"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  ActionThreadRecord,
  CheckInPoint,
  MasteryFilter,
  MasteryNode,
  MasteryZoom,
  StudentProfileSnapshot,
} from "@/lib/students/model";
import { CheckInTrend } from "./profile/CheckInTrend";
import { MasteryChart } from "./profile/MasteryChart";
import { ProfileDrawer } from "./profile/ProfileDrawer";
import { ProfileRadar } from "./profile/ProfileRadar";

export function StudentProfileRoom({
  initialProfile,
}: {
  initialProfile: StudentProfileSnapshot;
}) {
  const [selThread, setSelThread] = useState<ActionThreadRecord | null>(
    initialProfile.selThread,
  );
  const [ivThread, setIvThread] = useState<ActionThreadRecord | null>(
    initialProfile.ivThread,
  );
  const [drawerMode, setDrawerMode] = useState<"sel" | "iv" | null>(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInPoint | null>(null);
  const [selectedNode, setSelectedNode] = useState<MasteryNode | null>(null);
  const [zoom, setZoom] = useState<MasteryZoom>("day");
  const [filter, setFilter] = useState<MasteryFilter>("both");

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-8 text-[#f6f1ea]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8892b0]">
            {initialProfile.className} · {initialProfile.packLabel}
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-serif-display)" }}
          >
            {initialProfile.firstName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/s/${initialProfile.currentPathToken}`}
            data-testid="view-current-blocks"
            className="rounded-full bg-[#58b6fa] px-4 py-2 text-xs font-bold text-black hover:opacity-90"
          >
            View Current Blocks ↗
          </Link>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-[#f6f1ea] hover:bg-white/10"
          >
            ← Room
          </Link>
        </div>
      </header>

      <section className="rounded-[24px] border border-white/10 bg-[#111728] p-6">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8892b0]">
          SEL · Social-Emotional Learning
        </p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.2fr)]">
          <ProfileRadar zones={initialProfile.zones} />
          <div className="hidden bg-white/10 lg:block" aria-hidden="true" />
          <CheckInTrend
            checkins={initialProfile.checkins}
            selectedId={selectedCheckIn?.id ?? null}
            onSelect={(pt) => {
              setSelectedCheckIn(pt);
              setDrawerMode("sel");
            }}
          />
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-[#111728] p-6">
        <MasteryChart
          events={initialProfile.events}
          zoom={zoom}
          filter={filter}
          onZoom={setZoom}
          onFilter={setFilter}
          onSelectNode={(node) => {
            setSelectedNode(node);
            setDrawerMode("iv");
          }}
        />
      </section>

      <ProfileDrawer
        mode={drawerMode}
        studentId={initialProfile.studentId}
        firstName={initialProfile.firstName}
        selectedCheckIn={selectedCheckIn}
        selectedNode={selectedNode}
        selThread={selThread}
        ivThread={ivThread}
        onClose={() => setDrawerMode(null)}
        onThreadUpdated={(thread) => {
          if (thread.kind === "sel") setSelThread(thread);
          else setIvThread(thread);
        }}
      />
    </main>
  );
}
