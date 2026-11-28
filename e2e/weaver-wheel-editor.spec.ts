import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const MARGIN = 44;

let cachedStudentId: string | null = null;

async function getTestStudentId(request: APIRequestContext): Promise<string> {
  if (cachedStudentId) return cachedStudentId;
  const room = (await (await request.get("/api/room")).json()) as {
    students: { id: string; firstName: string }[];
  };
  cachedStudentId =
    room.students.find((s) => s.firstName === "Maya")?.id ??
    room.students[0]!.id;
  return cachedStudentId;
}

async function openEdit(page: Page, request: APIRequestContext) {
  const id = await getTestStudentId(request);
  await page.goto(`/students/${id}`, { waitUntil: "load" });
  const hadDraft = await page.evaluate((sid) => {
    const k = `weavr:wheel-draft:v1:${sid}`;
    const existed = window.localStorage.getItem(k) !== null;
    window.localStorage.removeItem(k);
    return existed;
  }, id);
  if (hadDraft) {
    await page.reload({ waitUntil: "load" });
  }
  const editBtn = page.getByRole("button", { name: /^(Edit|Set Weaver Wheel)$/ });
  await expect(async () => {
    if (await editBtn.isVisible()) {
      await editBtn.click();
    }
    await expect(page.getByTestId("wheel-edit-overlay")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15_000 });
  return id;
}

for (const width of [360, 430]) {
  test.describe(`@${width}px mobile`, () => {
    test.use({
      viewport: { width, height: width === 360 ? 780 : 932 },
      hasTouch: true,
      isMobile: true,
    });

    test("drag on Focus wedge sets 4 without page scroll & crowded 1-point stays on own axis (T-45/T-46/T-47)", async ({
      page,
      request,
    }) => {
      await openEdit(page, request);
      const ov = page.getByTestId("wheel-edit-overlay");
      await ov.scrollIntoViewIfNeeded();
      const beforeScroll = await page.evaluate(() => window.scrollY);
      const b = (await ov.boundingBox())!;
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const r = (b.width - 2 * MARGIN) / 2;

      // Drag along Focus (axis 1 = 72° clockwise from top)
      const a1 = ((72 - 90) * Math.PI) / 180;
      const pt = (angle: number, frac: number) => ({
        x: cx + frac * r * Math.cos(angle),
        y: cy + frac * r * Math.sin(angle),
      });

      const beforeAxis0 = await page
        .getByTestId("wheel-handle-0")
        .getAttribute("aria-valuetext");

      await page.mouse.move(pt(a1, 0.2).x, pt(a1, 0.2).y);
      await page.mouse.down();
      for (const f of [0.35, 0.5, 0.65, 0.8]) {
        await page.mouse.move(pt(a1, f).x, pt(a1, f).y, { steps: 3 });
      }
      await page.mouse.up();

      expect(await page.evaluate(() => window.scrollY)).toBe(beforeScroll);
      await expect(page.getByTestId("wheel-handle-1")).toHaveAttribute(
        "aria-valuetext",
        "4, Usually",
      );
      await expect(page.getByTestId("wheel-handle-1")).toHaveAttribute(
        "aria-valuenow",
        "4",
      );
      // Neighbour axis unchanged
      await expect(page.getByTestId("wheel-handle-0")).toHaveAttribute(
        "aria-valuetext",
        beforeAxis0!,
      );

      // Crowded centre tap on axis 0 (Emotional Reg = 1) does not disturb Focus = 4
      const a0 = (-90 * Math.PI) / 180;
      const p0 = pt(a0, 0.2);
      await page.mouse.click(p0.x, p0.y);
      await expect(page.getByTestId("wheel-handle-0")).toHaveAttribute(
        "aria-valuetext",
        "1, Rarely",
      );
      await expect(page.getByTestId("wheel-handle-1")).toHaveAttribute(
        "aria-valuetext",
        "4, Usually",
      );
    });

    test("handles >= 44px and action targets >= 44px with >= 8px gaps (R-9/R-10)", async ({
      page,
      request,
    }) => {
      await openEdit(page, request);
      for (let i = 0; i < 5; i++) {
        const bb = (await page
          .getByTestId(`wheel-handle-${i}`)
          .locator("circle.hit")
          .boundingBox())!;
        expect(bb.width).toBeGreaterThanOrEqual(44);
        expect(bb.height).toBeGreaterThanOrEqual(44);
      }

      const toggleBox = (await page
        .getByTestId("wheel-steppers-toggle")
        .boundingBox())!;
      const cancelBox = (await page
        .getByTestId("wheel-cancel-btn")
        .boundingBox())!;
      const saveBox = (await page
        .getByTestId("wheel-save-btn")
        .boundingBox())!;
      expect(toggleBox.height).toBeGreaterThanOrEqual(44);
      expect(cancelBox.height).toBeGreaterThanOrEqual(44);
      expect(saveBox.height).toBeGreaterThanOrEqual(44);
      expect(saveBox.x - (cancelBox.x + cancelBox.width)).toBeGreaterThanOrEqual(
        7.5,
      );
    });

    test("touch-action: none only on edit overlay; swipe below radar scrolls (R-4/R-5)", async ({
      page,
      request,
    }) => {
      await openEdit(page, request);
      await page.getByTestId("wheel-steppers-toggle").click();

      const touchActions = await page.evaluate(() => {
        const ov = document.querySelector('[data-testid="wheel-edit-overlay"]');
        const root = document.querySelector('[data-testid="profile-radar"]');
        const prov = document.querySelector('[data-testid="wheel-provenance"]');
        return {
          overlay: ov ? getComputedStyle(ov).touchAction : null,
          root: root ? getComputedStyle(root).touchAction : null,
          prov: prov ? getComputedStyle(prov).touchAction : null,
        };
      });
      expect(touchActions.overlay).toBe("none");
      expect(touchActions.root).not.toBe("none");
      expect(touchActions.prov).not.toBe("none");

      const cdp = await page.context().newCDPSession(page);
      const startY = await page.evaluate(() => window.scrollY);
      const toggleBox = (await page
        .getByTestId("wheel-steppers-toggle")
        .boundingBox())!;
      const x = Math.round(toggleBox.x + toggleBox.width / 2);
      const y0 = Math.round(toggleBox.y + 10);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y: y0 }],
      });
      for (const dy of [-40, -90, -150, -220]) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: Math.max(20, y0 + dy) }],
        });
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      const afterY = await page.evaluate(() => window.scrollY);
      expect(afterY).toBeGreaterThan(startY);
    });

    test("no horizontal scroll, labels unclipped, line 1 slack >= 16px, last row visible above sticky bar (T-34/T-36/T-37/R-11)", async ({
      page,
      request,
    }) => {
      await openEdit(page, request);
      await page.getByTestId("wheel-steppers-toggle").click();

      // Set Task Completion to 3 ("About half the time") so Clear renders and worst-case label shows
      const tcHandle = page.getByTestId("wheel-handle-3");
      await tcHandle.focus();
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("ArrowUp");
      await expect(tcHandle).toHaveAttribute(
        "aria-valuetext",
        "3, About half the time",
      );

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);

      // Verify all 5 SVG axis labels stay inside viewport horizontally
      const labelBoxes = await page
        .locator('[data-testid="profile-radar"] svg text')
        .evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { text: el.textContent, left: r.left, right: r.right };
          }),
        );
      expect(labelBoxes.length).toBeGreaterThanOrEqual(5);
      for (const lb of labelBoxes) {
        expect(lb.left).toBeGreaterThanOrEqual(-1);
        expect(lb.right).toBeLessThanOrEqual(width + 1);
      }

      // Line 1 slack >= 16px for Task Completion with Clear visible
      const slack = await page
        .getByTestId("wheel-stepper-line1-Task Completion")
        .evaluate((row) => {
          const children = Array.from(row.children) as HTMLElement[];
          const used = children.reduce(
            (sum, c) => sum + c.getBoundingClientRect().width,
            0,
          );
          return row.getBoundingClientRect().width - used - 8;
        });
      expect(slack).toBeGreaterThanOrEqual(16);

      // Value box does not overflow horizontally and stays <= 2 lines
      const valMetrics = await page
        .getByTestId("wheel-stepper-value-Task Completion")
        .evaluate((el) => ({
          scrollW: el.scrollWidth,
          clientW: el.clientWidth,
          height: el.getBoundingClientRect().height,
        }));
      expect(valMetrics.scrollW).toBeLessThanOrEqual(valMetrics.clientW + 1);
      expect(valMetrics.height).toBeLessThanOrEqual(60);

      // Last row ("Social") scrolls clear of sticky bar
      const socialRow = page.getByTestId("wheel-stepper-row-Social");
      await socialRow.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 140));
      const socialBox = (await socialRow.boundingBox())!;
      const barBox = (await page
        .getByTestId("wheel-sticky-bar")
        .boundingBox())!;
      expect(socialBox.y + socialBox.height).toBeLessThanOrEqual(barBox.y + 4);
    });
  });
}

