import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AlertMark } from "@/components/room/AlertMark";
import { evaluateStudent } from "@/domain/alerts/rules";
import { weaverConfig } from "@/domain/config/weaver-config";
import { generateSimulation, type SimBlock } from "@/lib/demo/simulate";

const SAMPLE_BLOCKS: SimBlock[] = [
  { blockId: "hook", subject: "hook" },
  { blockId: "ela", subject: "ela" },
  { blockId: "art", subject: "art" },
  { blockId: "math", subject: "math" },
  { blockId: "science", subject: "science" },
];

test("evaluateStudent detects high_attempts, over_time, fast_student, and respects config overrides", () => {
  // attempts == highAttempts -> high_attempts
  expect(
    evaluateStudent([
      {
        id: "ev-1",
        attempts: weaverConfig.alerts.highAttempts,
        durationSec: 45,
        status: "struggling",
        createdAt: "2026-11-26T15:00:00Z",
      },
    ]),
  ).toEqual({
    kind: "high_attempts",
    blockEventId: "ev-1",
    detail: "3 tries",
  });

  // durationSec == overTimeSec -> over_time
  expect(
    evaluateStudent([
      {
        id: "ev-2",
        attempts: 1,
        durationSec: weaverConfig.alerts.overTimeSec,
        status: "completed",
        createdAt: "2026-11-26T15:00:00Z",
      },
    ]),
  ).toEqual({
    kind: "over_time",
    blockEventId: "ev-2",
    detail: "3 min",
  });

  // 3 fast first-try events -> fast_student
  const fastEvents = [
    { id: "f1", attempts: 1, durationSec: 8, status: "completed", createdAt: "2026-11-26T15:01:00Z" },
    { id: "f2", attempts: 1, durationSec: 10, status: "completed", createdAt: "2026-11-26T15:02:00Z" },
    { id: "f3", attempts: 1, durationSec: 12, status: "completed", createdAt: "2026-11-26T15:03:00Z" },
  ];
  expect(evaluateStudent(fastEvents)).toEqual({
    kind: "fast_student",
    blockEventId: "f3",
    detail: "Ready for more",
  });

  // Respects fastStudentNotice = false override
  expect(
    evaluateStudent(fastEvents, { ...weaverConfig.alerts, fastStudentNotice: false }),
  ).toBeNull();

  // Normal completed events -> null
  expect(
    evaluateStudent([
      { id: "n1", attempts: 2, durationSec: 120, status: "completed", createdAt: "2026-11-26T15:00:00Z" },
    ]),
  ).toBeNull();

  // Config override: raising highAttempts above 3 suppresses alert at 3 tries
  expect(
    evaluateStudent(
      [{ id: "ov1", attempts: 3, durationSec: 60, status: "completed", createdAt: "2026-11-26T15:00:00Z" }],
      { ...weaverConfig.alerts, highAttempts: 5 },
    ),
  ).toBeNull();
});

test("struggling simulation evaluates to high_attempts and fast simulation evaluates to fast_student", () => {
  const now = Date.now();

  const strugglingEvents = generateSimulation("struggling", SAMPLE_BLOCKS).map((e, i) => ({
    id: `sim-s-${i}`,
    attempts: e.attempts,
    durationSec: e.durationSec,
    status: e.status,
    createdAt: new Date(now - e.secondsAgo * 1000).toISOString(),
  }));
  const strugglingAlert = evaluateStudent(strugglingEvents);
  expect(strugglingAlert?.kind).toBe("high_attempts");

  const fastEvents = generateSimulation("fast", SAMPLE_BLOCKS).map((e, i) => ({
    id: `sim-f-${i}`,
    attempts: e.attempts,
    durationSec: e.durationSec,
    status: e.status,
    createdAt: new Date(now - e.secondsAgo * 1000).toISOString(),
  }));
  const fastAlert = evaluateStudent(fastEvents);
  expect(fastAlert?.kind).toBe("fast_student");
});

test("AlertMark links to /students/<id>?alert=<blockEventId> with accessible labels", () => {
  const struggleHtml = renderToStaticMarkup(
    createElement(AlertMark, {
      studentId: "stu-123",
      alert: { kind: "high_attempts", blockEventId: "ev-999", detail: "10 tries" },
    }),
  );
  expect(struggleHtml).toContain('href="/students/stu-123?alert=ev-999"');
  expect(struggleHtml).toContain('data-testid="alert-mark-stu-123"');
  expect(struggleHtml).toContain('data-alert-kind="high_attempts"');
  expect(struggleHtml).toContain('aria-label="Needs help: 10 tries"');
  expect(struggleHtml).toContain(">!<");

  const fastHtml = renderToStaticMarkup(
    createElement(AlertMark, {
      studentId: "stu-456",
      alert: { kind: "fast_student", blockEventId: "ev-777", detail: "Ready for more" },
    }),
  );
  expect(fastHtml).toContain('href="/students/stu-456?alert=ev-777"');
  expect(fastHtml).toContain('data-alert-kind="fast_student"');
  expect(fastHtml).toContain('aria-label="Ready for more: Ready for more"');
  expect(fastHtml).toContain(">↑<");
});
