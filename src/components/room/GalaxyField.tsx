"use client";

import type { ReactNode, RefObject } from "react";

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
      <div className="relative z-10 mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