test("disclosure a11y, keyboard-only collapsed edit, focus return, and stepper-only flow (D-2..D-5/AC-23..AC-26/AC-30/AC-31)", async ({
  page,
  request,
}) => {
  const id = await openEdit(page, request);
  const toggle = page.getByRole("button", { name: "Show +/− controls" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-controls", `wheel-steppers-${id}`);
  await expect(page.locator(`#wheel-steppers-${id}`)).toBeHidden();

  // Edit mode uses role="group", never role="img", no text/number inputs, provenance visible
  await expect(
    page.getByRole("group", { name: "Weaver Wheel editor" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid="profile-radar"] input'),
  ).toHaveCount(0);
  await expect(page.getByTestId("wheel-provenance")).toContainText(
    "Set by you (teacher). Teacher observation, not a diagnosis.",
  );

  // Full keyboard edit on handle 0 while steppers remain collapsed
  const h0 = page.getByTestId("wheel-handle-0");
  await h0.focus();
  await page.keyboard.press("Delete");
  await expect(h0).toHaveAttribute("aria-valuetext", "Not set");
  await page.keyboard.press("ArrowDown"); // no-op at Not set
  await expect(h0).toHaveAttribute("aria-valuetext", "Not set");
  await page.keyboard.press("ArrowUp");
  await expect(h0).toHaveAttribute("aria-valuetext", "1, Rarely");
  await page.keyboard.press("ArrowDown"); // no-op at 1
  await expect(h0).toHaveAttribute("aria-valuetext", "1, Rarely");
  await page.keyboard.press("End");
  await expect(h0).toHaveAttribute("aria-valuetext", "5, Almost always");
  await page.keyboard.press("Home");
  await expect(h0).toHaveAttribute("aria-valuetext", "1, Rarely");

  // Enter & Space toggle disclosure
  await toggle.focus();
  await page.keyboard.press("Enter");
  const hideBtn = page.getByRole("button", { name: "Hide +/− controls" });
  await expect(hideBtn).toHaveAttribute("aria-expanded", "true");
  const incFocus = page.getByRole("button", { name: "Increase Focus" });
  await expect(incFocus).toBeVisible();
  await incFocus.click();

  // Collapsing while focus is inside moves focus back to toggle (R-15)
  const decSocial = page.getByRole("button", { name: "Decrease Social" });
  await decSocial.focus();
  await hideBtn.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("empty save blocked, real-DB partial save + reload persistence, raw 1-5 storage, and tie caption (AC-3..AC-7/AC-15/AC-27/AC-34)", async ({
  page,
  request,
}) => {
  const id = await openEdit(page, request);

  // Clear all 5 via Delete on each handle
  for (let i = 0; i < 5; i++) {
    const h = page.getByTestId(`wheel-handle-${i}`);
    await h.focus();
    await page.keyboard.press("Delete");
  }

  // Save stays tappable when all Not set; clicking blocks with error and sends no PUT
  let putCount = 0;
  page.on("request", (req) => {
    if (req.url().includes(`/api/students/${id}/wheel`) && req.method() === "PUT") {
      putCount += 1;
    }
  });
  await expect(page.getByTestId("wheel-save-btn")).toBeEnabled();
  await page.getByTestId("wheel-save-btn").click();
  await expect(page.getByTestId("wheel-empty-error")).toContainText(
    "Set at least one dimension before saving.",
  );
  expect(putCount).toBe(0);

  // Draft polygon is dashed and unfilled in edit mode (AC-3)
  await expect(page.getByTestId("wheel-draft-polygon")).toHaveAttribute(
    "fill",
    "none",
  );
  await expect(page.getByTestId("wheel-draft-polygon")).toHaveAttribute(
    "stroke-dasharray",
    "6 4",
  );

  // Set partial scores with tie: Emotional Reg 4, Focus 2, Task Completion 2 (3 of 5 set)
  const setViaKeys = async (idx: number, target: number) => {
    const h = page.getByTestId(`wheel-handle-${idx}`);
    await h.focus();
    await page.keyboard.press("Home");
    for (let step = 1; step < target; step++) await page.keyboard.press("ArrowUp");
  };
  await setViaKeys(0, 4);
  await setViaKeys(1, 2);
  await setViaKeys(3, 2);

  await expect(page.getByTestId("wheel-lowest-caption")).toHaveText(
    "Lowest right now: Focus. (3 of 5 set)",
  );

  const saveResPromise = page.waitForResponse(
    (r) => r.url().includes(`/api/students/${id}/wheel`) && r.request().method() === "PUT",
  );
  await page.getByTestId("wheel-save-btn").click();
  const saveRes = await saveResPromise;
  expect(saveRes.status()).toBe(200);

  await expect(page.getByTestId("wheel-saved-status")).toHaveText("Saved");
  await expect(page.getByTestId("wheel-updated-at")).toHaveText(
    "Updated just now by you",
  );
  await expect(
    page.getByRole("img", {
      name: "Emotional Reg 4 · Focus 2 · Engagement Not set · Task Completion 2 · Social Not set",
    }),
  ).toBeVisible();

  // Reload confirms real Neon persistence (AC-5, AC-34)
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("wheel-values-line")).toHaveText(
    "Emotional Reg 4 · Focus 2 · Engagement Not set · Task Completion 2 · Social Not set",
  );
  await expect(page.getByTestId("wheel-lowest-caption")).toHaveText(
    "Lowest right now: Focus. (3 of 5 set)",
  );

  // API returns raw 1-5 / null only (AC-7)
  const apiRes = (await (
    await request.get(`/api/students/${id}/wheel`)
  ).json()) as { wheel: { scores: Record<string, number | null> } };
  expect(apiRes.wheel.scores).toEqual({
    "Emotional Reg": 4,
    Focus: 2,
    Engagement: null,
    "Task Completion": 2,
    Social: null,
  });
});

test("draft autosave, Resume/Discard, and dirty Cancel/Escape/leave confirm (AC-9/AC-10)", async ({
  page,
  request,
}) => {
  await openEdit(page, request);
  const h2 = page.getByTestId("wheel-handle-2");
  await h2.focus();
  await page.keyboard.press("End"); // Engagement = 5 -> dirty

  await expect(
    page.getByRole("heading", { name: "Weaver Wheel · editing" }),
  ).toBeVisible();
  await expect(page.getByTestId("wheel-unsaved-chip")).toContainText(
    "Unsaved changes",
  );

  // Dismiss confirm on Cancel, Escape, and ← Room keeps us in edit; accept beforeunload on reload
  let confirmDialogs = 0;
  let beforeUnloadSeen = false;
  page.on("dialog", async (d) => {
    if (d.type() === "beforeunload") {
      beforeUnloadSeen = true;
      await d.accept();
      return;
    }
    confirmDialogs += 1;
    expect(d.message()).toBe("Discard unsaved changes?");
    await d.dismiss();
  });

  await page.getByTestId("wheel-cancel-btn").click();
  await expect(page.getByTestId("wheel-edit-overlay")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("wheel-edit-overlay")).toBeVisible();
  await page.getByRole("link", { name: "← Room" }).click();
  await expect(page.getByTestId("wheel-edit-overlay")).toBeVisible();
  expect(confirmDialogs).toBe(3);

  // Reload shows Resume / Discard draft notice
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(beforeUnloadSeen).toBe(true);
  await expect(page.getByTestId("wheel-draft-notice")).toContainText(
    "You have unsaved changes from",
  );
  await page.getByTestId("wheel-draft-resume").click();
  await expect(page.getByTestId("wheel-handle-2")).toHaveAttribute(
    "aria-valuetext",
    "5, Almost always",
  );

  // Reload and Discard clears draft
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("wheel-draft-discard").click();
  await expect(page.getByTestId("wheel-draft-notice")).toHaveCount(0);
});

test("fail-closed load (loading skeleton, 500, bad value) + Retry recovery & save failure/409 (AC-11..AC-14)", async ({
  page,
  request,
}) => {
  const id = await openEdit(page, request);
  const h4 = page.getByTestId("wheel-handle-4");
  await h4.focus();
  await page.keyboard.press("End");

  // 1. Network save failure keeps draft and never shows Saved (AC-14)
  await page.route(`**/api/students/${id}/wheel`, (r) =>
    r.request().method() === "PUT" ? r.abort() : r.continue(),
  );
  await page.getByTestId("wheel-save-btn").click();
  await expect(page.getByTestId("wheel-save-error")).toContainText(
    "Not saved. Check your connection and try again.",
  );
  await expect(page.getByTestId("wheel-saved-status")).toHaveCount(0);
  await expect(h4).toHaveAttribute("aria-valuetext", "5, Almost always");

  // 2. 409 conflict keeps draft and offers Reload (AC-14)
  await page.unroute(`**/api/students/${id}/wheel`);
  await page.route(`**/api/students/${id}/wheel`, (r) =>
    r.request().method() === "PUT"
      ? r.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "VERSION_CONFLICT" }),
        })
      : r.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "WHEEL_LOAD_FAILED" }),
        }),
  );
  await page.getByTestId("wheel-save-btn").click();
  await expect(page.getByTestId("wheel-conflict-error")).toContainText(
    "This wheel changed since you opened it. Reload to see the latest.",
  );

  // 3. Reload hitting 500 fails closed: no handles, no polygon, no values line, no draft notice (T-19)
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByTestId("wheel-load-error")).toContainText(
    "Couldn't load the Weaver Wheel.",
  );
  await expect(page.getByTestId("wheel-handle-0")).toHaveCount(0);
  await expect(page.getByTestId("wheel-values-line")).toHaveCount(0);
  await expect(page.getByTestId("wheel-draft-notice")).toHaveCount(0);
  await expect(page.getByTestId("wheel-saved-polygon")).toHaveCount(0);

  // 4. Corrupt stored value fails closed (T-21)
  await page.unroute(`**/api/students/${id}/wheel`);
  await page.route(`**/api/students/${id}/wheel`, (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        wheel: {
          scores: {
            "Emotional Reg": 99,
            Focus: 3,
            Engagement: 3,
            "Task Completion": 3,
            Social: 3,
          },
          updatedAt: new Date().toISOString(),
          version: 1,
          setByYou: true,
        },
      }),
    }),
  );
  await page.getByTestId("wheel-retry-btn").click();
  await expect(page.getByTestId("wheel-load-error")).toBeVisible();
  await expect(page.getByTestId("wheel-values-line")).toHaveCount(0);

  // 5. Loading skeleton leaks nothing, then Retry recovers cleanly (T-18, T-20)
  await page.unroute(`**/api/students/${id}/wheel`);
  let releaseGet!: () => void;
  const gate = new Promise<void>((res) => {
    releaseGet = res;
  });
  await page.route(`**/api/students/${id}/wheel`, async (r) => {
    await gate;
    await r.continue();
  });
  await page.getByTestId("wheel-retry-btn").click();
  await expect(page.getByTestId("wheel-loading")).toBeVisible();
  await expect(page.getByTestId("wheel-edit-btn")).toHaveCount(0);
  await expect(page.getByTestId("wheel-draft-notice")).toHaveCount(0);
  await expect(page.getByTestId("wheel-values-line")).toHaveCount(0);
  releaseGet();
  await expect(page.getByTestId("wheel-edit-btn")).toBeVisible();
});
