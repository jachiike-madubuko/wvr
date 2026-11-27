export const MOSAIC_ROW_UNIT = 4;
export const MOSAIC_GAP = 16;
export const MOSAIC_MIN_HEIGHT = 136;
export const MOSAIC_MAX_HEIGHT = 236;

function hashString32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Murmur3 fmix32 avalanche finalizer for spread across short/similar IDs
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Deterministic tile height in [MOSAIC_MIN_HEIGHT, MOSAIC_MAX_HEIGHT] as a
 * multiple of MOSAIC_ROW_UNIT (4px). Uses an integer avalanche hash so SSR and
 * client renders always agree without Math.random().
 */
export function mosaicTileHeight(blockId: string, seed?: string): number {
  const stepCount =
    Math.floor((MOSAIC_MAX_HEIGHT - MOSAIC_MIN_HEIGHT) / MOSAIC_ROW_UNIT) + 1;
  const key = seed ? `${seed}:${blockId}` : blockId;
  const step = hashString32(key) % stepCount;
  return MOSAIC_MIN_HEIGHT + step * MOSAIC_ROW_UNIT;
}

/**
 * Number of MOSAIC_ROW_UNIT (4px) grid rows a tile needs so its rendered
 * height plus the MOSAIC_GAP (16px) vertical spacing aligns to the grid.
 */
export function mosaicRowSpan(heightPx: number): number {
  return Math.ceil((heightPx + MOSAIC_GAP) / MOSAIC_ROW_UNIT);
}
