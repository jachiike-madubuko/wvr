import type { PaceBand, PaceCalendarBlock, PacePin, PaceSession } from "@/domain/pace/pace";
import type { EquippedLoadout } from "@/lib/collectibles/catalog";

export const PACK_COLORS: Record<string, string> = {
  pack_cooking: "#f87171",
  pack_video_games: "#60a5fa",
  pack_space: "#38bdf8",
  pack_music: "#c88dfc",
  pack_fashion: "#f472b6",
  pack_animals: "#48e29a",
};

export type RoomPack = {
  id: string;
  label: string;
  color: string;
};

export type RoomStudent = {
  id: string;
  firstName: string;
  packId: string;
  version: number;
  paceBand: PaceBand;
  subjectBands: Record<string, PaceBand>;
  currentLessonTitle: string | null;
  equipped?: EquippedLoadout;
};

export type RoomCalendarBlock = PaceCalendarBlock & {
  title: string;
  subjects: string[];
};

export type RoomSnapshot = {
  classId: string;
  className: string;
  grade: number;
  packs: RoomPack[];
  students: RoomStudent[];
  blocks: RoomCalendarBlock[];
  sessions: PaceSession[];
};

export type MoveStudentPayload = {
  studentId: string;
  toPackId: string;
  expectedVersion: number;
};
