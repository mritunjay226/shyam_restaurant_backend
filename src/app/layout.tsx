import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { TitleBar } from "../components/titleBar";
import { ElectronBodyPadding } from "@/components/electronBodyPadding";

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
        ["--font-display" as string]: "var(--font-cormorant)",
        ["--font-body" as string]: "var(--font-dm-sans)",
      } as React.CSSProperties}
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
      >
        <ConvexClientProvider>
          <TooltipProvider>
            {/* Fixed titlebar — only visible in Electron, invisible in browser */}
            <TitleBar />

            {/* Pushes ALL content down by 36px in Electron only, does nothing in browser */}
            <ElectronBodyPadding>
              <Toaster richColors position="top-right" />
              {children}
            </ElectronBodyPadding>
          </TooltipProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}