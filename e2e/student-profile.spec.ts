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
    `/s/demo-space-lesson?student=${mayaId}`,
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

  // Check-ins & Mastery charts render SVGs with non-overlapping, unclipped X-axis labels
  await expect(page.getByTestId("checkin-trend").locator("svg")).toBeVisible();
  await expect(page.getByTestId("mastery-chart").locator("svg")).toBeVisible();

  for (const chartId of ["checkin-trend", "mastery-chart"] as const) {
    const svgBox = await page.getByTestId(chartId).locator("svg").boundingBox();
    expect(svgBox).not.toBeNull();
    const tickLoc = page.locator(
      `[data-testid="${chartId}"] [data-testid="chart-x-axis"] text`,
    );
    const tickCount = await tickLoc.count();
    expect(tickCount).toBeGreaterThanOrEqual(1);
    const boxes = [];
    for (let i = 0; i < tickCount; i++) {
      if (chartId === "mastery-chart") {
        await expect(tickLoc.nth(i)).toHaveText(/^\d+:\d{2}$/);
      }
      const b = await tickLoc.nth(i).boundingBox();
      expect(b).not.toBeNull();
      expect(b!.x).toBeGreaterThanOrEqual(svgBox!.x - 2);
      expect(b!.x + b!.width).toBeLessThanOrEqual(svgBox!.x + svgBox!.width + 2);
      boxes.push(b!);
    }
    boxes.sort((a, b) => a.x - b.x);
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i]!.x).toBeGreaterThanOrEqual(boxes[i - 1]!.x + boxes[i - 1]!.width + 4);
    }
  }
  await expect(
    page.locator('[data-testid="mastery-chart"] [data-testid="attempts-threshold-line"]'),
  ).toBeVisible();

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

  // Redundant pill buttons under the Daily Check-ins chart are removed; hit points live inside the SVG
  await expect(page.locator('[data-testid="checkin-trend"] button')).toHaveCount(0);

  // Click PM check-in dip SVG hit point -> SEL Action Chat drawer + PII gate check
  const dipPoint = page
    .locator('[data-testid="checkin-trend"] svg [data-testid^="checkin-point-"][data-kind="dip"]')
    .first();
  await expect(dipPoint).toHaveAttribute("role", "button");
  await expect(dipPoint).toHaveAttribute("tabindex", "0");
  await dipPoint.click();
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

  // Redundant pill label row under the Mastery chart is removed; hit points live inside the SVG
  await expect(
    page.locator('[data-testid="mastery-chart"] button[data-testid^="mastery-node-"]'),
  ).toHaveCount(0);

  const struggleNode = page
    .locator('[data-testid="mastery-chart"] svg [data-testid^="mastery-node-"][data-kind="struggle"]')
    .first();
  await expect(struggleNode).toHaveAttribute("role", "button");
  await expect(struggleNode).toHaveAttribute("tabindex", "0");

  // Keyboard path: focus hit point -> tooltip appears -> Enter opens coaching drawer
  await struggleNode.focus();
  await expect(page.getByTestId("mastery-chart")).toContainText("tries");
  await page.keyboard.press("Enter");
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("unequal parts");
  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(drawer).toHaveCount(0);

  // Pointer click on red struggle hit point -> 3-Step Offline Intervention Drawer & Approve
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

test("clicking View Current Blocks opens Maya's blocks directly without roster-picker", async ({
  page,
  request,
}) => {
  const roomData = (await (await request.get("/api/room")).json()) as {
    students: { id: string; firstName: string }[];
  };
  const mayaId = roomData.students.find((s) => s.firstName === "Maya")!.id;

  await page.goto(`/students/${mayaId}`, { waitUntil: "domcontentloaded" });
  const blocksLink = page.getByTestId("view-current-blocks");
  await expect(blocksLink).toHaveAttribute(
    "href",
    `/s/demo-space-lesson?student=${mayaId}`,
  );
  await blocksLink.click();

  await expect(page).toHaveURL(`/s/demo-space-lesson?student=${mayaId}`);
  await expect(page.getByTestId("roster-picker")).toHaveCount(0);
  await expect(page.getByTestId("mosaic-grid")).toBeVisible();
  await expect(page.locator("header")).toContainText("Maya");
});

test("renders clean not-found fallback for unknown student UUID", async ({ page }) => {
  await page.goto("/students/00000000-0000-4000-8000-000000000000", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("student-not-found")).toBeVisible();
});
