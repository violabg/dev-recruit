import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from "next/font/google";
import type React from "react";
import { Toaster } from "sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});
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
    {
      media: "(prefers-color-scheme: light)",
      color: "oklch(0.984 0.003 247.858)",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "oklch(0.208 0.042 265.755)",
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
      className={plusJakartaSans.variable}
      suppressHydrationWarning
    >
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${plusJakartaSans.variable} bg-background min-h-dvh font-sans text-foreground antialiased`}
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
