import type { Metadata, Viewport } from "next";
import { Poppins, Roboto_Mono } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

// Falls back through Vercel's auto-injected deployment URL env vars so the
// og:image tag resolves to an absolute URL in every environment (prod,
// preview, local) without needing a hardcoded domain.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

const SITE_NAME = "Zekindo Laboratory Information Management System";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: "Laboratory Information Management System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zekindo LIMS",
  },
  // This is an authenticated internal LIMS plus a token-gated client portal —
  // nothing here is meant to be discoverable via search, so block indexing
  // outright rather than leaving it to per-page opt-outs.
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b8db8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${robotoMono.variable} antialiased`}>
      <body className="min-h-full flex flex-col bg-page-bg">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
