import { expect, test } from "@playwright/test";

const BLOCK_TYPES = new Set(["image", "font", "media"]);
const BLOCK_URLS = /google-analytics|googletagmanager|segment\.|hotjar|doubleclick|posthog/;

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const req = route.request();
    if (/youtube-nocookie\.com\/embed\//.test(req.url())) {
      return route.fulfill({ status: 200, contentType: "text/html", body: "<html><body></body></html>" });
    }
    return BLOCK_TYPES.has(req.resourceType()) || BLOCK_URLS.test(req.url())
      ? route.abort()
      : route.continue();
  });
});

test("rejects invalid capability token fail-closed", async ({ page }) => {
  await page.goto("/s/invalid-token-123", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("invalid-path-link")).toBeVisible();
  await expect(page.locator("[data-student-pick]")).toHaveCount(0);
});

test("renders 2-column Space mosaic with 3D flip activation, lazy hook iframe, and continuous lesson locks", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/s/demo-space-lesson", { waitUntil: "domcontentloaded" });

  // Zero logins/passwords on student path
  await expect(page.getByTestId("roster-picker")).toBeVisible();
  await expect(
    page.locator('input[type="password"], input[type="email"]'),
  ).toHaveCount(0);

  await page.locator('[data-student-pick="Maya"]').click();
  await expect(page.getByTestId("mosaic-grid")).toBeVisible();
  await expect(page.getByTestId("deck-progress")).toContainText("0 of 11 done");

  // Verify sketch order, span-2 on hook only, and zero iframes before tap
  const tiles = page.locator('[data-testid="mosaic-grid"] > button');
  await expect(tiles).toHaveCount(11);
  await expect(page.locator("iframe")).toHaveCount(0);

  const hookTile = page.locator('[data-block-id="hook"]');
  const elaTile = page.locator('[data-block-id="ela"]');
  const artTile = page.locator('[data-block-id="art"]');
  const lockedContTile = page.locator('[data-block-id="cont_equal_halves"]');

  await expect(hookTile).toHaveAttribute("data-span", "2");
  await expect(page.locator('[data-testid="mosaic-grid"] [data-span]')).toHaveCount(1);
  await expect(elaTile).toHaveAttribute("data-locked", "false");
  await expect(artTile).toHaveAttribute("data-locked", "false");
  await expect(lockedContTile).toHaveAttribute("data-locked", "true");

  // Verify 2-column reading order (non-decreasing Y, even left / odd right)
  const hookBox = await hookTile.boundingBox();
  const elaBox = await elaTile.boundingBox();
  const artBox = await artTile.boundingBox();
  expect(hookBox && elaBox && artBox).toBeTruthy();
  expect(elaBox!.y).toBeGreaterThan(hookBox!.y);
  expect(artBox!.x).toBeGreaterThan(elaBox!.x);

  // Clicking a locked continuation tile shakes without opening flip modal
  await lockedContTile.click({ force: true });
  await expect(lockedContTile).toHaveClass(/wv-pin-shake/);
  await expect(page.getByTestId("block-modal")).toHaveCount(0);

  // 1. Flip open Space video hook, scrub seek slider, complete
  await hookTile.click();
  await expect(page.getByTestId("block-modal")).toHaveAttribute(
    "data-flip-phase",
    "open",
  );
  await expect(page.getByTestId("hook-video-frame")).toHaveAttribute(
    "src",
    /W_B2UZ_ZoxU/,
  );

  const slider = page.getByRole("slider", { name: "Seek" });
  await slider.waitFor({ state: "visible" });
  // Wait for the 3D flip animation to settle before clicking the seek track
  await page.waitForTimeout(550);
  const sliderBox = await slider.boundingBox();
  expect(sliderBox).not.toBeNull();
  await slider.click({
    position: {
      x: Math.max(1, Math.floor(sliderBox!.width * 0.95)),
      y: Math.max(1, Math.floor(sliderBox!.height / 2)),
    },
  });

  const hookSave = page.waitForResponse(
    (r) =>
      r.url().includes("/api/student-path/") &&
      r.url().includes("/session") &&
      r.request().method() === "POST",
  );
  await page.getByTestId("block-complete-btn").click();
  expect((await hookSave).status()).toBe(200);
  await expect(page.getByTestId("deck-progress")).toContainText("1 of 11 done");
  await expect(page.getByTestId("block-modal")).toHaveCount(0);

  // 2. Flip open ELA, Escape closes without completing, then answer "blue"
  await elaTile.click();
  await expect(page.getByTestId("block-modal")).toHaveAttribute(
    "data-flip-phase",
    "open",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("block-modal")).toHaveCount(0);
  await expect(page.getByTestId("deck-progress")).toContainText("1 of 11 done");

  await elaTile.click();
  await expect(page.getByTestId("block-modal")).toHaveAttribute(
    "data-flip-phase",
    "open",
  );
  await page.locator('[data-choice-id="a"]').click();
  const elaSave = page.waitForResponse(
    (r) =>
      r.url().includes("/api/student-path/") &&
      r.url().includes("/session") &&
      r.request().method() === "POST",
  );
  await page.getByTestId("block-complete-btn").click();
  expect((await elaSave).status()).toBe(200);
  await expect(page.getByTestId("deck-progress")).toContainText("2 of 11 done");
  await expect(page.getByTestId("block-modal")).toHaveCount(0);

  // 3. Flip open Art DrawPad and complete
  await artTile.click();
  await expect(page.getByTestId("block-modal")).toHaveAttribute(
    "data-flip-phase",
    "open",
  );
  const canvas = page.getByTestId("drawpad-canvas");
  await canvas.waitFor({ state: "visible" });
  await page.waitForTimeout(550);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + 40, box!.y + 40);
  await page.mouse.down();
  await page.mouse.move(box!.x + 140, box!.y + 90, { steps: 6 });
  await page.mouse.up();

  const artSave = page.waitForResponse(
    (r) =>
      r.url().includes("/api/student-path/") &&
      r.url().includes("/session") &&
      r.request().method() === "POST",
  );
  await page.getByTestId("block-complete-btn").click();
  expect((await artSave).status()).toBe(200);
  await expect(page.getByTestId("deck-progress")).toContainText("3 of 11 done");
  await expect(page.getByTestId("block-modal")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});

