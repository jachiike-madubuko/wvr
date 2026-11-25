import { NextResponse } from "next/server";
import { withUnpooledAdminDb } from "@/lib/db";
import {
  assertSafeDemoEnv,
  clearDemoData,
  isDemoProfile,
  seedDemoProfile,
} from "@/lib/demo/seed";
import { getRoomSnapshot } from "@/lib/room/data";

export const dynamic = "force-dynamic";

type DemoRequest =
  | { action: "switch" | "reset"; profile: "sales_walkthrough" | "interactive_onboarding" }
  | { action: "clear" };

function parseDemoRequest(input: unknown): DemoRequest | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  if (raw.action === "clear") return { action: "clear" };
  if (
    (raw.action === "switch" || raw.action === "reset") &&
    isDemoProfile(raw.profile)
  ) {
    return { action: raw.action, profile: raw.profile };
  }
  return null;
}

export async function GET() {
  try {
    const room = await getRoomSnapshot();
    return NextResponse.json({
      demoProfile: room.demoProfile,
      hasDemoData: room.hasDemoData,
      demoStudentCount: room.demoStudentCount,
      realStudentCount: room.realStudentCount,
    });
  } catch {
    return NextResponse.json({ error: "DEMO_STATUS_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = parseDemoRequest(body);
  if (!parsed) {
    return NextResponse.json({ error: "INVALID_DEMO_REQUEST" }, { status: 400 });
  }

  let env: { directUrl: string; teacherId: string };
  try {
    env = assertSafeDemoEnv(process.env);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DEMO_ENV_BLOCKED" },
      { status: 403 },
    );
  }

  try {
    const result = await withUnpooledAdminDb(async (client) => {
      if (parsed.action === "clear") {
        return clearDemoData(client, { teacherId: env.teacherId });
      }
      return seedDemoProfile(client, parsed.profile, {
        teacherId: env.teacherId,
        reset: parsed.action === "reset",
      });
    }, env.directUrl);

    const room = await getRoomSnapshot();
    return NextResponse.json({ ok: true, result, room });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DEMO_MUTATION_FAILED" },
      { status: 500 },
    );
  }
}
