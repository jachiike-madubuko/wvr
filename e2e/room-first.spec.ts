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

test("renders Galaxy Home, flips to Pace Calendar with G/C shortcuts, and toggles Swimlane Table", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Room 204", { exact: true })).toBeVisible();
  for (const name of ["Maya", "Leo", "Zoe", "Noah", "Ava", "Kai"]) {
    await expect(page.locator(`[data-student-id]`, { hasText: name })).toBeVisible();
  }

  const scene = page.getByTestId("room-flip-scene");
  await expect(scene).toHaveAttribute("data-face", "galaxy");

  // Keyboard shortcut C flips to Calendar
  await page.keyboard.press("c");
  await expect(scene).toHaveAttribute("data-face", "calendar");

  await expect(page.getByTestId("calendar-grid")).toBeVisible();
  const wavyPaths = page.locator('[data-testid="calendar-grid"] svg path');
  expect(await wavyPaths.count()).toBeGreaterThanOrEqual(1);

  // Toggle to Swimlane Table
  await page.getByTestId("cal-view-table").click();
  await expect(page.locator('[data-testid^="student-row-"]')).toHaveCount(6);
  await expect(
    page.locator('a[href="/students/dddddddd-dddd-4ddd-8ddd-dddddddddd01"]').first(),
  ).toBeVisible();

  // Keyboard shortcut G flips back to Galaxy
  await page.keyboard.press("g");
  await expect(scene).toHaveAttribute("data-face", "galaxy");

  // Navbar buttons also toggle
  await page.getByTestId("tab-calendar").click();
  await expect(scene).toHaveAttribute("data-face", "calendar");
  await page.getByTestId("tab-galaxy").click();
  await expect(scene).toHaveAttribute("data-face", "galaxy");

  expect(pageErrors).toEqual([]);
});

test("enforces strict 500ms hover delay before showing student popover", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const mayaNode = page.locator('[data-student-id="dddddddd-dddd-4ddd-8ddd-dddddddddd01"]');
  const popover = page.getByTestId("student-popover");

  // Hover < 500ms: popover must NOT appear
  await mayaNode.hover({ force: true });
  await page.waitForTimeout(200);
  await expect(popover).toHaveCount(0);

  // Move away before 500ms: timer cancelled, popover still absent
  await page.mouse.move(10, 10);
  await page.waitForTimeout(450);
  await expect(popover).toHaveCount(0);

  // Hover >= 500ms: popover appears with profile link
  await mayaNode.hover({ force: true });
  await page.waitForTimeout(600);
  await expect(popover).toBeVisible();
  await expect(popover).toContainText("Maya");
  await expect(
    popover.locator('a[href="/students/dddddddd-dddd-4ddd-8ddd-dddddddddd01"]'),
  ).toBeVisible();
});

test("drags student to another cluster, persists across reload, and returns 409 on stale version", async ({
  page,
  request,
}) => {
  const leoId = "dddddddd-dddd-4ddd-8ddd-dddddddddd02";
  const initialRes = await request.get("/api/room");
  expect(initialRes.ok()).toBe(true);
  const initialRoom = (await initialRes.json()) as {
    students: { id: string; packId: string; version: number }[];
  };
  const leoBefore = initialRoom.students.find((s) => s.id === leoId);
  expect(leoBefore).toBeDefined();

  const originalPack = leoBefore!.packId;
  const targetPack = originalPack === "pack_space" ? "pack_cooking" : "pack_space";

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const leoNode = page.locator(`[data-student-id="${leoId}"]`);
    const targetCell = page.locator(`[data-galaxy-cell="${targetPack}"]`);

    const leoBox = await leoNode.boundingBox();
    const targetBox = await targetCell.boundingBox();
    expect(leoBox).not.toBeNull();
    expect(targetBox).not.toBeNull();

    const movePromise = page.waitForResponse(
      (res) => res.url().includes("/api/room/move") && res.request().method() === "POST",
    );

    await page.mouse.move(
      leoBox!.x + leoBox!.width / 2,
      leoBox!.y + leoBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height / 2,
      { steps: 12 },
    );
    await expect(targetCell).toHaveAttribute("data-drag-over", "true");
    await page.mouse.up();
    const moveRes = await movePromise;
    expect(moveRes.status()).toBe(200);

    await expect(targetCell.locator(`[data-student-id="${leoId}"]`)).toBeVisible();

    // Reload and confirm persistence from Neon
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.locator(`[data-galaxy-cell="${targetPack}"] [data-student-id="${leoId}"]`),
    ).toBeVisible();

    // Verify optimistic concurrency 409 VERSION_CONFLICT with stale version
    const staleRes = await request.post("/api/room/move", {
      data: {
        studentId: leoId,
        toPackId: originalPack,
        expectedVersion: Math.max(0, leoBefore!.version),
      },
    });
    expect(staleRes.status()).toBe(409);
    expect(await staleRes.json()).toEqual({ error: "VERSION_CONFLICT" });
  } finally {
    // Restore seeded pack so Neon remains clean
    const curRes = await request.get("/api/room");
    if (curRes.ok()) {
      const curRoom = (await curRes.json()) as {
        students: { id: string; packId: string; version: number }[];
      };
      const curLeo = curRoom.students.find((s) => s.id === leoId);
      if (curLeo && curLeo.packId !== originalPack) {
        await request.post("/api/room/move", {
          data: {
            studentId: leoId,
            toPackId: originalPack,
            expectedVersion: curLeo.version,
          },
        });
      }
    }
  }
});
