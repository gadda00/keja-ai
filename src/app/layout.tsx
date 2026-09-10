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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
