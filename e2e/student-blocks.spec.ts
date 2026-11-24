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

test("rejects invalid capability token fail-closed", async ({ page }) => {
  await page.goto("/s/invalid-token-123", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("invalid-path-link")).toBeVisible();
  await expect(page.locator('[data-student-pick]')).toHaveCount(0);
});

test("walks first-name roster picker and sequential mosaic deck with DrawPad and Check", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/s/demo-space-lesson", { waitUntil: "domcontentloaded" });

  // Zero logins/passwords on student path
  await expect(page.getByTestId("roster-picker")).toBeVisible();
  await expect(page.locator('input[type="password"], input[type="email"]')).toHaveCount(0);

  await page.locator('[data-student-pick="Maya"]').click();
  await expect(page.getByTestId("mosaic-grid")).toBeVisible();
  await expect(page.getByTestId("deck-progress")).toContainText("0 of 3 done");

  const hookTile = page.locator('[data-block-id="hook"]');
  const tryTile = page.locator('[data-block-id="try_1"]');
  const checkTile = page.locator('[data-block-id="check_1"]');

  await expect(hookTile).toHaveAttribute("data-span", "2");
  await expect(hookTile).toHaveAttribute("data-locked", "false");
  await expect(tryTile).toHaveAttribute("data-locked", "true");
  await expect(checkTile).toHaveAttribute("data-locked", "true");

  // 1. Complete Hero Hook
  await hookTile.click();
  await expect(page.getByTestId("block-modal")).toBeVisible();
  const hookSave = page.waitForResponse(
    (r) => r.url().includes("/api/student-path/") && r.request().method() === "POST",
  );
  await page.getByTestId("block-complete-btn").click();
  expect((await hookSave).status()).toBe(200);

  await expect(page.getByTestId("deck-progress")).toContainText("1 of 3 done");
  await expect(tryTile).toHaveAttribute("data-locked", "false");
  await expect(checkTile).toHaveAttribute("data-locked", "true");

  // 2. Complete DrawPad Try block
  await tryTile.click();
  const canvas = page.getByTestId("drawpad-canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 40, box!.y + 40);
  await page.mouse.down();
  await page.mouse.move(box!.x + 140, box!.y + 90, { steps: 6 });
  await page.mouse.up();

  const trySave = page.waitForResponse(
    (r) => r.url().includes("/api/student-path/") && r.request().method() === "POST",
  );
  await page.getByTestId("block-complete-btn").click();
  expect((await trySave).status()).toBe(200);

  await expect(page.getByTestId("deck-progress")).toContainText("2 of 3 done");
  await expect(checkTile).toHaveAttribute("data-locked", "false");

  // 3. Complete Check block
  await checkTile.click();
  await page.locator('[data-choice-id="a"]').click();
  const checkSave = page.waitForResponse(
    (r) => r.url().includes("/api/student-path/") && r.request().method() === "POST",
  );
  await page.getByTestId("block-complete-btn").click();
  expect((await checkSave).status()).toBe(200);

  await expect(page.getByTestId("deck-progress")).toContainText("3 of 3 done");
  expect(pageErrors).toEqual([]);
});
