import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { byId } from "@/lib/blocks/library";
import { BlockFlip } from "./BlockFlip";

test("the board drops the up next list, spans the hook, and keeps social studies one column", () => {
  render(<BlockFlip blocks={[byId("video.story"), byId("text.question")]} />);
  expect(screen.queryByText(/up next/i)).toBeNull();
  expect(screen.getByRole("button", { name: /The arcade that ran out of tokens/i })).toHaveAttribute(
    "data-span",
    "2",
  );
  const social = screen.getByRole("button", { name: /Compare with your partner/i });
  expect(social).toBeInTheDocument();
  expect(social).not.toHaveAttribute("data-span", "2");
});

test("a locked pin does not open", async () => {
  const user = userEvent.setup();
  render(<BlockFlip blocks={[byId("text.question"), byId("text.write")]} />);
  await user.click(screen.getByRole("button", { name: /Say how you added them/i }));
  expect(screen.queryByRole("button", { name: "Turn it in" })).toBeNull();
});

test("escape closes without marking the pin done", async () => {
  const user = userEvent.setup();
  render(<BlockFlip blocks={[byId("text.question")]} />);
  await user.click(screen.getByRole("button", { name: /Which shot count is right/i }));
  expect(await screen.findByRole("button", { name: "Lock in my answer" })).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(screen.queryByText("1 of 1 done")).toBeNull();
});

test("a question button waits for a choice", async () => {
  const user = userEvent.setup();
  render(<BlockFlip blocks={[byId("text.question")]} />);
  await user.click(screen.getByRole("button", { name: /Which shot count is right/i }));
  const cta = await screen.findByRole("button", { name: "Lock in my answer" });
  expect(cta).toBeDisabled();
  await user.click(screen.getByRole("button", { name: /8 \+ 8 = 16/ }));
  expect(cta).toBeEnabled();
});

test("a video button waits until 90 percent", async () => {
  const user = userEvent.setup();
  render(<BlockFlip blocks={[byId("video.story")]} />);
  await user.click(screen.getByRole("button", { name: /The arcade that ran out of tokens/i }));
  const cta = await screen.findByRole("button", { name: "Start the lesson" });
  expect(cta).toBeDisabled();
  expect(screen.getByText("Watched 0%")).toBeInTheDocument();
  await user.click(screen.getByRole("slider", { name: "Seek" }));
  expect(cta).toBeEnabled();
});
