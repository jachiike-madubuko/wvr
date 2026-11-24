// Skin tones run light to deep; SKIN_SHADE[i] is the neck/ear shadow for FACES[i].
const FACES = ["#f6d5b8", "#eabf98", "#d49a6a", "#b0764a", "#8a5636", "#5e3a24"];
const SKIN_SHADE = ["#e6bf9e", "#d8a87f", "#bd8456", "#99633a", "#734528", "#4b2d1b"];
const HAIR = ["#2b1d16", "#4a2e1d", "#7a4a26", "#b07a3c", "#d9a94e", "#1c1b22", "#8c3b2a"];
const SHIRTS = ["#3d6cff", "#1ea35a", "#ef5d52", "#f5b400", "#7a5cff"];
const BACKDROPS = ["#dbe6ff", "#d9f2e3", "#ffe1dc", "#fff0c7", "#e8e0ff", "#d8f0f5"];
const BADGES = ["★", "✦", "●", "✧", "◆", "▲"];

export const HAIR_STYLES = ["short", "swoop", "buzz", "curly", "puffs", "long", "bun"] as const;
export const BROWS = ["flat", "arched"] as const;
export const MOUTHS = ["smile", "grin", "small"] as const;
export const EXTRAS = ["none", "none", "glasses", "freckles"] as const;

export type NodeLook = {
  face: string;
  skinShade: string;
  hair: string;
  hairStyle: (typeof HAIR_STYLES)[number];
  brows: (typeof BROWS)[number];
  mouth: (typeof MOUTHS)[number];
  extra: (typeof EXTRAS)[number];
  shirt: string;
  backdrop: string;
  badge: string;
};

// Spreads one seed hash into independent picks so traits do not move together.
function mix(h: number, salt: number): number {
  let x = (h ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

export function nodeLook(seed: string): NodeLook {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const pick = <T,>(list: readonly T[], salt: number): T => list[mix(h, salt) % list.length]!;
  const skin = mix(h, 0) % FACES.length;
  return {
    face: FACES[skin]!,
    skinShade: SKIN_SHADE[skin]!,
    hair: pick(HAIR, 1),
    hairStyle: pick(HAIR_STYLES, 2),
    brows: pick(BROWS, 3),
    mouth: pick(MOUTHS, 4),
    extra: pick(EXTRAS, 5),
    shirt: pick(SHIRTS, 6),
    backdrop: pick(BACKDROPS, 7),
    badge: pick(BADGES, 8),
  };
}
