import { BlockFlip } from "@/components/student-path/BlockFlip";
import { openStudentPath } from "@/lib/student-path/data";

export const dynamic = "force-dynamic";

export default async function StudentPathPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await openStudentPath(token);

  if (!data) {
    return (
      <main
        data-testid="invalid-path-link"
        className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center text-[#f6f1ea]"
      >
        <h1 className="text-2xl font-bold">Lesson link unavailable</h1>
        <p className="text-sm text-[#8892b0]">
          This link is invalid or has expired. Ask your teacher for a fresh link.
        </p>
      </main>
    );
  }

  return (
    <BlockFlip
      token={token}
      payload={data.payload}
      initialCompletedIds={data.progress.completedBlockIds ?? []}
      roster={data.roster}
      initialCollectiblesByStudent={data.collectiblesByStudent}
    />
  );
}
