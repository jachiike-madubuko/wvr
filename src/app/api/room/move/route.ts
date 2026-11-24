import { NextResponse } from "next/server";
import {
  classifyMoveError,
  moveStudentGroup,
  validateMovePayload,
} from "@/lib/room/data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = validateMovePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const version = await moveStudentGroup(parsed.data);
    return NextResponse.json({ ok: true, version });
  } catch (err) {
    const mapped = classifyMoveError(err);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
