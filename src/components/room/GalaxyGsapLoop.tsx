"use client";

import gsap from "gsap";
import { useEffect, type RefObject } from "react";

export function GalaxyGsapLoop({
  fieldRef,
}: {
  fieldRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const root = fieldRef.current;
    if (!root || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const nodes = gsap.utils.toArray<HTMLElement>(
        ".wv-student-node:not([data-dragging='true'])",
      );
      nodes.forEach((node, idx) => {
        gsap.to(node, {
          y: idx % 2 === 0 ? -4 : 4,
          x: idx % 3 === 0 ? 3 : -3,
          duration: 2.6 + (idx % 3) * 0.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: (idx % 4) * 0.25,
        });
      });
    }, root);

    return () => ctx.revert();
  }, [fieldRef]);

  return null;
}
