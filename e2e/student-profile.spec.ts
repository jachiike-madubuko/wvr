import { expect, test } from "@playwright/test";

const BLOCK_TYPES = new Set(["image", "font", "media"]);
const BLOCK_URLS = /google-analytics|googletagmanager|segment\.|hotjar|doubleclick|posthog/;

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const req = route.request();
    return BLOCK_TYPES.has(req.resourceType()) || BLOCK_URLS.test(req.url())
      ? route.abort()
      : route.continue();
  });
});

test("renders Maya profile with Bklit Weaver Wheel, Check-ins, Mastery chart, and drawers", async ({
  page,
  request,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  const roomData = (await (await request.get("/api/room")).json()) as {
    students: { id: string; firstName: string }[];
  };
  const mayaId = roomData.students.find((s) => s.firstName === "Maya")!.id;

  await page.goto(`/students/${mayaId}`, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Maya" })).toBeVisible();
  await expect(page.getByTestId("view-current-blocks")).toHaveAttribute(
    "href",
    "/s/demo-space-lesson",
  );

  // Weaver Wheel radar chart renders 5 zone labels
  const radar = page.getByTestId("profile-radar");
  await expect(radar.locator("svg")).toBeVisible();
  for (const label of [
    "Emotional Reg",
    "Focus",
    "Engagement",
    "Task Completion",
    "Social",
  ]) {
    await expect(radar).toContainText(label);
  }

  // Check-ins & Mastery charts render SVGs
  await expect(page.getByTestId("checkin-trend").locator("svg")).toBeVisible();
  await expect(page.getByTestId("mastery-chart").locator("svg")).toBeVisible();

  // Zoom & Filter pills work
  await page.getByTestId("zoom-week").click();
  await expect(page.getByTestId("zoom-week")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("zoom-day").click();
  await page.getByTestId("filter-struggles").click();
  await expect(page.getByTestId("filter-struggles")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("filter-both").click();

  // Click PM check-in dip -> SEL Action Chat drawer + PII gate check
  await page.getByTestId("checkin-btn-pm").click();
  const drawer = page.getByTestId("profile-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("SEL Action Chat");

  await drawer.locator("textarea").fill("Reach out to maya.parent@example.com");
  const piiResPromise = page.waitForResponse(
    (r) => r.url().includes("/threads") && r.request().method() === "POST",
  );
  await drawer.getByRole("button", { name: "Save coaching note" }).click();
  expect((await piiResPromise).status()).toBe(422);
  await expect(page.getByTestId("drawer-error")).toContainText("Blocked");

  await drawer.locator("textarea").fill("Check in quietly before math block.");
  const cleanResPromise = page.waitForResponse(
    (r) => r.url().includes("/threads") && r.request().method() === "POST",
  );
  await drawer.getByRole("button", { name: "Save coaching note" }).click();
  expect((await cleanResPromise).status()).toBe(200);
  await expect(drawer).toContainText("Check in quietly before math block.");

  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(drawer).toHaveCount(0);

  // Click red struggle node -> 3-Step Offline Intervention Drawer & Approve
  const struggleNode = page.locator('[data-testid^="mastery-node-"][data-kind="struggle"]').first();
  await struggleNode.click();
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("unequal parts");
  await expect(drawer).toContainText("Offline teacher plan");
  await expect(drawer).toContainText("1. Manipulative Check");
  await expect(drawer).toContainText("2. Partner Scaffolding");
  await expect(drawer).toContainText("3. Quick Check");

  const approvePromise = page.waitForResponse(
    (r) => r.url().includes("/threads") && r.request().method() === "POST",
  );
  await page.getByTestId("approve-iv-btn").click();
  expect((await approvePromise).status()).toBe(200);
  await expect(page.getByTestId("iv-approved-badge")).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test("renders clean not-found fallback for unknown student UUID", async ({ page }) => {
  await page.goto("/students/00000000-0000-4000-8000-000000000000", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("student-not-found")).toBeVisible();
});
