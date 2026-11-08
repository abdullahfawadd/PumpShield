import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import "./editorial.css";
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
export const metadata: Metadata = {
  title: {
    default: "PumpShield — Every litre, accounted for.",
    template: "%s · PumpShield",
  },
  description:
    "Independent fuel-station operations. Delivery verification, shift reconciliation, and digital credit in one secure workspace.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171916",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable}`}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
