export const POPOVER_GAP = 12;
export const VIEWPORT_PAD = 16;
export const TOP_SAFE = 70; // keep clear of the sticky room header

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type Placement = {
  x: number;
  y: number;
  side: "right" | "left" | "below";
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Places the Galaxy hover popover beside the full student node rect without
 * overlapping it: right when room exists, left near the right edge, or below
 * on very narrow viewports.
 */
export function placePopover(
  node: Rect,
  pop: { width: number; height: number },
  vp: { width: number; height: number },
): Placement {
  const y = clamp(
    node.top + node.height / 2 - pop.height / 2,
    TOP_SAFE,
    vp.height - pop.height - VIEWPORT_PAD,
  );

  const rightX = node.right + POPOVER_GAP;
  if (rightX + pop.width <= vp.width - VIEWPORT_PAD) {
    return { x: rightX, y, side: "right" };
  }

  const leftX = node.left - POPOVER_GAP - pop.width;
  if (leftX >= VIEWPORT_PAD) {
    return { x: leftX, y, side: "left" };
  }

  // Very narrow viewport: drop below the node rather than cover it.
  return {
    x: clamp(node.left, VIEWPORT_PAD, vp.width - pop.width - VIEWPORT_PAD),
    y: node.bottom + POPOVER_GAP,
    side: "below",
  };
}
