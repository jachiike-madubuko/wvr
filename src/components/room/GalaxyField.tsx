"use client";

import dynamic from "next/dynamic";
import type { ReactNode, RefObject } from "react";

const GalaxyBackground = dynamic(() => import("./GalaxyBackground"), {
  ssr: false,
});

const STAR_COLORS = ["#fff6e0", "#ffd27a", "#ffb35c"];

export function GalaxyField({
  fieldRef,
  paused = false,
  children,
}: {
  fieldRef?: RefObject<HTMLDivElement | null>;
  paused?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      ref={fieldRef}
      className="relative flex h-full w-full flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5"
    >
      {/* Instant SSR / no-WebGL CSS fallback */}
      <div className="wv-stars" aria-hidden="true" />
      <div className="wv-nebula" aria-hidden="true" />
      {/* React Bits WebGL2 Galaxy background */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        <GalaxyBackground
          density={1.6}
          glowIntensity={0.5}
          flareIntensity={1}
          starSpeed={0.25}
          mouseRepulsion={false}
          clickWarp={false}
          intro={false}
          starColors={STAR_COLORS}
          twinkleIntensity={0.4}
          speed={0.1}
          rotationSpeed={0.02}
          layers={3}
          direction="backward"
          mouseInteraction={false}
          repulsionStrength={0.4}
          disableAnimation={paused}
        />
      </div>
      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
