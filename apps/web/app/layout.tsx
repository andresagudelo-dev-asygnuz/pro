import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { CookieConsent } from "@/components/ui/cookie-consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://pro-sport.app",
  ),
  title: "PRO. — Vive el deporte al siguiente nivel",
  description:
    "La plataforma definitiva para deportistas de élite. Organiza, compite y domina tu ciudad con PRO.",
  keywords: [
    "deporte",
    "manizales",
    "fútbol",
    "pádel",
    "tenis",
    "comunidad deportiva",
    "matching deportivo",
  ],
  openGraph: {
    title: "PRO. — Vive el deporte al siguiente nivel",
    description:
      "La plataforma definitiva para deportistas de élite. Organiza, compite y domina tu ciudad con PRO.",
    type: "website",
    siteName: "PRO.",
    locale: "es",
    images: [
      {
        url: "https://pro-sport.app/og-image.png?v=7",
        width: 1200,
        height: 630,
        alt: "PRO. — Vive el deporte al siguiente nivel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PRO. — Vive el deporte al siguiente nivel",
    description:
      "La plataforma definitiva para deportistas de élite. Organiza, compite y domina tu ciudad con PRO.",
    images: ["https://pro-sport.app/og-image.png?v=7"],
  },
  icons: {
    icon: [
      { url: "/favicon.png?v=7" },
      { url: "/favicon.png?v=7", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/favicon.png?v=7" },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        {/* GTM Consent Mode v2 Default State */}
        <Script
          id="gtm-consent-default"
          strategy="afterInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied',
              'wait_for_update': 500
            });
          `}
        </Script>

        {/* Google Tag Manager */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
        >
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-NFD8FPL5');
          `}
        </Script>

        {/* Google Analytics (GA4) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-HNY2G15CH3"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HNY2G15CH3');
          `}
        </Script>
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "whtz16v78m");
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NFD8FPL5"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <CookieConsent />
        <Toaster />
      </body>
    </html>
  );
}
