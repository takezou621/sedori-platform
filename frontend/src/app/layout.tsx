import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/accessibility.css";
import { Header, Footer } from "@/components/layout";
import { OrganizationStructuredData, WebsiteStructuredData } from "@/components/seo/StructuredData";
import { QueryProvider } from "@/providers";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OfflineNotice } from "@/components/ui/OfflineNotice";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3005"),
  title: "Sedori Platform",
  description: "Your comprehensive platform for product sourcing, sales tracking, and business intelligence",
  keywords: "product sourcing, sales tracking, business intelligence, sedori, inventory management",
  authors: [{ name: "Sedori Platform Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  openGraph: {
    title: "Sedori Platform",
    description: "Your comprehensive platform for product sourcing, sales tracking, and business intelligence",
    url: "https://your-domain.com",
    siteName: "Sedori Platform",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sedori Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sedori Platform",
    description: "Your comprehensive platform for product sourcing, sales tracking, and business intelligence",
    images: ["/twitter-image.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" dir="ltr" suppressHydrationWarning>
      <head>
        <OrganizationStructuredData />
        <WebsiteStructuredData />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors`}>
        <ErrorBoundary>
          <ThemeProvider>
            <QueryProvider>
              <OfflineNotice />
              <a href="#main-content" className="skip-nav">
                メインコンテンツにスキップ
              </a>
              <Header />
              <main id="main-content" className="flex-1" role="main">
                {children}
              </main>
              <Footer />
              <div id="live-region" className="live-region" aria-live="polite" aria-atomic="true"></div>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
