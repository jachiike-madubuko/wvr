import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { MasteryChart } from "./MasteryChart";
import { profileFixture, type MasteryFilter, type MasteryNode } from "./profile-fixture";

function Harness({ onSelectNode = () => undefined }: { onSelectNode?: (node: MasteryNode) => void }) {
  const [filter, setFilter] = useState<MasteryFilter>("struggles");
  const nodes = profileFixture("stu_jordan")!.mastery.day;
  return (
    <MasteryChart
      nodes={nodes}
      zoom="day"
      filter={filter}
      selectedId={null}
      onZoom={() => undefined}
      onFilter={setFilter}
      onSelectNode={onSelectNode}
    />
  );
}

test("struggles keeps the dip and strengths fades it", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const dip = screen.getByRole("button", { name: "Science" });
  expect(dip).toHaveStyle({ opacity: "1" });
  await user.click(screen.getByRole("button", { name: "Strengths" }));
  expect(screen.getByRole("button", { name: "Science" })).toHaveStyle({ opacity: "0.25" });
});

test("hovering a node shows its tooltip and the pills are gone", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.hover(screen.getByRole("button", { name: "Science" }));
  expect(screen.getByRole("tooltip")).toHaveTextContent("Matched the wrong planet");
  expect(screen.getAllByRole("button", { name: "Hook" })).toHaveLength(1);
});

test("a mouse click does not pin the tooltip after the pointer leaves", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const dip = screen.getByRole("button", { name: "Science" });
  await user.click(dip);
  await user.unhover(dip);
  expect(screen.queryByRole("tooltip")).toBeNull();
});

test("a focused node shows its tooltip, opens on Enter and Space, and hides on blur", async () => {
  const onSelectNode = vi.fn();
  const user = userEvent.setup();
  render(<Harness onSelectNode={onSelectNode} />);
  const strength = screen.getByRole("button", { name: "Hook" });
  act(() => strength.focus());
  expect(screen.getByRole("tooltip")).toHaveTextContent("Strength.");
  expect(strength).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
  await user.keyboard("{Enter}");
  await user.keyboard(" ");
  expect(onSelectNode).toHaveBeenCalledTimes(2);
  const dip = screen.getByRole("button", { name: "Science" });
  await user.hover(dip);
  expect(screen.getByRole("tooltip")).toHaveTextContent("Matched the wrong planet");
  expect(strength).toHaveAttribute("data-active", "true");
  await user.unhover(dip);
  expect(screen.getByRole("tooltip")).toHaveTextContent("Strength.");
  act(() => strength.blur());
  expect(screen.queryByRole("tooltip")).toBeNull();
});
