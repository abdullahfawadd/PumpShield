import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";
import "./editorial.css";
import "./login.css";
import "./operations.css";
import "./field.css";
import "./workspace.css";
import "./workflow-refinement.css";
import "./overview.css";
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
  appleWebApp: {
    capable: true,
    title: "PumpShield",
    statusBarStyle: "default",
  },
  icons: { apple: "/brand/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#174C45",
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
        <Providers>{children}<Toaster position="bottom-right" richColors /></Providers>
      </body>
    </html>
  );
}
