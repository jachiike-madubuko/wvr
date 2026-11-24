import type { PaceBand, PaceCalendarBlock, PacePin, PaceSession } from "@/domain/pace/pace";

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
