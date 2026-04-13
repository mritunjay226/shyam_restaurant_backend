import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

// Wire as CSS variables so --font-display and --font-body tokens resolve
const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cormorant",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Shyam Hotel — Admin Panel",
  description: "Hotel & Restaurant Management System — Shyam Hotel, Prayagraj",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shyam Hotel",
  },
};

export const viewport: import("next").Viewport = {
  themeColor: "#F3F4F8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", cormorant.variable, dmSans.variable)}
      style={{
        // Map font variables to our design tokens
        ["--font-display" as string]: "var(--font-cormorant)",
        ["--font-body" as string]: "var(--font-dm-sans)",
      } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
        <ConvexClientProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            {children}
          </TooltipProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
