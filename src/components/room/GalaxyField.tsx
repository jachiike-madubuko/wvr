"use client";

import dynamic from "next/dynamic";
import type { ReactNode, RefObject } from "react";

const GalaxyGsapLoop = dynamic(
  () => import("./GalaxyGsapLoop").then((m) => m.GalaxyGsapLoop),
  { ssr: false },
);

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
      {/* Background slot: pure CSS starfield/nebula until custom GalaxyBackground is provided */}
      <div className="wv-stars" aria-hidden="true" />
      <div className="wv-nebula" aria-hidden="true" />
      {fieldRef && <GalaxyGsapLoop fieldRef={fieldRef} />}
      <div className="relative z-10 mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
