"use client";

import { useId } from "react";
import { CollectibleOverlay } from "@/components/avatars/CollectibleSvg";
import { type NodeLook, nodeLook } from "@/lib/avatars/look";
import type { EquippedLoadout } from "@/lib/collectibles/catalog";

const INK = "#2b211a";

// Front hair shapes, drawn over the head. Coordinates are in the 44x44 viewBox.
const CAP =
  "M11 21C10 12 15 7.5 22 7.5C29.5 7.5 34 12 33 21C30.5 15 26.5 13 22 13C17.5 13 13.5 15 11 21Z";
const SWOOP =
  "M11 20C10 11 15.5 7 22.5 7C30 7 34.5 12 33 20C32 15.5 30 13 27 12.5C23 14.5 17 15.5 12.5 16.5C11.6 17.5 11.2 18.7 11 20Z";
const BUZZ =
  "M11.6 18C11.8 11.5 16 8.3 22 8.3C28 8.3 32.2 11.5 32.4 18C30 14 26.5 12.2 22 12.2C17.5 12.2 14 14 11.6 18Z";
const LONG_BACK =
  "M10 22C9 12 14.5 6.5 22 6.5C29.5 6.5 35 12 34 22L35 34C33 35 30.5 35 29 34L30 20H14L15 34C13.5 35 11 35 9 34Z";
const CURLS: Array<[number, number, number]> = [
  [12.5, 18.5, 3],
  [13, 14, 4],
  [16.5, 10, 4.5],
  [22, 8.2, 5],
  [27.5, 10, 4.5],
  [31, 14, 4],
  [31.5, 18.5, 3],
];

function BackHair({ look }: { look: NodeLook }) {
  switch (look.hairStyle) {
    case "long":
      return <path d={LONG_BACK} fill={look.hair} />;
    case "bun":
      return <circle cx={22} cy={6.5} r={4.6} fill={look.hair} />;
    case "puffs":
      return (
        <>
          <circle cx={10.5} cy={11} r={5.4} fill={look.hair} />
          <circle cx={33.5} cy={11} r={5.4} fill={look.hair} />
        </>
      );
    default:
      return null;
  }
}

