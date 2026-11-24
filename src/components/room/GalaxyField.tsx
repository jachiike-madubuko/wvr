"use client";

import dynamic from "next/dynamic";
import type { ReactNode, RefObject } from "react";

const GalaxyBackground = dynamic(() => import("./GalaxyBackground"), {
  ssr: false,
});

const GalaxyGsapLoop = dynamic(
  () => import("./GalaxyGsapLoop").then((m) => m.GalaxyGsapLoop),
  { ssr: false },
);

const STAR_COLORS = ["#fff6e0", "#ffd27a", "#ffb35c"];

export function GalaxyField({
  fieldRef,
  children,
}: {
  fieldRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div
      ref={fieldRef}
      className="relative min-h-[calc(100vh-56px)] w-full overflow-hidden px-6 py-8"
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
          clickWarp
          starColors={STAR_COLORS}
          twinkleIntensity={0.4}
          speed={0.1}
          rotationSpeed={0.02}
          layers={3}
          direction="backward"
          mouseInteraction={false}
          repulsionStrength={0.4}
        />
      </div>
      {fieldRef && <GalaxyGsapLoop fieldRef={fieldRef} />}
      <div className="relative z-10 mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
