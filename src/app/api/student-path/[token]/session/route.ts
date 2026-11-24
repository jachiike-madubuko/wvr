import { NextResponse } from "next/server";
import { saveStudentPathSession } from "@/lib/student-path/data";
import { buildSessionPayload } from "@/lib/student-path/deck";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const studentId = typeof raw.studentId === "string" ? raw.studentId : "";
  if (!UUID_RE.test(studentId)) {
    return NextResponse.json({ error: "INVALID_STUDENT" }, { status: 400 });
  }

  const sanitized = buildSessionPayload({
    completedBlockIds: raw.completedBlockIds,
    blockMs: raw.blockMs,
    blockEvents: raw.blockEvents,
  });

  try {
    const progress = await saveStudentPathSession({
      plainToken: token,
      studentId,
      progress: sanitized,
    });
    if (!progress) {
      return NextResponse.json({ error: "PATH_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, progress });
  } catch {
    return NextResponse.json({ error: "SESSION_SAVE_FAILED" }, { status: 400 });
  }
}
