import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { selectVisibleTicks } from "@/components/charts/x-axis";
import { CheckInTrend } from "@/components/room/profile/CheckInTrend";
import { MasteryChart } from "@/components/room/profile/MasteryChart";
import { ProfileDrawer } from "@/components/room/profile/ProfileDrawer";
import {
  buildCheckInSeries,
  buildMasteryNodes,
  buildOfflineCoachingPlan,
  buildWeaverWheel,
  validateThreadRequest,
} from "@/lib/students/model";

test("buildWeaverWheel returns 5 canonical zones with 0-100 scores", () => {
  const zones = buildWeaverWheel([
    { itemId: "hard", optionId: "keeps" },
    { itemId: "partner", optionId: "pairs" },
  ]);
  expect(zones).toHaveLength(5);
  expect(zones.map((z) => z.label)).toEqual([
    "Emotional Reg",
    "Focus",
    "Engagement",
    "Task Completion",
    "Social",
  ]);
  for (const z of zones) {
    expect(z.score).toBeGreaterThanOrEqual(0);
    expect(z.score).toBeLessThanOrEqual(100);
  }
});

test("buildCheckInSeries groups AM/PM check-ins and flags low-level dips", () => {
  const series = buildCheckInSeries([
    { date: "2026-11-23", period: "am", mood: "focused", level: 4, teacherNote: "Ready" },
    { date: "2026-11-23", period: "pm", mood: "frustrated", level: 2, teacherNote: "Needed tiles" },
  ]);
  expect(series.rows).toHaveLength(1);
  expect(series.rows[0]?.am).toBeCloseTo(0.75, 2);
  expect(series.rows[0]?.pm).toBeCloseTo(0.25, 2);
  expect(series.points.find((p) => p.period === "pm")?.isDip).toBe(true);
});

test("buildMasteryNodes flags struggling or >=3 attempts as struggle and supports zoom & filter", () => {
  const events = [
    {
      id: "ev-1",
      blockId: "hook",
      subject: "hook",
      attempts: 1,
      durationSec: 95,
      status: "completed" as const,
      errorLog: [],
      createdAt: "2026-11-23T15:00:00Z",
    },
    {
      id: "ev-2",
      blockId: "check_1",
      subject: "math",
      attempts: 4,
      durationSec: 240,
      status: "struggling" as const,
      errorLog: ["unequal parts"],
      createdAt: "2026-11-23T15:10:00Z",
    },
  ];

  const allDay = buildMasteryNodes(events, "day", "both");
  expect(allDay).toHaveLength(2);
  expect(allDay[0]?.kind).toBe("strength");
  expect(allDay[1]?.kind).toBe("struggle");
  expect(allDay[1]?.misconception).toBe("unequal parts");

  const strugglesOnly = buildMasteryNodes(events, "day", "struggles");
  expect(strugglesOnly.find((n) => n.id === "ev-1")?.dimmed).toBe(true);
  expect(strugglesOnly.find((n) => n.id === "ev-2")?.dimmed).toBe(false);

  const weekView = buildMasteryNodes(events, "week", "both");
  expect(weekView).toHaveLength(1);
});

test("buildOfflineCoachingPlan returns 3 offline physical teacher steps", () => {
  const plan = buildOfflineCoachingPlan({
    firstName: "Maya",
    misconception: "unequal parts",
    guidance: "Use paper strips",
  });
  expect(plan.steps).toHaveLength(3);
  expect(plan.steps[0]).toContain("Manipulative Check");
  expect(plan.steps[1]).toContain("Partner Scaffolding");
  expect(plan.steps[2]).toContain("Quick Check");
  expect(plan.steps.join(" ")).toContain("Maya");
});

test("buildOfflineCoachingPlan falls back cleanly to static rules on simulated LLM API 500 / timeout", () => {
  const plan = buildOfflineCoachingPlan({
    firstName: "Pulsar",
    misconception: "Simulated LLM API 500 / Timeout trigger",
  });
  expect(plan.misconception).toContain("Rule-based fallback active");
  expect(plan.steps).toHaveLength(3);
  expect(plan.steps.join(" ")).toContain("Static Fallback");
  expect(plan.steps.join(" ")).toContain("Pulsar");
});

test("validateThreadRequest blocks PII via scanForPii and accepts clean teacher notes", () => {
  const pii = validateThreadRequest({
    kind: "sel",
    message: "Email maya.parent@example.com about today",
  });
  expect(pii).toEqual({ ok: false, status: 422, error: "PII_BLOCKED" });

  const clean = validateThreadRequest({
    kind: "sel",
    message: "Check in softly at the door tomorrow morning.",
  });
  expect(clean.ok).toBe(true);
});

