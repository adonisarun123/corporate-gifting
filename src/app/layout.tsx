import type { Metadata } from "next";
import "./globals.css";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_ORIGIN),
  title: { default: "Corporate Gifting Hub", template: "%s · Corporate Gifting Hub" },
  description: "Corporate gifts and welcome kits selected around your occasion, quantity and budget. Shortlist, send requirements, receive a tailored quotation.",
  openGraph: { siteName: "Corporate Gifting Hub", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
