import { NextResponse } from "next/server";
import {
  getWheelScores,
  saveWheelScores,
  WheelVersionConflict,
} from "@/lib/students/data";
import { validateWheelSaveRequest } from "@/lib/students/wheel";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studentId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { studentId } = await ctx.params;
  try {
    const wheel = await getWheelScores(studentId);
    if (wheel === "not_found") {
      return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ wheel });
  } catch {
    return NextResponse.json({ error: "WHEEL_LOAD_FAILED" }, { status: 500 });
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const { studentId } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = validateWheelSaveRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  try {
    const wheel = await saveWheelScores(studentId, parsed.data);
    if (!wheel) {
      return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, wheel });
  } catch (err) {
    if (err instanceof WheelVersionConflict) {
      return NextResponse.json({ error: "VERSION_CONFLICT" }, { status: 409 });
    }
    throw err;
  }
}