test("MasteryChart omits redundant pill button row and renders focusable SVG hit points", () => {
  const html = renderToStaticMarkup(
    createElement(MasteryChart, {
      events: [
        {
          id: "ev-1",
          blockId: "hook",
          subject: "hook",
          attempts: 1,
          durationSec: 95,
          status: "completed",
          errorLog: [],
          createdAt: "2026-11-23T15:00:00Z",
        },
        {
          id: "ev-2",
          blockId: "math",
          subject: "math",
          attempts: 4,
          durationSec: 240,
          status: "struggling",
          errorLog: ["unequal parts"],
          createdAt: "2026-11-23T15:10:00Z",
        },
      ],
      zoom: "day",
      filter: "both",
      onZoom: () => {},
      onFilter: () => {},
      onSelectNode: () => {},
    }),
  );

  // Pill buttons under the chart must not render
  expect(html).not.toMatch(/<button[^>]*data-testid="mastery-node-/);
  expect(html).not.toContain("hook (hook) · 95s");
  // SVG hit points carry testid, role="button", and tabindex="0"
  expect(html).toContain('data-testid="mastery-node-ev-1"');
  expect(html).toContain('data-testid="mastery-node-ev-2"');
  expect(html).toMatch(/<circle[^>]*role="button"[^>]*tabindex="0"[^>]*data-testid="mastery-node-ev-2"/);
});

test("CheckInTrend omits redundant pill button row and renders focusable SVG hit points", () => {
  const html = renderToStaticMarkup(
    createElement(CheckInTrend, {
      checkins: [
        { date: "2026-11-23", period: "am", mood: "focused", level: 4, teacherNote: "Ready" },
        { date: "2026-11-23", period: "pm", mood: "frustrated", level: 2, teacherNote: "Needed tiles" },
      ],
      selectedId: "2026-11-23-pm",
      onSelect: () => {},
    }),
  );

  // Pill buttons under the chart must not render
  expect(html).not.toMatch(/<button[^>]*data-testid="checkin-btn-/);
  expect(html).not.toContain("AM · focused");
  expect(html).not.toContain("PM · frustrated");
  // SVG hit points carry testid, role="button", tabindex="0", kind, and selection feedback
  expect(html).toContain('data-testid="checkin-point-2026-11-23-am"');
  expect(html).toContain('data-testid="checkin-point-2026-11-23-pm"');
  expect(html).toMatch(
    /<circle[^>]*role="button"[^>]*tabindex="0"[^>]*data-testid="checkin-point-2026-11-23-pm"[^>]*data-kind="dip"[^>]*data-flagged="true"/,
  );
});

test("ProfileDrawer preserves rule-based fallback plan when misconception carries fallback suffix", () => {
  const focus = "Simulated LLM API 500 / Timeout trigger";
  const fallbackPlan = buildOfflineCoachingPlan({
    firstName: "Pulsar",
    misconception: focus,
  });

  const html = renderToStaticMarkup(
    createElement(ProfileDrawer, {
      mode: "iv",
      studentId: "11111111-1111-4111-8111-111111111111",
      firstName: "Pulsar",
      selectedCheckIn: null,
      selectedNode: {
        id: "ev-pulsar",
        label: "math (math)",
        subject: "math",
        durationSec: 210,
        attempts: 4,
        kind: "struggle",
        misconception: focus,
        dimmed: false,
        at: "2026-11-23T15:10:00Z",
      },
      selThread: null,
      ivThread: {
        kind: "iv",
        messages: [],
        approvedPlan: fallbackPlan,
        teacherApprovedAt: null,
      },
      onClose: () => {},
      onThreadUpdated: () => {},
    }),
  );

  expect(html).toContain("Rule-based fallback active");
  expect(html).toContain("Static Fallback");
});

test("selectVisibleTicks prunes clustered right-edge XAxis labels, truncates long names, and anchors edges inside bounds", () => {
  const innerWidth = 860;
  const clustered = selectVisibleTicks(
    [
      { x: 0, label: "hook (hook)" },
      { x: 390, label: "math (math)" },
      { x: 740, label: "cont_equal_halves (math)" },
      { x: 800, label: "ela (ela)" },
      { x: 825, label: "science (science)" },
      { x: 842, label: "art (art)" },
      { x: 860, label: "cont_make_ten (math)" },
    ],
    innerWidth,
  );

  expect(clustered[0]?.anchor).toBe("start");
  expect(clustered[0]?.left).toBeGreaterThanOrEqual(0);
  expect(clustered[clustered.length - 1]?.anchor).toBe("end");
  expect(clustered[clustered.length - 1]?.right).toBeLessThanOrEqual(innerWidth);
  for (const t of clustered) {
    expect(t.label.length).toBeLessThanOrEqual(16);
  }
  expect(clustered.some((t) => t.label.endsWith("…"))).toBe(true);
  for (let i = 1; i < clustered.length; i++) {
    expect(clustered[i]!.left - clustered[i - 1]!.right).toBeGreaterThanOrEqual(14);
  }

  const checkins = selectVisibleTicks(
    [
      { x: 0, label: "Nov 24" },
      { x: 240, label: "Nov 25" },
      { x: 480, label: "Nov 26" },
    ],
    480,
  );
  expect(checkins.map((t) => t.label)).toEqual(["Nov 24", "Nov 25", "Nov 26"]);
});
