import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ProfileDrawer } from "./ProfileDrawer";
import { profileFixture } from "./profile-fixture";

test("compose intervention shows guidance textbox and Generate without writing status", () => {
  const preview = profileFixture("stu_jordan")!.intervention;
  render(
    <ProfileDrawer
      mode="intervention"
      title="Intervention · Scaling ratios"
      onClose={() => undefined}
      intervention={{
        phase: "compose",
        preview,
        guidance: "",
        appliedGuidance: null,
        onGuidance: () => undefined,
        onGenerate: () => undefined,
        onApprove: () => undefined,
        onUnapprove: () => undefined,
        onPublish: () => undefined,
      }}
    />,
  );
  expect(screen.getByRole("textbox", { name: "Guide this intervention" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
  expect(screen.queryByText("Claude is writing the module…")).toBeNull();
});

test("generating intervention shows the writing status and disables publish", () => {
  const preview = profileFixture("stu_jordan")!.intervention;
  render(
    <ProfileDrawer
      mode="intervention"
      title="Intervention · Scaling ratios"
      onClose={() => undefined}
      intervention={{
        phase: "generating",
        preview,
        guidance: "",
        appliedGuidance: null,
        onGuidance: () => undefined,
        onGenerate: () => undefined,
        onApprove: () => undefined,
        onUnapprove: () => undefined,
        onPublish: () => undefined,
      }}
    />,
  );
  expect(screen.getByText("Claude is writing the module…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
});

test("approved intervention shows Unapprove and enabled Publish", () => {
  const preview = profileFixture("stu_jordan")!.intervention;
  render(
    <ProfileDrawer
      mode="intervention"
      title="Intervention · Scaling ratios"
      onClose={() => undefined}
      intervention={{
        phase: "approved",
        preview,
        guidance: "",
        appliedGuidance: "Keep it concrete",
        onGuidance: () => undefined,
        onGenerate: () => undefined,
        onApprove: () => undefined,
        onUnapprove: () => undefined,
        onPublish: () => undefined,
      }}
    />,
  );
  expect(screen.getByRole("button", { name: "Approved" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Unapprove" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
});

test("sent intervention shows Published without Unapprove", () => {
  const preview = profileFixture("stu_jordan")!.intervention;
  render(
    <ProfileDrawer
      mode="intervention"
      title="Intervention · Scaling ratios"
      onClose={() => undefined}
      intervention={{
        phase: "sent",
        preview,
        guidance: "",
        appliedGuidance: "Keep it concrete",
        onGuidance: () => undefined,
        onGenerate: () => undefined,
        onApprove: () => undefined,
        onUnapprove: () => undefined,
        onPublish: () => undefined,
      }}
    />,
  );
  expect(screen.getByText("Published")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Unapprove" })).toBeNull();
  expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
});

test("ready intervention uses the wide review-style drawer with the blocks view", () => {
  const preview = profileFixture("stu_jordan")!.intervention;
  const onApprove = vi.fn();
  render(
    <ProfileDrawer
      mode="intervention"
      title="Intervention · Scaling ratios"
      onClose={() => undefined}
      intervention={{
        phase: "ready",
        preview,
        guidance: "",
        appliedGuidance: null,
        onGuidance: () => undefined,
        onGenerate: () => undefined,
        onApprove,
        onUnapprove: () => undefined,
        onPublish: () => undefined,
      }}
    />,
  );
  const dialog = screen.getByRole("dialog", { name: "Intervention · Scaling ratios" });
  expect(dialog).toHaveClass("wv-drawer", "wv-drawer--wide");
  expect(screen.getByText("Target misconception")).toBeInTheDocument();
  expect(screen.getByText(preview.misconception)).toBeInTheDocument();
  expect(screen.getByText("What the kid sees")).toBeInTheDocument();
  expect(screen.getByText("1 block still needs review.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  expect(onApprove).toHaveBeenCalledOnce();
});