function FrontHair({ look }: { look: NodeLook }) {
  switch (look.hairStyle) {
    case "swoop":
      return <path d={SWOOP} fill={look.hair} />;
    case "buzz":
    case "puffs":
      return <path d={BUZZ} fill={look.hair} />;
    case "curly":
      return (
        <g fill={look.hair}>
          {CURLS.map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      );
    default:
      return <path d={CAP} fill={look.hair} />;
  }
}

function Mouth({ look }: { look: NodeLook }) {
  if (look.mouth === "grin") {
    return (
      <>
        <path d="M18.6 25.8Q22 30.6 25.4 25.8Z" fill="#6b2f28" />
        <path
          d="M19.4 26.2H24.6Q24.3 27.1 22 27.1Q19.7 27.1 19.4 26.2Z"
          fill="#fff"
        />
      </>
    );
  }
  const d =
    look.mouth === "small"
      ? "M20.4 26.9Q22 28 23.6 26.9"
      : "M18.9 26.2Q22 29.2 25.1 26.2";
  return (
    <path
      d={d}
      fill="none"
      stroke={INK}
      strokeWidth={1.25}
      strokeLinecap="round"
    />
  );
}

function Brows({ look }: { look: NodeLook }) {
  const left =
    look.brows === "arched"
      ? "M16.2 18.1Q17.9 16.5 19.7 17.6"
      : "M16.4 17.7L19.6 17.3";
  const right =
    look.brows === "arched"
      ? "M24.3 17.6Q26.1 16.5 27.8 18.1"
      : "M24.4 17.3L27.6 17.7";
  return (
    <g fill="none" stroke={look.hair} strokeWidth={1.2} strokeLinecap="round">
      <path d={left} />
      <path d={right} />
    </g>
  );
}

function Extra({
  look,
  suppressGlasses,
}: {
  look: NodeLook;
  suppressGlasses: boolean;
}) {
  if (look.extra === "glasses" && !suppressGlasses) {
    return (
      <g fill="rgb(255 255 255 / 0.18)" stroke={INK} strokeWidth={0.95}>
        <circle cx={18} cy={21.6} r={3.1} />
        <circle cx={26} cy={21.6} r={3.1} />
        <path d="M21.1 21.4H22.9" fill="none" />
      </g>
    );
  }
  if (look.extra === "freckles") {
    return (
      <g fill={INK} opacity={0.28}>
        <circle cx={15.6} cy={24.2} r={0.45} />
        <circle cx={16.9} cy={25} r={0.45} />
        <circle cx={15.4} cy={25.7} r={0.45} />
        <circle cx={28.4} cy={24.2} r={0.45} />
        <circle cx={27.1} cy={25} r={0.45} />
        <circle cx={28.6} cy={25.7} r={0.45} />
      </g>
    );
  }
  return null;
}

/**
 * Seeded cartoon student bust drawn as inline SVG with equippable collectible
 * gear layered outside the circular portrait clipPath.
 */
export function StudentAvatar({
  look,
  equipped,
  blinkDelay = "0s",
}: {
  look: NodeLook;
  equipped?: EquippedLoadout;
  blinkDelay?: string;
}) {
  const clipId = useId();
  const hasEyewear = Boolean(equipped?.eyewear);

  return (
    <svg
      className="wv-node-avatar"
      viewBox="0 0 44 44"
      style={{ overflow: "visible" }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={22} cy={22} r={22} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect width={44} height={44} fill={look.backdrop} />
        <path
          d="M5 46C5 36 12.5 31 22 31C31.5 31 39 36 39 46Z"
          fill={look.shirt}
        />
        <path
          d="M18.4 31.4L22 35.2L25.6 31.4"
          fill="none"
          stroke="#fff"
          strokeOpacity={0.6}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
        <BackHair look={look} />
        <rect
          x={18.6}
          y={26}
          width={6.8}
          height={6.6}
          rx={2.4}
          fill={look.skinShade}
        />
        <circle cx={11.6} cy={21.8} r={2.5} fill={look.skinShade} />
        <circle cx={32.4} cy={21.8} r={2.5} fill={look.skinShade} />
        <ellipse cx={22} cy={20} rx={10.6} ry={11.4} fill={look.face} />
        <FrontHair look={look} />
        <Brows look={look} />
        <g className="wv-node-eye" style={{ animationDelay: blinkDelay }}>
          <ellipse cx={18} cy={21.6} rx={1.35} ry={1.75} fill={INK} />
          <circle cx={18.45} cy={21} r={0.45} fill="#fff" />
        </g>
        <g className="wv-node-eye" style={{ animationDelay: blinkDelay }}>
          <ellipse cx={26} cy={21.6} rx={1.35} ry={1.75} fill={INK} />
          <circle cx={26.45} cy={21} r={0.45} fill="#fff" />
        </g>
        <circle cx={15.4} cy={25.4} r={1.9} fill="#ff7a6b" opacity={0.28} />
        <circle cx={28.6} cy={25.4} r={1.9} fill="#ff7a6b" opacity={0.28} />
        <Extra look={look} suppressGlasses={hasEyewear} />
        <Mouth look={look} />
      </g>

      {equipped?.eyewear && <CollectibleOverlay itemId={equipped.eyewear} />}
      {equipped?.hat && <CollectibleOverlay itemId={equipped.hat} />}
      {equipped?.pet && <CollectibleOverlay itemId={equipped.pet} />}
    </svg>
  );
}

const HALO_SIZES = {
  sm: { halo: 44, face: 32 },
  md: { halo: 62, face: 44 },
  lg: { halo: 96, face: 68 },
} as const;

export type StudentAvatarHaloSize = keyof typeof HALO_SIZES;

export function StudentAvatarHalo({
  seed,
  look,
  equipped,
  ringColor = "#38bdf8",
  badge,
  size = "md",
  blinkDelay,
  className,
}: {
  seed: string;
  look?: NodeLook;
  equipped?: EquippedLoadout;
  ringColor?: string;
  badge?: string;
  size?: StudentAvatarHaloSize;
  blinkDelay?: string;
  className?: string;
}) {
  const resolvedLook = look ?? nodeLook(seed);
  const dims = HALO_SIZES[size];
  const resolvedBadge = badge ?? resolvedLook.badge;

  return (
    <span
      className={className ? `wv-node-halo ${className}` : "wv-node-halo"}
      data-size={size}
      style={{
        width: dims.halo,
        height: dims.halo,
        borderColor: ringColor,
      }}
    >
      <span
        className="wv-node-face"
        style={{ width: dims.face, height: dims.face }}
      >
        <StudentAvatar
          look={resolvedLook}
          equipped={equipped}
          blinkDelay={blinkDelay}
        />
        <span className="wv-node-visor" aria-hidden="true" />
      </span>
      <span className="wv-node-base" aria-hidden="true" />
      <span className="wv-node-badge" aria-hidden="true">
        {resolvedBadge}
      </span>
    </span>
  );
}
