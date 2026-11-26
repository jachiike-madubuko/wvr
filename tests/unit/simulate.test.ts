import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { describe, expect, test } from "vitest";
import { POST as demoPost } from "@/app/api/demo/route";
import { isStruggleEvent, weaverConfig } from "@/domain/config/weaver-config";
import {
  clearDemoData,
  DEMO_CLASS_ID,
  DEMO_IDS,
  DEMO_PATH_PLAIN_TOKEN,
  DEMO_TEACHER_DEFAULT_ID,
  seedDemoProfile,
} from "@/lib/demo/seed";
import {
  generateSimulation,
  runDemoSimulation,
  type SimBlock,
} from "@/lib/demo/simulate";

const MIGRATIONS_DIR = resolve(process.cwd(), "db", "migrations");

const SAMPLE_BLOCKS: SimBlock[] = [
  { blockId: "hook", subject: "hook" },
  { blockId: "ela", subject: "ela" },
  { blockId: "art", subject: "art" },
  { blockId: "math", subject: "math" },
  { blockId: "science", subject: "science" },
];

async function createMigratedDb() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create schema if not exists extensions;
    create extension if not exists pgcrypto with schema extensions;
    grant usage on schema extensions to public;
    create role weavr_app nologin noinherit;
    grant usage on schema public to weavr_app;
    alter default privileges in schema public grant select, insert, update, delete on tables to weavr_app;
    set search_path to public, extensions;
  `);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

describe("demo simulation generator & DB persistence (WVR-239)", () => {
  test("fast simulation completes every block under alerts.fastSec with 1 attempt", () => {
    const events = generateSimulation("fast", SAMPLE_BLOCKS);
    expect(events).toHaveLength(SAMPLE_BLOCKS.length);
    for (const ev of events) {
      expect(ev.durationSec).toBeLessThan(weaverConfig.alerts.fastSec);
      expect(ev.attempts).toBe(1);
      expect(ev.status).toBe("completed");
      expect(ev.errorLog).toEqual([]);
      expect(isStruggleEvent(ev)).toBe(false);
    }
    // Distinct timestamps, oldest first
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!.secondsAgo).toBeLessThan(events[i - 1]!.secondsAgo);
    }
  });

  test("struggling simulation hits math with >= alerts.highAttempts and trips isStruggleEvent", () => {
    const events = generateSimulation("struggling", SAMPLE_BLOCKS);
    const mathEv = events.find((e) => e.subject === "math");
    expect(mathEv).toBeDefined();
    expect(mathEv!.attempts).toBeGreaterThanOrEqual(weaverConfig.alerts.highAttempts);
    expect(mathEv!.attempts).toBe(weaverConfig.demoSimulation.strugglingExampleAttempts);
    expect(mathEv!.status).toBe("struggling");
    expect(mathEv!.errorLog.length).toBeGreaterThan(0);
    expect(isStruggleEvent(mathEv!)).toBe(true);
  });

  test("respects config overrides (e.g. highAttempts = 12) and handles empty deck", () => {
    const events = generateSimulation("struggling", SAMPLE_BLOCKS, {
      alerts: { ...weaverConfig.alerts, highAttempts: 12 },
      demoSimulation: weaverConfig.demoSimulation,
    });
    const mathEv = events.find((e) => e.subject === "math");
    expect(mathEv!.attempts).toBeGreaterThanOrEqual(12);
    expect(generateSimulation("fast", [])).toEqual([]);
    expect(generateSimulation("struggling", [])).toEqual([]);
  });

  test("runDemoSimulation writes is_demo=true rows, Reset clears them, and non-demo students are rejected", async () => {
    const db = await createMigratedDb();
    await seedDemoProfile(db, "sales_walkthrough");

    const cosmoId = DEMO_IDS.students.cosmo;
    const beforeCount = (
      await db.query<{ n: number }>(
        "select count(*)::int as n from public.block_events where student_id = $1",
        [cosmoId],
      )
    ).rows[0]!.n;

    const sim = await runDemoSimulation(db, {
      kind: "struggling",
      studentId: cosmoId,
      plainToken: DEMO_PATH_PLAIN_TOKEN,
      teacherId: DEMO_TEACHER_DEFAULT_ID,
    });
    expect(sim.inserted).toBeGreaterThan(0);

    const afterRows = (
      await db.query<{ attempts: number; status: string; is_demo: boolean }>(
        "select attempts, status, is_demo from public.block_events where student_id = $1",
        [cosmoId],
      )
    ).rows;
    expect(afterRows.length).toBe(beforeCount + sim.inserted);
    expect(afterRows.every((r) => r.is_demo)).toBe(true);
    expect(afterRows.some((r) => r.attempts >= 10 && r.status === "struggling")).toBe(true);

    const simLedger = (
      await db.query<{ name: string; is_demo: boolean }>(
        "select name, is_demo from public.events where name = 'demo.simulation_run'",
      )
    ).rows;
    expect(simLedger).toHaveLength(1);
    expect(simLedger[0]!.is_demo).toBe(true);

    // Non-demo student is rejected fail-closed with SIMULATION_NOT_DEMO
    const realId = "99999999-9999-4999-8999-999999999911";
    await db.query(
      "insert into public.students (id, class_id, first_name, sort_key, is_demo) values ($1, $2, 'Sam', 99, false)",
      [realId, DEMO_CLASS_ID],
    );
    await expect(
      runDemoSimulation(db, {
        kind: "struggling",
        studentId: realId,
        plainToken: DEMO_PATH_PLAIN_TOKEN,
        teacherId: DEMO_TEACHER_DEFAULT_ID,
      }),
    ).rejects.toThrow("SIMULATION_NOT_DEMO");

    // Reset removes simulated rows and restores clean baseline count
    await seedDemoProfile(db, "sales_walkthrough", { reset: true });
    const resetRows = (
      await db.query<{ attempts: number; status: string }>(
        "select attempts, status from public.block_events where student_id = $1",
        [cosmoId],
      )
    ).rows;
    expect(resetRows).toHaveLength(beforeCount);
    expect(resetRows.some((r) => r.status === "struggling")).toBe(false);

    // Clear removes all demo block_events
    await clearDemoData(db);
    const afterClear = (
      await db.query<{ n: number }>(
        "select count(*)::int as n from public.block_events where is_demo = true",
      )
    ).rows[0]!.n;
    expect(afterClear).toBe(0);
  });

  test("POST /api/demo simulate returns 403 when safe demo environment guard fails", async () => {
    const prevVercelEnv = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    try {
      const req = new Request("http://localhost/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate",
          kind: "struggling",
          studentId: DEMO_IDS.students.cosmo,
          token: DEMO_PATH_PLAIN_TOKEN,
        }),
      });
      const res = await demoPost(req);
      expect(res.status).toBe(403);
    } finally {
      if (prevVercelEnv === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercelEnv;
    }
  });
});
