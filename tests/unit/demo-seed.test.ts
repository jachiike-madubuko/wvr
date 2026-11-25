import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { describe, expect, test } from "vitest";
import {
  assertSafeDemoEnv,
  clearDemoData,
  DEMO_CLASS_ID,
  DEMO_IDS,
  seedDemoProfile,
  uuidv5,
} from "@/lib/demo/seed";

const MIGRATIONS_DIR = resolve(process.cwd(), "db", "migrations");

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

describe("demo seed pipeline (UUIDv5, prod guards, idempotency, safe purge)", () => {
  test("uuidv5 produces deterministic RFC 4122 v5 UUIDs", () => {
    const a = uuidv5("weaver:student:nebula-stalled");
    const b = uuidv5("weaver:student:nebula-stalled");
    const c = uuidv5("weaver:student:astra-fast-track");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test("assertSafeDemoEnv blocks pooled URLs and production environments/hosts", () => {
    expect(() =>
      assertSafeDemoEnv({
        DATABASE_URL_UNPOOLED: "postgresql://u:p@ep-abc-pooler.us-east-2.aws.neon.tech/neondb",
      }),
    ).toThrow(/pooled/i);

    expect(() =>
      assertSafeDemoEnv({
        DATABASE_URL_UNPOOLED: "postgresql://u:p@ep-abc.us-east-2.aws.neon.tech/neondb",
        VERCEL_ENV: "production",
      }),
    ).toThrow(/production/i);

    expect(() =>
      assertSafeDemoEnv({
        DATABASE_URL_UNPOOLED: "postgresql://u:p@prod-db.example.com/neondb",
      }),
    ).toThrow(/production host/i);

    const safe = assertSafeDemoEnv({
      DATABASE_URL_UNPOOLED: "postgresql://u:p@ep-demo.us-east-2.aws.neon.tech/neondb",
    });
    expect(safe.directUrl).toContain("ep-demo");
  });

  test("double-running each profile is idempotent, profile swap cleans extras, and clear preserves real students", async () => {
    const db = await createMigratedDb();

    // 1. Run sales_walkthrough twice consecutively
    const s1 = await seedDemoProfile(db, "sales_walkthrough");
    const countsAfterFirstSales = {
      students: (await db.query<{ n: number }>("select count(*)::int as n from public.students")).rows[0]!.n,
      events: (await db.query<{ n: number }>("select count(*)::int as n from public.block_events")).rows[0]!.n,
      checkins: (await db.query<{ n: number }>("select count(*)::int as n from public.student_sel_checkins")).rows[0]!.n,
      collectibles: (await db.query<{ n: number }>("select count(*)::int as n from public.student_collectibles")).rows[0]!.n,
    };
    const s2 = await seedDemoProfile(db, "sales_walkthrough");
    const countsAfterSecondSales = {
      students: (await db.query<{ n: number }>("select count(*)::int as n from public.students")).rows[0]!.n,
      events: (await db.query<{ n: number }>("select count(*)::int as n from public.block_events")).rows[0]!.n,
      checkins: (await db.query<{ n: number }>("select count(*)::int as n from public.student_sel_checkins")).rows[0]!.n,
      collectibles: (await db.query<{ n: number }>("select count(*)::int as n from public.student_collectibles")).rows[0]!.n,
    };

    expect(s1.studentCount).toBe(8);
    expect(s2.studentCount).toBe(8);
    expect(countsAfterSecondSales).toEqual(countsAfterFirstSales);
    expect(s2.studentIds.pulsar).toBe(DEMO_IDS.students.pulsar);

    // 2. Insert a real (is_demo = false) student before switching profiles
    const realId = "99999999-9999-4999-8999-999999999901";
    await db.query(
      "insert into public.students (id, class_id, first_name, sort_key, is_demo) values ($1, $2, 'Sam', 99, false)",
      [realId, DEMO_CLASS_ID],
    );

    // 3. Switch to interactive_onboarding twice consecutively
    await seedDemoProfile(db, "interactive_onboarding");
    await seedDemoProfile(db, "interactive_onboarding");

    const onboardingRows = (
      await db.query<{ id: string; first_name: string; is_demo: boolean }>(
        "select id, first_name, is_demo from public.students order by sort_key",
      )
    ).rows;
    expect(onboardingRows.filter((r) => r.is_demo).map((r) => r.first_name)).toEqual([
      "Nebula",
      "Maya",
      "Cosmo",
      "Astra",
    ]);
    expect(onboardingRows.some((r) => r.first_name === "Pulsar")).toBe(false);
    expect(onboardingRows.some((r) => r.id === realId && !r.is_demo)).toBe(true);

    // 4. Clear Demo Data removes strictly is_demo = true rows while preserving real student
    const cleared = await clearDemoData(db);
    expect(cleared.deletedStudents).toBe(4);
    expect(cleared.preservedRealStudents).toBe(1);

    const remaining = (
      await db.query<{ id: string; first_name: string; is_demo: boolean }>(
        "select id, first_name, is_demo from public.students",
      )
    ).rows;
    expect(remaining).toEqual([{ id: realId, first_name: "Sam", is_demo: false }]);

    // 5. Analytics events logged with is_demo = true
    const analytics = (
      await db.query<{ name: string; is_demo: boolean }>(
        "select name, is_demo from public.events order by id",
      )
    ).rows;
    expect(analytics.length).toBeGreaterThanOrEqual(4);
    expect(analytics.every((a) => a.is_demo)).toBe(true);
  });
});
