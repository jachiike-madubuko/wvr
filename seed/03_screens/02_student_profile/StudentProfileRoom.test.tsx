import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { StudentProfileRoom } from "./StudentProfileRoom";

vi.mock("@/components/room/profile/profile-fixture", async () => {
  const actual = await vi.importActual<typeof import("@/components/room/profile/profile-fixture")>(
    "@/components/room/profile/profile-fixture",
  );
  return { ...actual, INTERVENTION_MS: 0 };
});

const profile = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock("@/components/class/useStudentProfile", () => ({
  useStudentProfile: () => profile.value,
}));

beforeEach(() => {
  profile.value = {
    source: "local",
    student: {
      id: "stu_jordan",
      firstName: "Jordan",
      interests: ["pack_basketball"],
    },
    log: { includeInAgentCompile: false, entries: [] },
  };
});

test("Jordan opens a mood chat and a local intervention", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const user = userEvent.setup();
  render(<StudentProfileRoom studentId="stu_jordan" />);

  expect(screen.getByText("Student profile")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Jordan" })).toBeInTheDocument();
  expect(screen.queryByText("Running log")).toBeNull();
  expect(screen.queryByText("Time on block")).toBeNull();

  await user.click(await screen.findByRole("button", { name: "Day 1 · 10-23 · am · Mixed" }));
  expect(screen.getByText("Use past notes")).toBeInTheDocument();
  expect(screen.getByText(/not in this chat/i)).toBeInTheDocument();
  expect(screen.queryByText("Defiance")).toBeNull();
  expect(screen.queryByText("Focus Drop")).toBeNull();
  expect(screen.queryByText("Math Opposition")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Close panel" }));
  await user.click(screen.getByRole("button", { name: "Science" }));
  const detail = screen.getByRole("dialog");
  expect(within(detail).getByText("Matched the wrong planet")).toBeInTheDocument();
  expect(within(detail).getByText("4 attempts")).toBeInTheDocument();
  expect(within(detail).getByText("210 seconds")).toBeInTheDocument();
  await user.click(within(detail).getByRole("button", { name: "Generate targeted intervention" }));
  expect(within(screen.getByRole("dialog")).getByText("What the kid sees")).toBeInTheDocument();
  expect(screen.queryByText(/How much flour/)).toBeNull();
  await user.click(screen.getByRole("button", { name: /Quick check/i }));
  expect(screen.getByText(/How much flour/)).toBeInTheDocument();
  expect(screen.getByText("12 cups")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Approve" }));
  await user.click(screen.getByRole("button", { name: "Publish" }));
  expect(screen.getByText("Intervention sent to Jordan")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Science" }));
  expect(within(screen.getByRole("dialog")).getByText("Intervention sent")).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
}, 15_000);

test("Avery gets a chart that is not Jordan's dip", async () => {
  profile.value = {
    source: "local",
    student: { id: "stu_avery", firstName: "Avery", interests: [] },
    log: { includeInAgentCompile: false, entries: [] },
  };
  render(<StudentProfileRoom studentId="stu_avery" />);
  await waitFor(() => {
    expect(screen.queryAllByRole("button", { name: /^Day 1 · / }).length).toBeGreaterThan(0);
  });
  expect(screen.queryByText("Focus (40)")).toBeNull();
});
