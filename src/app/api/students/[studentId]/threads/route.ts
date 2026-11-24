import { NextResponse } from "next/server";
import { saveStudentThread } from "@/lib/students/data";
import { validateThreadRequest } from "@/lib/students/model";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = validateThreadRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const thread = await saveStudentThread(studentId, parsed.data);
  if (!thread) {
    return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, thread });
}
