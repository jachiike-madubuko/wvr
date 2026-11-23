"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ActionChatPanel } from "@/components/class/ActionChatPanel";
import { useStudentProfile } from "@/components/class/useStudentProfile";
import { CheckInTrend } from "@/components/room/profile/CheckInTrend";
import { MasteryChart } from "@/components/room/profile/MasteryChart";
import { MasteryDetailCard } from "@/components/room/profile/MasteryDetailCard";
import { buildInterventionRequest } from "@/components/room/profile/intervention-request";
import {
  nextInterventionPhase,
  publishEnabled,
  type InterventionPhase,
} from "@/components/room/profile/intervention-phase";
import { ProfileDrawer } from "@/components/room/profile/ProfileDrawer";
import { ProfileRadar } from "@/components/room/profile/ProfileRadar";
import {
  INTERVENTION_MS,
  moodChatCfg,
  profileFixture,
  type CheckInPoint,
  type MasteryFilter,
  type MasteryNode,
  type MasteryZoom,
} from "@/components/room/profile/profile-fixture";
import {
  type ActionChatBubble,
  cannedReply,
} from "@/lib/classroom/action-chat";

export function StudentProfileRoom({ studentId }: { studentId: string }) {
  const profile = useStudentProfile(studentId);
  const fixture = profileFixture(studentId, profile.student?.firstName);
  const [checkIn, setCheckIn] = useState<CheckInPoint | null>(null);
  const [drawer, setDrawer] = useState<"chat" | "mastery" | "intervention" | null>(null);
  const [usePastNotes, setUsePastNotes] = useState(false);
  const [messages, setMessages] = useState<ActionChatBubble[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MasteryZoom>("day");
  const [spanId, setSpanId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MasteryFilter>("both");
  const [node, setNode] = useState<MasteryNode | null>(null);
  const [phase, setPhase] = useState<InterventionPhase>("idle");
  const [guidanceDraft, setGuidanceDraft] = useState("");
  const [appliedGuidance, setAppliedGuidance] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "generating") return;
    const timer = setTimeout(() => setPhase("ready"), INTERVENTION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  if (profile.source === "loading") {
    return (
      <main className="wv-page">
        <p className="wv-note">Opening profile…</p>
      </main>
    );
  }
  if (!profile.student) {
    return (
      <main className="wv-page">
        <p className="wv-subtitle">That student is not on this class list.</p>
        <Link href="/" className="wv-link">
          Room 204
        </Link>
      </main>
    );
  }

  const firstName = profile.student.firstName;
  const cfg = checkIn ? moodChatCfg(firstName, checkIn) : null;
  const spans = fixture ? fixture.mastery[zoom] : null;
  const span = spans?.find((item) => item.id === spanId && item.blocks && item.blocks.length > 0) ?? null;
  const masteryNodes = span?.blocks ?? spans;

  function openCheckIn(point: CheckInPoint) {
    const next = moodChatCfg(firstName, point);
    setCheckIn(point);
    setNode(null);
    setDrawer("chat");
    setChatError(null);
    setDraft("");
    setMessages([{ role: "weaver", text: next.opening, label: "Weaver", steps: [] }]);
  }

  function openNode(next: MasteryNode) {
    if (!span && next.blocks && next.blocks.length > 0 && zoom !== "day") {
      setSpanId(next.id);
      setNode(null);
      setDrawer(null);
      return;
    }
    setNode(next);
    setCheckIn(null);
    setPhase((p) => (p === "idle" || p === "compose" ? "ready" : p));
    setDrawer("mastery");
  }

  async function sendMood(text?: string) {
    if (!checkIn || !cfg || busy) return;
    const message = (text ?? draft).trim();
    if (!message) return;
    const teacher: ActionChatBubble = {
      role: "teacher",
      text: message,
      label: null,
      steps: [],
    };
    const prior = [...messages, teacher];
    setMessages(prior);
    setDraft("");
    setChatError(null);
    if (profile.source !== "remote") {
      const reply = cannedReply(
        cfg,
        prior.filter((m) => m.role === "teacher").length - 1,
      );
      setMessages([
        ...prior,
        {
          role: "weaver",
          text: reply.text,
          label: reply.label ?? "Weaver",
          steps: reply.steps ?? [],
        },
      ]);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/class/students/${studentId}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "sel",
        message,
        ephemeral: true,
        usePastNotes,
        mood: { day: checkIn.day, date: checkIn.date, label: checkIn.label },
        transcript: messages,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      bubble?: ActionChatBubble;
    } | null;
    setBusy(false);
    if (!data?.ok || !data.bubble) {
      setChatError(data?.error ?? "Weaver could not draft a reply.");
      return;
    }
    setMessages([...prior, data.bubble]);
  }

  function generate() {
    const error = node?.detail?.summary;
    if (error) setGuidanceDraft((current) => current || error);
    setDrawer("intervention");
    if (phase === "idle") {
      setPhase("compose");
    }
  }

  async function startGenerate() {
    const request = buildInterventionRequest(guidanceDraft);
    setAppliedGuidance(request.guidance ?? null);
    setPhase("generating");
    setDrawer("intervention");

    try {
      const res = await fetch(`/api/class/students/${studentId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "iv",
          message: guidanceDraft || "Generate a generic intervention",
          ephemeral: true,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        bubble?: ActionChatBubble;
      } | null;

      if (data?.ok && data.bubble) {
        // In a real system, we'd update the fixture's intervention preview here.
        // For now, we just confirm the generation worked.
        console.log("[weaver] intervention generated:", data.bubble);
      }
    } catch (error) {
      console.error("[weaver] generation failed:", error);
    }
  }

  function publish() {
    if (!publishEnabled(phase) || !fixture) return;
    setPhase(nextInterventionPhase(phase, "publish"));
    setDrawer(null);
    setToast(`Intervention sent to ${firstName}`);
  }

  return (
    <main className="wv-page">
      <div className="wv-head">
        <div className="wv-head-text">
          <p className="wv-kicker">Student profile</p>
          <h1 className="wv-title">{firstName}</h1>
        </div>
        <Link href="/" className="wv-btn wv-btn--outline wv-btn--sm">
          Close
        </Link>
      </div>

      <section className="wv-panel">
        <p className="wv-kicker">SEL</p>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.2fr)]">
          <ProfileRadar
            zones={fixture?.zones ?? null}
            focusCaption={fixture?.focusCaption ?? null}
          />
          <div className="hidden lg:block" style={{ background: "var(--line)" }} aria-hidden />
          <CheckInTrend
            points={fixture?.checkIns ?? null}
            selectedId={checkIn?.id ?? null}
            onSelect={openCheckIn}
          />
        </div>
      </section>

      <section className="wv-panel">
        <MasteryChart
          nodes={masteryNodes}
          zoom={zoom}
          filter={filter}
          selectedId={node?.id ?? null}
          drilledLabel={span?.label ?? null}
          onZoom={(next) => {
            setZoom(next);
            setSpanId(null);
          }}
          onZoomOut={() => setSpanId(null)}
          onFilter={setFilter}
          onSelectNode={openNode}
        />
      </section>

      <ProfileDrawer
        mode={drawer}
        title={
          drawer === "intervention"
            ? `Intervention · ${fixture?.intervention.title ?? ""}`
            : drawer === "mastery"
              ? node?.label ?? ""
              : cfg?.title ?? "Check-in"
        }
        onClose={() => setDrawer(null)}
        intervention={
          fixture
            ? {
                phase,
                preview: fixture.intervention,
                guidance: guidanceDraft,
                appliedGuidance,
                onGuidance: setGuidanceDraft,
                onGenerate: startGenerate,
                onApprove: () => setPhase((p) => nextInterventionPhase(p, "approve")),
                onUnapprove: () => setPhase((p) => nextInterventionPhase(p, "unapprove")),
                onPublish: publish,
              }
            : undefined
        }
      >
        {drawer === "mastery" && node ? (
          <MasteryDetailCard
            node={node}
            sent={phase === "sent"}
            onGenerate={generate}
          />
        ) : cfg ? (
          <ActionChatPanel
            cfg={cfg}
            messages={messages}
            draft={draft}
            onDraftChange={setDraft}
            onSend={() => void sendMood()}
            onPrompt={(label) => void sendMood(label)}
            includeInterests={false}
            showInterestToggle={false}
            contextToggle={{
              label: "Use past notes",
              checked: usePastNotes,
              onChange: setUsePastNotes,
            }}
            busy={busy}
            error={chatError}
            approvedAt={null}
            onApprove={() => undefined}
          />
        ) : null}
      </ProfileDrawer>

      {toast ? (
        <p className="wv-toast" role="status">
          {toast}
        </p>
      ) : null}
    </main>
  );
}
