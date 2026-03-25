import type { Metadata } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "PaperMarket",
    template: "%s | PaperMarket",
  },
  description:
    "PaperMarket is a premium paper-trading prediction market with live-style pricing, simulated execution, and zero real money.",
  applicationName: "PaperMarket",
  keywords: [
    "paper trading",
    "prediction market",
    "simulated trading",
    "polished dark dashboard",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${ibmPlexMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