test("unlocks collectibles, equips hat/eyewear/pet, persists across reload, and syncs to Galaxy", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  const roomData = (await (await request.get("/api/room")).json()) as {
    students: { id: string; firstName: string }[];
  };
  const mayaId = roomData.students.find((s) => s.firstName === "Maya")!.id;

  await page.goto("/s/demo-space-lesson", { waitUntil: "domcontentloaded" });
  await page.locator('[data-student-pick="Maya"]').click();

  await expect(page.getByTestId("student-deck-avatar")).toBeVisible();
  await page.getByTestId("student-tab-inventory").click();

  await expect(page.getByTestId("collectible-grid")).toBeVisible();
  await expect(page.getByTestId("collectible-inspector")).toBeVisible();

  // Idempotently unlock all 6 Space items via the demo milestone bar
  const triggerBtn = page.getByTestId("trigger-next-milestone");
  for (let i = 0; i < 6; i++) {
    if (await triggerBtn.isDisabled()) break;
    const unlockRes = page.waitForResponse(
      (r) =>
        r.url().includes("/api/student-path/") &&
        r.url().includes("/collectibles") &&
        r.request().method() === "POST",
    );
    await triggerBtn.click();
    expect((await unlockRes).status()).toBe(200);
    await expect(page.getByTestId("unlock-toast")).toBeVisible();
  }
  await expect(triggerBtn).toBeDisabled();

  // Equip hat, eyewear, and pet
  const targetItems = [
    "space_cadet_cap",
    "space_star_visor",
    "space_comet_ufo",
  ] as const;

  for (const itemId of targetItems) {
    const card = page.locator(`[data-collectible-id="${itemId}"]`);
    await card.click();
    const alreadyEquipped = await card.getAttribute("data-equipped");
    if (alreadyEquipped !== "true") {
      const equipRes = page.waitForResponse(
        (r) =>
          r.url().includes("/api/student-path/") &&
          r.url().includes("/collectibles") &&
          r.request().method() === "POST",
      );
      await page.getByTestId("collectible-equip-btn").click();
      expect((await equipRes).status()).toBe(200);
    }
    await expect(card).toHaveAttribute("data-equipped", "true");
    await expect(
      page
        .getByTestId("student-deck-avatar")
        .locator(`[data-equipped-item="${itemId}"]`),
    ).toBeVisible();
  }

  // Reload and verify persistence on /s/[token]
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-student-pick="Maya"]').click();
  for (const itemId of targetItems) {
    await expect(
      page
        .getByTestId("student-deck-avatar")
        .locator(`[data-equipped-item="${itemId}"]`),
    ).toBeVisible();
  }

  // Verify equipped items sync to Maya's node on / (Galaxy Home)
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const mayaNode = page.locator(`[data-student-id="${mayaId}"]`);
  await expect(mayaNode).toBeVisible();
  for (const itemId of targetItems) {
    await expect(
      mayaNode.locator(`[data-equipped-item="${itemId}"]`),
    ).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
});

