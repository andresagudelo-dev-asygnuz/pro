import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

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
  title: {
    default: "PRO — Comunidad deportiva",
    template: "%s · PRO",
  },
  description:
    "Encontrá con quién jugar tu próximo partido. Organizá, sumate y conocé deportistas de tu nivel y ciudad.",
  applicationName: "PRO",
  keywords: [
    "deportes",
    "fútbol",
    "pádel",
    "tenis",
    "comunidad deportiva",
    "matching deportivo",
  ],
  openGraph: {
    title: "PRO — Comunidad deportiva",
    description:
      "Encontrá con quién jugar tu próximo partido. Organizá, sumate y conocé deportistas de tu nivel y ciudad.",
    type: "website",
    siteName: "PRO",
    locale: "es",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PRO — Comunidad deportiva",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PRO — Comunidad deportiva",
    description:
      "Encontrá con quién jugar tu próximo partido. Organizá y sumate a partidos cerca tuyo.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { CookieConsent } from "@/components/ui/cookie-consent";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-HNY2G15CH3"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-HNY2G15CH3');
            `,
          }}
        />
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-NFD8FPL5');
            `,
          }}
        />
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
