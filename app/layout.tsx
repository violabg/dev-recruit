import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata, Viewport } from "next";
import {
  Figtree,
  Geist,
  Geist_Mono,
  Outfit,
  Space_Grotesk,
} from "next/font/google";
import type React from "react";
import { Toaster } from "sonner";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-tech",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    { media: "(prefers-color-scheme: light)", color: "oklch(0.98 0.005 210)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.12 0.015 240)" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={figtree.variable} suppressHydrationWarning>
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${spaceGrotesk.variable} ${figtree.variable} bg-background min-h-dvh font-sans text-foreground antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative min-h-dvh">{children}</div>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
