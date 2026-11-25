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

test("toggles sales_walkthrough <-> interactive_onboarding, slices subjects, resolves intervention, tests Pulsar fallback, and clears/re-seeds demo data", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  try {
    // 1. Start in sales_walkthrough (8 students including Pulsar)
    await request.post("/api/demo", {
      data: { action: "reset", profile: "sales_walkthrough" },
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("demo-settings-btn")).toContainText("Demo: Sales");
    await expect(page.locator("[data-student-id]")).toHaveCount(8);
    await expect(page.locator("[data-student-id]", { hasText: "Pulsar" })).toBeVisible();

    // 2. Open Settings -> Demo Data drawer and switch to interactive_onboarding
    await page.getByTestId("demo-settings-btn").click();
    await expect(page.getByTestId("demo-control-drawer")).toBeVisible();

    const switchRes = page.waitForResponse(
      (r) => r.url().includes("/api/demo") && r.request().method() === "POST",
    );
    await page.getByTestId("demo-mode-interactive_onboarding").click();
    expect((await switchRes).status()).toBe(200);

    await page.getByTestId("demo-control-drawer").getByRole("button", { name: "Close" }).click();

    // Onboarding shows 4 core students, excludes Pulsar, and displays persistent banner
    await expect(page.getByTestId("onboarding-demo-banner")).toBeVisible();
    await expect(page.getByTestId("onboarding-demo-banner")).toContainText(
      "Viewing Sample Classroom Data",
    );
    await expect(page.locator("[data-student-id]")).toHaveCount(4);
    await expect(page.locator("[data-student-id]", { hasText: "Pulsar" })).toHaveCount(0);

    // 3. Flip to Swimlane Table and verify subject slicing re-sorts split-pace Maya (Behind in Math, Ahead in Science)
    await page.getByTestId("tab-calendar").click();
    await page.getByTestId("cal-view-table").click();
    await expect(page.locator('[data-testid^="student-row-"]')).toHaveCount(4);

    await page.getByRole("tab", { name: "Math" }).click();
    const mathMayaRow = page.locator('[data-testid^="student-row-"]', { hasText: "Maya" });
    await expect(mathMayaRow).toContainText("Behind");

    await page.getByRole("tab", { name: "Science" }).click();
    const sciMayaRow = page.locator('[data-testid^="student-row-"]', { hasText: "Maya" });
    await expect(sciMayaRow).toContainText("Ahead");

    // 4. Open Nebula's profile, click red struggle node, and approve offline plan (closed-loop resolution)
    await page.getByTestId("onboarding-step-nebula").click();
    await expect(page.getByRole("heading", { name: "Nebula" })).toBeVisible();
    const nebulaStruggle = page
      .locator('[data-testid^="mastery-node-"][data-kind="struggle"]')
      .first();
    await nebulaStruggle.click();
    const drawer = page.getByTestId("profile-drawer");
    await expect(drawer).toContainText("Numerator/denominator inversion");

    const approveRes = page.waitForResponse(
      (r) => r.url().includes("/threads") && r.request().method() === "POST",
    );
    await page.getByTestId("approve-iv-btn").click();
    expect((await approveRes).status()).toBe(200);
    await expect(page.getByTestId("iv-approved-badge")).toBeVisible();

    // Return to Room and confirm banner reflects Nebula intervention resolved
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("onboarding-step-nebula")).toContainText(
      "Nebula Intervention Resolved",
    );

    // 5. Clear Demo Data -> 0 sample students, then Re-seed Sample Classroom -> 4 restored
    const clearRes = page.waitForResponse(
      (r) => r.url().includes("/api/demo") && r.request().method() === "POST",
    );
    await page.getByTestId("clear-demo-data-btn").click();
    expect((await clearRes).status()).toBe(200);
    await expect(page.locator("[data-student-id]")).toHaveCount(0);
    await expect(page.getByTestId("reseed-sample-btn")).toBeVisible();

    const reseedRes = page.waitForResponse(
      (r) => r.url().includes("/api/demo") && r.request().method() === "POST",
    );
    await page.getByTestId("reseed-sample-btn").click();
    expect((await reseedRes).status()).toBe(200);
    await expect(page.locator("[data-student-id]")).toHaveCount(4);

    // 6. Switch back to sales_walkthrough and verify Pulsar fault-injection fallback
    await page.getByTestId("demo-settings-btn").click();
    const backToSales = page.waitForResponse(
      (r) => r.url().includes("/api/demo") && r.request().method() === "POST",
    );
    await page.getByTestId("demo-mode-sales_walkthrough").click();
    expect((await backToSales).status()).toBe(200);
    await page.getByTestId("demo-control-drawer").getByRole("button", { name: "Close" }).click();

    await expect(page.locator("[data-student-id]")).toHaveCount(8);
    const salesRoom = (await (await request.get("/api/room")).json()) as {
      students: { id: string; firstName: string }[];
    };
    const pulsarId = salesRoom.students.find((s) => s.firstName === "Pulsar")!.id;
    await page.goto(`/students/${pulsarId}`, { waitUntil: "domcontentloaded" });
    await page
      .locator('[data-testid^="mastery-node-"][data-kind="struggle"]')
      .first()
      .click();
    const pulsarRegen = page.waitForResponse(
      (r) => r.url().includes("/threads") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Regenerate 3-step plan" }).click();
    expect((await pulsarRegen).status()).toBe(200);
    await expect(page.getByTestId("profile-drawer")).toContainText(
      "Rule-based fallback active",
    );

    expect(pageErrors).toEqual([]);
  } finally {
    // Always restore clean sales_walkthrough baseline
    await request.post("/api/demo", {
      data: { action: "reset", profile: "sales_walkthrough" },
    });
  }
});
