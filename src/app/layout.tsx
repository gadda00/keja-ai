import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://keja.app"),
  title: {
    default: "Keja AI — Africa's Real Estate Intelligence & Trust Infrastructure",
    template: "%s · Keja AI",
  },
  description:
    "Discover. Verify. Analyse. Finance. Invest. Transact. Manage. Keja AI is the intelligent, trusted ecosystem for every stakeholder in African real estate — buyers, sellers, landlords, tenants, investors, developers, banks and institutions.",
  keywords: [
    "Keja AI",
    "Kenya real estate",
    "Africa real estate",
    "property verification",
    "trust score",
    "property investment",
    "tokenization",
    "Nairobi property",
    "AI property advisor",
    "diaspora investment",
  ],
  authors: [{ name: "Chacadom Investments" }],
  applicationName: "Keja AI",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Keja AI",
  },
  formatDetection: { telephone: false, date: false, address: false },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Keja AI — Africa's Real Estate Intelligence & Trust Infrastructure",
    description:
      "Discover. Verify. Analyse. Finance. Invest. Transact. Manage — one intelligent ecosystem for African real estate.",
    url: "https://keja.app",
    siteName: "Keja AI",
    type: "website",
    locale: "en_KE",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Keja AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keja AI — Africa's Real Estate Intelligence & Trust Infrastructure",
    description:
      "Discover. Verify. Analyse. Finance. Invest. Transact. Manage — one intelligent ecosystem for African real estate.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#10201b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * iOS Safari standalone launch screens — one apple-touch-startup-image per
 * device class (the PWA shows this while hydrating instead of a white
 * flash). Android/Chrome uses manifest background_color + theme_color.
 * Regenerate the PNGs with: node scripts/generate-pwa-assets.mjs
 */
const IOS_SPLASHES: Array<[w: number, h: number, dpr: number]> = [
  [375, 667, 2], [414, 736, 3], [375, 812, 3], [414, 896, 2], [414, 896, 3],
  [390, 844, 3], [428, 926, 3], [393, 852, 3], [430, 926, 3], [402, 874, 3],
  [440, 956, 3],
  [768, 1024, 2], [810, 1080, 2], [820, 1180, 2], [834, 1194, 2],
  [1024, 1366, 2], [834, 1194, 3],
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Legacy iOS (≤15) honours the prefixed form; Next 16 emits only the
            unprefixed mobile-web-app-capable. Belt and braces — both set. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {IOS_SPLASHES.map(([w, h, dpr]) => (
          <link
            key={`${w}x${h}@${dpr}`}
            rel="apple-touch-startup-image"
            media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr})`}
            href={`/splash/apple-touch-startup-${w * dpr}x${h * dpr}.png`}
          />
        ))}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            {children}
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
