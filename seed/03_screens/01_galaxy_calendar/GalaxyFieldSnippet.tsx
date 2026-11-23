// Galaxy background wrapper – renders the field, liquid ether effect, and GSAP animation loop
// Source: web/src/components/room/GalaxyField.tsx (full component)

"use client";
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// Lazy‑load heavy visual helpers (no SSR)
const GalaxyGsapLoop = dynamic(
  () => import("./GalaxyGsapLoop").then((mod) => mod.GalaxyGsapLoop),
  { ssr: false },
);
const LiquidEther = dynamic(() => import("./LiquidEther"), { ssr: false });

// Colours for the ether disc effect behind the groups
const ETHER_COLORS = ["#5227FF", "#FF9FFC", "#B497CF"];

export function GalaxyField({ children }: { children: ReactNode }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(false);

  // Detect dark theme from ancestor
  useEffect(() => {
    setDark(Boolean(fieldRef.current?.closest(".wv-dark")));
  }, []);

  // Resize the field to fill the viewport beneath the page header
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const fit = () => {
      const top = field.getBoundingClientRect().top + window.scrollY;
      field.style.setProperty(
        "--field-h",
        `${Math.max(480, window.innerHeight - top - 24)}px`,
      );
    };
    fit();
    window.addEventListener("resize", fit);
    const page = field.closest(".wv-page");
    const observer =
      page && typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (page) observer?.observe(page);
    return () => {
      window.removeEventListener("resize", fit);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={fieldRef} className="wv-field wv-field--gsap">
      {/* LiquidEther renders a soft, animated nebula‑like background behind the groups */}
      <div className="wv-field-ether" aria-hidden="true">
        <LiquidEther
          colors={ETHER_COLORS}
          lightMode={!dark}
          mouseForce={20}
          cursorSize={65}
          persistence={0.75}
          autoDemo
          autoSpeed={0.5}
          autoIntensity={2.2}
        />
      </div>
      {/* GSAP loop animates the floating student nodes */}
      <GalaxyGsapLoop fieldRef={fieldRef} />
      {/* The actual UI (pack chips, nodes, etc.) is passed as children */}
      {children}
    </div>
  );
}
