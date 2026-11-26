import { expect, test } from "vitest";
import {
  POPOVER_GAP,
  TOP_SAFE,
  VIEWPORT_PAD,
  placePopover,
  type Rect,
} from "@/components/room/galaxy-popover-position";

function intersects(a: Rect, b: Rect): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

function popRect(p: { x: number; y: number }, pop: { width: number; height: number }): Rect {
  return {
    left: p.x,
    top: p.y,
    right: p.x + pop.width,
    bottom: p.y + pop.height,
    width: pop.width,
    height: pop.height,
  };
}

test("places popover to the right of the student node with 12px gap when room exists", () => {
  const node: Rect = { left: 200, top: 240, right: 290, bottom: 350, width: 90, height: 110 };
  const pop = { width: 224, height: 150 };
  const vp = { width: 1280, height: 800 };

  const p = placePopover(node, pop, vp);
  expect(p.side).toBe("right");
  expect(p.x).toBe(node.right + POPOVER_GAP);
  expect(intersects(node, popRect(p, pop))).toBe(false);
});

test("flips popover to the left near the right viewport edge without overlapping node", () => {
  const node: Rect = { left: 1080, top: 240, right: 1170, bottom: 350, width: 90, height: 110 };
  const pop = { width: 224, height: 150 };
  const vp = { width: 1280, height: 800 };

  const p = placePopover(node, pop, vp);
  expect(p.side).toBe("left");
  expect(p.x + pop.width).toBe(node.left - POPOVER_GAP);
  expect(p.x).toBeGreaterThanOrEqual(VIEWPORT_PAD);
  expect(intersects(node, popRect(p, pop))).toBe(false);
});

test("falls back below the node on narrow viewports without overlapping node", () => {
  const node: Rect = { left: 150, top: 180, right: 240, bottom: 290, width: 90, height: 110 };
  const pop = { width: 224, height: 150 };
  const vp = { width: 390, height: 844 };

  const p = placePopover(node, pop, vp);
  expect(p.side).toBe("below");
  expect(p.y).toBe(node.bottom + POPOVER_GAP);
  expect(intersects(node, popRect(p, pop))).toBe(false);
});

test("clamps vertical position below TOP_SAFE and above bottom viewport padding", () => {
  const pop = { width: 224, height: 150 };
  const vp = { width: 1280, height: 700 };

  const topNode: Rect = { left: 120, top: 10, right: 200, bottom: 110, width: 80, height: 100 };
  const pTop = placePopover(topNode, pop, vp);
  expect(pTop.y).toBeGreaterThanOrEqual(TOP_SAFE);
  expect(intersects(topNode, popRect(pTop, pop))).toBe(false);

  const bottomNode: Rect = { left: 120, top: 580, right: 200, bottom: 680, width: 80, height: 100 };
  const pBot = placePopover(bottomNode, pop, vp);
  expect(pBot.y + pop.height).toBeLessThanOrEqual(vp.height - VIEWPORT_PAD);
  expect(intersects(bottomNode, popRect(pBot, pop))).toBe(false);
});
