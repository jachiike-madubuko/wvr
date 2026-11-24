import { NextResponse } from "next/server";
import {
  COLLECTIBLE_BY_ID,
  loadoutFromCollectibles,
  validateCollectibleAction,
} from "@/lib/collectibles/catalog";
import { saveStudentCollectible } from "@/lib/student-path/data";

export const dynamic = "force-dynamic";

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

  const parsed = validateCollectibleAction(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const item = COLLECTIBLE_BY_ID.get(parsed.data.itemId);
  if (!item) {
    return NextResponse.json({ error: "UNKNOWN_ITEM" }, { status: 400 });
  }

  try {
    const items = await saveStudentCollectible({
      plainToken: token,
      studentId: parsed.data.studentId,
      action: parsed.data.action,
      itemId: item.id,
      slot: item.slot,
      milestoneId: item.milestoneId,
      // Always persist the catalog default server-side; never store untrusted client free-text.
      recallNote: item.defaultRecallNote,
    });

    if (!items) {
      return NextResponse.json({ error: "PATH_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      items,
      equipped: loadoutFromCollectibles(items),
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : "";
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message)
        : "";

    if (code === "40001" || message.includes("collectible not unlocked")) {
      return NextResponse.json(
        { error: "COLLECTIBLE_NOT_UNLOCKED" },
        { status: 409 },
      );
    }
    if (message.includes("student not on this class")) {
      return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "COLLECTIBLE_SAVE_FAILED" },
      { status: 400 },
    );
  }
}
