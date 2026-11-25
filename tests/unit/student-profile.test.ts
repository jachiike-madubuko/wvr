import { expect, test } from "vitest";
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
