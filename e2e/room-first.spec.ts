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
  request,
}) => {
  test.setTimeout(60_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  // Ensure deterministic sales_walkthrough baseline
  await request.post("/api/demo", {
    data: { action: "switch", profile: "sales_walkthrough" },
  });
  const roomData = (await (await request.get("/api/room")).json()) as {
    students: { id: string; firstName: string }[];
  };
  const mayaId = roomData.students.find((s) => s.firstName === "Maya")!.id;
  const leoId = roomData.students.find((s) => s.firstName === "Leo")!.id;

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Room 204", { exact: true })).toBeVisible();
  for (const name of ["Nebula", "Maya", "Cosmo", "Astra", "Pulsar", "Leo", "Zoe", "Noah"]) {
    await expect(page.locator(`[data-student-id]`, { hasText: name })).toBeVisible();
  }

  // Upgraded SVG avatars, orbiting nodes, and seeded equipped collectibles
  expect(await page.locator(".wv-orbit-node").count()).toBeGreaterThanOrEqual(8);
  expect(
    await page.locator("[data-student-id] svg.wv-node-avatar").count(),
  ).toBeGreaterThanOrEqual(8);
  await expect(
    page.locator(
      `[data-student-id="${leoId}"] [data-equipped-item="cooking_chef_toque"]`,
    ),
  ).toBeVisible();

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
  await expect(page.locator('[data-testid^="student-row-"]')).toHaveCount(8);
  await expect(
    page.locator(`a[href="/students/${mayaId}"]`).first(),
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

test("enforces strict 500ms hover delay before showing student popover", async ({
  page,
  request,
}) => {
  const roomData = (await (await request.get("/api/room")).json()) as {
    students: { id: string; firstName: string }[];
  };
  const mayaId = roomData.students.find((s) => s.firstName === "Maya")!.id;

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const mayaNode = page.locator(`[data-student-id="${mayaId}"]`);
  const popover = page.getByTestId("student-popover");

  // Hover < 500ms: popover must NOT appear
  await mayaNode.hover({ force: true });
  await page.waitForTimeout(200);
  await expect(popover).toHaveCount(0);

  // Move away before 500ms: timer cancelled, popover still absent
  await page.mouse.move(10, 10);
  await page.waitForTimeout(450);
  await expect(popover).toHaveCount(0);

  // Narrow viewport (390px): popover still never overlaps the student node
  await page.setViewportSize({ width: 390, height: 844 });
  await mayaNode.hover({ force: true });
  await page.waitForTimeout(600);
  await expect(popover).toBeVisible();
  const narrowNode = await mayaNode.boundingBox();
  const narrowPop = await popover.boundingBox();
  expect(narrowNode && narrowPop).toBeTruthy();
  const overlapsNarrow = !(
    narrowPop!.x + narrowPop!.width <= narrowNode!.x ||
    narrowPop!.x >= narrowNode!.x + narrowNode!.width ||
    narrowPop!.y + narrowPop!.height <= narrowNode!.y ||
    narrowPop!.y >= narrowNode!.y + narrowNode!.height
  );
  expect(overlapsNarrow).toBe(false);

  // Hover >= 500ms on desktop (1280px): popover appears offset beside node without overlapping it
  await page.mouse.move(10, 10);
  await page.waitForTimeout(200);
  await page.setViewportSize({ width: 1280, height: 800 });
  await mayaNode.hover({ force: true });
  await page.waitForTimeout(600);
  await expect(popover).toBeVisible();
  await expect(popover).toContainText("Maya");

  const nodeBox = await mayaNode.boundingBox();
  const popBox = await popover.boundingBox();
  expect(nodeBox && popBox).toBeTruthy();
  const side = await popover.getAttribute("data-side");
  expect(side === "right" || side === "left").toBe(true);
  if (side === "right") {
    expect(popBox!.x).toBeGreaterThanOrEqual(nodeBox!.x + nodeBox!.width);
  } else {
    expect(popBox!.x + popBox!.width).toBeLessThanOrEqual(nodeBox!.x);
  }

  // Moving pointer into popover keeps it open and both nav links stay clickable
  const profileLink = popover.locator(`a[href="/students/${mayaId}"]`);
  const blocksLink = popover.getByTestId("popover-view-blocks");
  await expect(profileLink).toBeVisible();
  await expect(blocksLink).toBeVisible();
  await expect(blocksLink).toHaveAttribute(
    "href",
    `/s/demo-space-lesson?student=${mayaId}`,
  );
  await page.mouse.move(popBox!.x + popBox!.width / 2, popBox!.y + popBox!.height / 2);
  await page.waitForTimeout(200);
  await expect(popover).toBeVisible();
  await expect(profileLink).toBeVisible();
  await expect(blocksLink).toBeVisible();

  // Clicking View current blocks lands directly on Maya's blocks view (skips roster-picker)
  await blocksLink.click();
  await expect(page).toHaveURL(`/s/demo-space-lesson?student=${mayaId}`);
  await expect(page.getByTestId("roster-picker")).toHaveCount(0);
  await expect(page.getByTestId("mosaic-grid")).toBeVisible();
  await expect(page.locator("header")).toContainText("Maya");
});

test("clicking or pressing Enter on a Galaxy group title opens a group-level pacing breakdown and dismisses cleanly", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Click Space group title -> breakdown dialog opens with matching member total
  const spaceTitle = page.getByTestId("group-title-pack_space");
  const spaceNodes = page.locator('[data-galaxy-cell="pack_space"] [data-student-id]');
  const expectedTotal = await spaceNodes.count();

  await spaceTitle.click();
  const breakdown = page.getByTestId("group-pacing-breakdown");
  await expect(breakdown).toBeVisible();
  await expect(breakdown).toHaveAttribute("role", "dialog");
  await expect(breakdown).toHaveAttribute("data-pack-id", "pack_space");
  await expect(breakdown).toHaveAttribute("data-total", String(expectedTotal));
  await expect(breakdown).toContainText("Ahead");
  await expect(breakdown).toContainText("On Track");
  await expect(breakdown).toContainText("Behind");

  // Escape closes the breakdown
  await page.keyboard.press("Escape");
  await expect(breakdown).toHaveCount(0);

  // Keyboard path: focus Cooking group title and press Enter
  const cookingTitle = page.getByTestId("group-title-pack_cooking");
  await cookingTitle.focus();
  await page.keyboard.press("Enter");
  await expect(breakdown).toBeVisible();
  await expect(breakdown).toHaveAttribute("data-pack-id", "pack_cooking");

  // Close button dismisses it
  await breakdown.getByRole("button", { name: "Close" }).click();
  await expect(breakdown).toHaveCount(0);

  // Clicking outside dismisses it
  await spaceTitle.click();
  await expect(breakdown).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(breakdown).toHaveCount(0);
});

test("drags student to another cluster, persists across reload, and returns 409 on stale version", async ({
  page,
  request,
}) => {
  const initialRes = await request.get("/api/room");
  expect(initialRes.ok()).toBe(true);
  const initialRoom = (await initialRes.json()) as {
    students: { id: string; firstName: string; packId: string; version: number }[];
  };
  const leoBefore = initialRoom.students.find((s) => s.firstName === "Leo");
  expect(leoBefore).toBeDefined();
  const leoId = leoBefore!.id;

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

test("hides empty groups from Galaxy grid and reveals top-right drop popover while dragging", async ({
  page,
  request,
}) => {
  const initialRes = await request.get("/api/room");
  expect(initialRes.ok()).toBe(true);
  const initialRoom = (await initialRes.json()) as {
    students: { id: string; firstName: string; packId: string; version: number }[];
  };
  const cosmo = initialRoom.students.find((s) => s.firstName === "Cosmo");
  expect(cosmo).toBeDefined();
  const cosmoId = cosmo!.id;
  const originalPack = cosmo!.packId;
  expect(initialRoom.students.some((s) => s.packId === "pack_fashion")).toBe(false);

  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Empty group is hidden in the main grid, and popover is hidden until drag starts
    await expect(page.locator('[data-galaxy-cell="pack_fashion"]')).toHaveCount(0);
    await expect(page.getByTestId("empty-packs-popover")).toHaveCount(0);

    const cosmoNode = page.locator(`[data-student-id="${cosmoId}"]`);
    const cosmoBox = await cosmoNode.boundingBox();
    expect(cosmoBox).not.toBeNull();

    // Activate PointerSensor (distance: 6)
    await page.mouse.move(
      cosmoBox!.x + cosmoBox!.width / 2,
      cosmoBox!.y + cosmoBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      cosmoBox!.x + cosmoBox!.width / 2 + 16,
      cosmoBox!.y + cosmoBox!.height / 2,
      { steps: 4 },
    );

    const emptyPopover = page.getByTestId("empty-packs-popover");
    await expect(emptyPopover).toBeVisible();
    const popBox = await emptyPopover.boundingBox();
    expect(popBox).not.toBeNull();
    expect(popBox!.x).toBeGreaterThan(1280 / 2);
    expect(popBox!.y).toBeLessThan(800 / 2);

    const fashionDrop = page.locator('[data-empty-pack-drop="pack_fashion"]');
    await expect(fashionDrop).toBeVisible();
    const fashionBox = await fashionDrop.boundingBox();
    expect(fashionBox).not.toBeNull();

    const movePromise = page.waitForResponse(
      (res) => res.url().includes("/api/room/move") && res.request().method() === "POST",
    );
    await page.mouse.move(
      fashionBox!.x + fashionBox!.width / 2,
      fashionBox!.y + fashionBox!.height / 2,
      { steps: 12 },
    );
    await expect(fashionDrop).toHaveAttribute("data-drag-over", "true");
    await page.mouse.up();
    expect((await movePromise).status()).toBe(200);

    await expect(emptyPopover).toHaveCount(0);
    await expect(
      page.locator(`[data-galaxy-cell="pack_fashion"] [data-student-id="${cosmoId}"]`),
    ).toBeVisible();
  } finally {
    const curRes = await request.get("/api/room");
    if (curRes.ok()) {
      const curRoom = (await curRes.json()) as {
        students: { id: string; packId: string; version: number }[];
      };
      const curCosmo = curRoom.students.find((s) => s.id === cosmoId);
      if (curCosmo && curCosmo.packId !== originalPack) {
        await request.post("/api/room/move", {
          data: {
            studentId: cosmoId,
            toPackId: originalPack,
            expectedVersion: curCosmo.version,
          },
        });
      }
    }
  }
});
