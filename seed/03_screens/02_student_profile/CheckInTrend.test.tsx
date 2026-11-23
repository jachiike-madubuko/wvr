import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { CheckInTrend } from "./CheckInTrend";
import { profileFixture } from "./profile-fixture";

test("each check-in is a named button that selects its point", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <CheckInTrend
      points={profileFixture("stu_jordan")!.checkIns}
      selectedId={null}
      onSelect={onSelect}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Day 1 · 10-23 · am · Mixed" }));
  expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ day: "Day 1", slot: "am" }));
});
