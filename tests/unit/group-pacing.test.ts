import { expect, test } from "vitest";
import { groupPacing } from "@/components/room/group-pacing";

test("groupPacing aggregates band counts/percents and sorts most-behind first", () => {
  const res = groupPacing(
    [
      {
        id: "s1",
        firstName: "Astra",
        packId: "pack_space",
        paceBand: "ahead",
        subjectWeeks: { math: 2, ela: 1 },
      },
      {
        id: "s2",
        firstName: "Nebula",
        packId: "pack_space",
        paceBand: "behind",
        subjectWeeks: { math: -2, ela: -1 },
      },
      {
        id: "s3",
        firstName: "Cosmo",
        packId: "pack_space",
        paceBand: "on",
        subjectWeeks: { math: 0, ela: 0 },
      },
      {
        id: "s4",
        firstName: "Maya",
        packId: "pack_space",
        paceBand: "behind",
        subjectWeeks: { math: -1, science: 1 },
      },
      {
        id: "s5",
        firstName: "Leo",
        packId: "pack_cooking",
        paceBand: "on",
        subjectWeeks: { math: 0 },
      },
    ],
    "pack_space",
  );

  expect(res.total).toBe(4);
  expect(res.counts).toEqual({ ahead: 1, on: 1, behind: 2 });
  expect(res.percents).toEqual({ ahead: 25, on: 25, behind: 50 });
  expect(res.students.map((s) => s.firstName)).toEqual([
    "Nebula",
    "Maya",
    "Cosmo",
    "Astra",
  ]);
  expect(res.students[0]).toMatchObject({
    firstName: "Nebula",
    worstSubject: "math",
    worstWeeks: -2,
  });
  expect(res.students[3]).toMatchObject({
    firstName: "Astra",
    worstSubject: "ela",
    worstWeeks: 1,
  });
});

test("groupPacing handles an empty group cleanly", () => {
  const res = groupPacing([], "pack_fashion");
  expect(res).toEqual({
    packId: "pack_fashion",
    total: 0,
    counts: { ahead: 0, on: 0, behind: 0 },
    percents: { ahead: 0, on: 0, behind: 0 },
    students: [],
  });
});