test("counts multiple attempts on a block and flags >= highAttempts as a struggle node on profile", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  try {
    const roomData = (await (await request.get("/api/room")).json()) as {
      students: { id: string; firstName: string }[];
    };
    const cosmoId = roomData.students.find((s) => s.firstName === "Cosmo")!.id;

    await page.goto("/s/demo-space-lesson", { waitUntil: "domcontentloaded" });
    await page.locator('[data-student-pick="Cosmo"]').click();

    await page.locator('[data-block-id="ela"]').click();
    await expect(page.getByTestId("block-modal")).toHaveAttribute("data-flip-phase", "open");
    await page.waitForTimeout(550);

    // Click two wrong answers then the right answer -> 3 attempts (>= alerts.highAttempts)
    await page.locator('[data-choice-id="b"]').click();
    await page.locator('[data-choice-id="c"]').click();
    await page.locator('[data-choice-id="a"]').click();

    const saveRes = page.waitForResponse(
      (r) =>
        r.url().includes("/api/student-path/") &&
        r.url().includes("/session") &&
        r.request().method() === "POST",
    );
    await page.getByTestId("block-complete-btn").click();
    expect((await saveRes).status()).toBe(200);

    // Open Cosmo's profile: 3 attempts renders as a struggle node with "3 tries" in tooltip
    await page.goto(`/students/${cosmoId}`, { waitUntil: "domcontentloaded" });
    const struggleNode = page
      .locator('[data-testid="mastery-chart"] svg [data-testid^="mastery-node-"][data-kind="struggle"]')
      .last();
    await expect(struggleNode).toBeVisible();
    await struggleNode.focus();
    await expect(page.getByTestId("mastery-chart")).toContainText("3 tries");

    expect(pageErrors).toEqual([]);
  } finally {
    await request.post("/api/demo", {
      data: { action: "reset", profile: "sales_walkthrough" },
    });
  }
});

test("opens student-switch-modal on Switch, dismisses on Escape without teardown, and switches student with ?student= sync", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  const roomData = (await (await request.get("/api/room")).json()) as {
    students: { id: string; firstName: string }[];
  };
  const leoId = roomData.students.find((s) => s.firstName === "Leo")!.id;

  await page.goto("/s/demo-space-lesson", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("roster-picker")).toBeVisible();
  await page.locator('[data-student-pick="Maya"]').click();

  await expect(page.getByTestId("mosaic-grid")).toBeVisible();
  await expect(page.locator("header")).toContainText("Maya");

  // Click Switch -> opens modal without tearing down mosaic or showing roster-picker
  await page.getByTestId("switch-student-btn").click();
  const modal = page.getByTestId("student-switch-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute("role", "dialog");
  await expect(modal).toHaveAttribute("aria-modal", "true");
  await expect(page.getByTestId("roster-picker")).toHaveCount(0);
  await expect(page.getByTestId("mosaic-grid")).toBeVisible();
  await expect(modal.locator('[data-switch-student-pick="Maya"]')).toHaveAttribute(
    "aria-current",
    "true",
  );

  // Escape closes modal and keeps Maya active
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("student-switch-modal")).toHaveCount(0);
  await expect(page.locator("header")).toContainText("Maya");
  await expect(page.getByTestId("mosaic-grid")).toBeVisible();

  // Re-open and switch to Leo -> updates header & ?student=<leoId>
  await page.getByTestId("switch-student-btn").click();
  await expect(modal).toBeVisible();
  await modal.locator('[data-switch-student-pick="Leo"]').click();

  await expect(page.getByTestId("student-switch-modal")).toHaveCount(0);
  await expect(page.locator("header")).toContainText("Leo");
  expect(new URL(page.url()).searchParams.get("student")).toBe(leoId);

  // Reloading keeps Leo selected via ?student=<leoId>
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("roster-picker")).toHaveCount(0);
  await expect(page.locator("header")).toContainText("Leo");

  expect(pageErrors).toEqual([]);
});
