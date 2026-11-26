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

test("golden path: simulate struggling -> alert mark on Galaxy & Swimlane -> deep-link flagged node -> approve resolves -> fast-student notice -> Reset clears", async ({
  page,
  request,
}) => {
  test.setTimeout(150_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  try {
    // Clean sales_walkthrough baseline
    await request.post("/api/demo", {
      data: { action: "reset", profile: "sales_walkthrough" },
    });
    const roomData = (await (await request.get("/api/room")).json()) as {
      students: { id: string; firstName: string }[];
    };
    const cosmoId = roomData.students.find((s) => s.firstName === "Cosmo")!.id;

    // 1. Simulate struggling student on /s/demo-space-lesson
    await page.goto("/s/demo-space-lesson", { waitUntil: "domcontentloaded" });
    await page.locator('[data-student-pick="Cosmo"]').click();
    const simStruggleRes = page.waitForResponse(
      (r) => r.url().includes("/api/demo") && r.request().method() === "POST",
    );
    await page.getByTestId("simulate-struggling").click();
    expect((await simStruggleRes).status()).toBe(200);

    // 2. Return Home -> alert mark appears on Galaxy node and Swimlane row
    await page.getByTestId("demo-back-home").click();
    const galaxyAlert = page.locator(
      `[data-galaxy-cell] [data-testid="alert-mark-${cosmoId}"]`,
    );
    await expect(galaxyAlert).toBeVisible({ timeout: 15_000 });
    await expect(galaxyAlert).toHaveAttribute("data-alert-kind", "high_attempts");

    // Verify same alert mark appears on Swimlane row
    await page.getByTestId("tab-calendar").click();
    await page.getByTestId("cal-view-table").click();
    const swimlaneAlert = page.locator(
      `[data-testid="student-row-${cosmoId}"] [data-testid="alert-mark-${cosmoId}"]`,
    );
    await expect(swimlaneAlert).toBeVisible();
    await expect(swimlaneAlert).toHaveAttribute("data-alert-kind", "high_attempts");

    // 3. Flip back to Galaxy, wait for 650ms 3D flip to settle, then click alert mark -> deep-links to ?alert=
    await page.getByTestId("tab-galaxy").click();
    await page.waitForTimeout(750);
    await page.locator('[data-galaxy-cell="pack_space"]').hover({ force: true });
    await galaxyAlert.click();
    await expect(page).toHaveURL(new RegExp(`/students/${cosmoId}\\?alert=`), {
      timeout: 15_000,
    });

    const flaggedNode = page.locator(
      '[data-testid="mastery-chart"] svg [data-flagged="true"]',
    );
    await expect(flaggedNode).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("flagged-alert-banner")).toBeVisible();

    // 4. Start intervention -> offline 3-step drawer opens scoped to the struggle misconception -> Approve
    await page.getByTestId("start-intervention-btn").click();
    const drawer = page.getByTestId("profile-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Simulated: repeated wrong answers");
    await expect(drawer).toContainText("Offline teacher plan");

    const approveRes = page.waitForResponse(
      (r) => r.url().includes("/threads") && r.request().method() === "POST",
    );
    await page.getByTestId("approve-iv-btn").click();
    expect((await approveRes).status()).toBe(200);
    await expect(page.getByTestId("iv-approved-badge")).toBeVisible();

    // 5. Return to Galaxy -> struggle alert mark is resolved (gone)
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(galaxyAlert).toHaveCount(0);

    // 6. Simulate fast student -> informational blue fast-student notice with no intervention draft
    await page.goto("/s/demo-space-lesson", { waitUntil: "domcontentloaded" });
    await page.locator('[data-student-pick="Cosmo"]').click();
    const simFastRes = page.waitForResponse(
      (r) => r.url().includes("/api/demo") && r.request().method() === "POST",
    );
    await page.getByTestId("simulate-fast").click();
    expect((await simFastRes).status()).toBe(200);

    await page.getByTestId("demo-back-home").click();
    await expect(galaxyAlert).toBeVisible({ timeout: 15_000 });
    await expect(galaxyAlert).toHaveAttribute("data-alert-kind", "fast_student");

    await page.locator('[data-galaxy-cell="pack_space"]').hover({ force: true });
    await galaxyAlert.click();
    await expect(page).toHaveURL(new RegExp(`/students/${cosmoId}\\?alert=`), {
      timeout: 15_000,
    });
    await expect(page.getByTestId("fast-student-banner")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("profile-drawer")).toHaveCount(0);

    // 7. Reset Current Demo Data -> clears simulated fast notice too
    const resetRes = await request.post("/api/demo", {
      data: { action: "reset", profile: "sales_walkthrough" },
    });
    expect(resetRes.status()).toBe(200);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(galaxyAlert).toHaveCount(0);

    expect(pageErrors).toEqual([]);
  } finally {
    await request.post("/api/demo", {
      data: { action: "reset", profile: "sales_walkthrough" },
    });
  }
});
