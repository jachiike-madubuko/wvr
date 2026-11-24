import { NextResponse } from "next/server";
import { getStudentProfile } from "@/lib/students/data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await context.params;
  const profile = await getStudentProfile(studentId);
  if (!profile) {
    return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
