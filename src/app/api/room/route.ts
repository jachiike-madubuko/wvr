import { NextResponse } from "next/server";
import { getRoomSnapshot } from "@/lib/room/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const room = await getRoomSnapshot();
    return NextResponse.json(room);
  } catch {
    return NextResponse.json({ error: "ROOM_LOAD_FAILED" }, { status: 500 });
  }
}
