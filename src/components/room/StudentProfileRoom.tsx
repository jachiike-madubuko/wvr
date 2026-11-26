"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentAvatarHalo } from "@/components/avatars/StudentAvatar";
import { weaverConfig } from "@/domain/config/weaver-config";
import { PACK_COLORS } from "@/lib/room/types";
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

function useLiveProfile(initial: StudentProfileSnapshot): StudentProfileSnapshot {
  const [profile, setProfile] = useState<StudentProfileSnapshot>(initial);

  useEffect(() => {
    setProfile(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const refresh = async () => {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/students/${initial.studentId}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const fresh = (await res.json()) as StudentProfileSnapshot;
        if (!cancelled) setProfile(fresh);
      } catch {
        // Ignore transient background refresh failures.
      } finally {
        inFlight = false;
      }
    };

    const id = window.setInterval(
      () => void refresh(),
      weaverConfig.alerts.latencyTargetMs,
    );
    const onFocus = () => void refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [initial.studentId]);

  return profile;
}

export function StudentProfileRoom({
  initialProfile,
}: {
  initialProfile: StudentProfileSnapshot;
}) {
  const profile = useLiveProfile(initialProfile);
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
        <div className="flex items-center gap-4">
          <StudentAvatarHalo
            seed={profile.studentId}
            equipped={profile.equipped}
            ringColor={PACK_COLORS[profile.packId] ?? "#38bdf8"}
            size="md"
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8892b0]">
              {profile.className} · {profile.packLabel}
            </p>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "var(--font-serif-display)" }}
            >
              {profile.firstName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/s/${profile.currentPathToken}`}
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
          <ProfileRadar zones={profile.zones} />
          <div className="hidden bg-white/10 lg:block" aria-hidden="true" />
          <CheckInTrend
            checkins={profile.checkins}
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
          events={profile.events}
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
        studentId={profile.studentId}
        firstName={profile.firstName}
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
