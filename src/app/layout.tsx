import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weavr — Room 204",
  description: "Calendar-first, standards-aware, interest-personalized teacher room.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#05070e] text-[#f6f1ea] antialiased">{children}</body>
    </html>
  );
}
