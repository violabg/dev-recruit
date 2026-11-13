import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Geist_Mono,
  IBM_Plex_Sans,
} from "next/font/google";
import type React from "react";
import { Toaster } from "sonner";
import "./globals.css";

/** UI + body text: engineered, highly legible, tabular figures available */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  axes: ["wdth"],
});

/** Display: titles and pipeline numbers (set condensed via font-stretch) */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevRecruit AI",
  description: "AI-powered technical recruitment platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "oklch(0.962 0.009 247)",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "oklch(0.185 0.028 257)",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${plexSans.variable} ${bricolage.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="bg-background min-h-dvh font-sans text-foreground antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* shadcn: a single app-wide provider shares tooltip delay state */}
          <TooltipProvider>
            <div className="relative min-h-dvh">{children}</div>
          </TooltipProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
