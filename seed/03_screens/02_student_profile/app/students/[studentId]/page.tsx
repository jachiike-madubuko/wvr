import type { Metadata } from "next";
import { StudentProfileRoom } from "@/components/room/StudentProfileRoom";

export const metadata: Metadata = { title: "Student · Weavr" };

export default async function StudentRoomPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <StudentProfileRoom studentId={studentId} />;
}
