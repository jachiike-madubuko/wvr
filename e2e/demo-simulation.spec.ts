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

test("simulates struggling & fast students in Demo Data Mode, updates open profile live, and reverts on Reset", async ({
  browser,
  page,
  request,
}) => {
  test.setTimeout(150_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  try {
    // Clean baseline
    await request.post("/api/demo", {
      data: { action: "reset", profile: "sales_walkthrough" },
    });
    const roomData = (await (await request.get("/api/room")).json()) as {
      students: { id: string; firstName: string }[];
    };
    const cosmoId = roomData.students.find((s) => s.firstName === "Cosmo")!.id;

    // 1. Open /s/demo-space-lesson, pick Cosmo, verify simulate buttons appear
    await page.goto("/s/demo-space-lesson", { waitUntil: "domcontentloaded" });
    await page.locator('[data-student-pick="Cosmo"]').click();
    await expect(page.getByTestId("simulate-fast")).toBeVisible();
    await expect(page.getByTestId("simulate-struggling")).toBeVisible();

    const simRes1 = page.waitForResponse(
      (r) => r.url().includes("/api/demo") && r.request().method() === "POST",
    );
    await page.getByTestId("simulate-struggling").click();
    expect((await simRes1).status()).toBe(200);
    await expect(page.getByTestId("sim-toast")).toBeVisible();

    // 2. Open Cosmo's profile in a second page -> struggle node appears with >= 3 tries (10 tries)
    const profileCtx = await browser.newContext();
    const profilePage = await profileCtx.newPage();
    await profilePage.route("**/*", (route) => {
      const req = route.request();
      return BLOCK_TYPES.has(req.resourceType()) || BLOCK_URLS.test(req.url())
        ? route.abort()
        : route.continue();
    });

    await profilePage.goto(`/students/${cosmoId}`, { waitUntil: "domcontentloaded" });
    const struggleNodes = profilePage.locator(
      '[data-testid="mastery-chart"] svg [data-testid^="mastery-node-"][data-kind="struggle"]',
    );
    await expect(struggleNodes.first()).toBeVisible({ timeout: 10_000 });
    await struggleNodes.last().focus();
    await expect(profilePage.getByTestId("mastery-chart")).toContainText("10 tries");

    // 3. With profile already open, simulate again -> new node appears within ~7s without reload
    const beforeTotalNodes = await profilePage
      .locator('[data-testid="mastery-chart"] svg [data-testid^="mastery-node-"]')
      .count();

    const simRes2 = page.waitForResponse(
      (r) => r.url().includes("/api/demo") && r.request().method() === "POST",
    );
    await page.getByTestId("simulate-fast").click();
    expect((await simRes2).status()).toBe(200);

    await expect
      .poll(
        () =>
          profilePage
            .locator('[data-testid="mastery-chart"] svg [data-testid^="mastery-node-"]')
            .count(),
        { timeout: 12_000, intervals: [500, 1000] },
      )
      .toBeGreaterThan(beforeTotalNodes);

    // 4. Reset Current Demo Data -> simulated struggle node is gone for Cosmo
    const resetRes = await request.post("/api/demo", {
      data: { action: "reset", profile: "sales_walkthrough" },
    });
    expect(resetRes.status()).toBe(200);

    await profilePage.reload({ waitUntil: "domcontentloaded" });
    await expect(struggleNodes).toHaveCount(0);
    await profileCtx.close();

    // 5. With demo data cleared, simulate controls do not render and API rejects simulate
    const clearRes = await request.post("/api/demo", {
      data: { action: "clear" },
    });
    expect(clearRes.status()).toBe(200);

    await page.goto("/s/demo-space-lesson", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("simulate-fast")).toHaveCount(0);
    await expect(page.getByTestId("simulate-struggling")).toHaveCount(0);

    const rejectedRes = await request.post("/api/demo", {
      data: {
        action: "simulate",
        kind: "struggling",
        studentId: cosmoId,
        token: "demo-space-lesson",
      },
    });
    expect(rejectedRes.status()).toBe(403);

    expect(pageErrors).toEqual([]);
  } finally {
    await request.post("/api/demo", {
      data: { action: "reset", profile: "sales_walkthrough" },
    });
  }
});
