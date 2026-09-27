import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { loadEnv } from "@/lib/env";

/* Self-hosted at build time by next/font (spec §13: licensed, self-hosted sans; two families). */
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading", display: "swap" });

function safeOrigin(): URL | undefined {
  try {
    return new URL(loadEnv().APP_ORIGIN);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: safeOrigin(),
  title: { default: "Corporate Gifting Hub — Corporate gifts, welcome kits and branded merchandise", template: "%s · Corporate Gifting Hub" },
  description: "Corporate gifts and welcome kits selected around your occasion, quantity and budget. Shortlist, send requirements, receive one tailored quotation.",
  openGraph: { siteName: "Corporate Gifting Hub", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${body.variable} ${heading.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
