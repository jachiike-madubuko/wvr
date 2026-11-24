import Link from "next/link";
import { StudentProfileRoom } from "@/components/room/StudentProfileRoom";
import { getStudentProfile } from "@/lib/students/data";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const profile = await getStudentProfile(studentId);

  if (!profile) {
    return (
      <main
        data-testid="student-not-found"
        className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center text-[#f6f1ea]"
      >
        <h1 className="text-2xl font-bold">Student not found</h1>
        <p className="text-sm text-[#8892b0]">
          That student is not on this class list.
        </p>
        <Link
          href="/"
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/10"
        >
          Back to Room
        </Link>
      </main>
    );
  }

  return <StudentProfileRoom initialProfile={profile} />;
}
