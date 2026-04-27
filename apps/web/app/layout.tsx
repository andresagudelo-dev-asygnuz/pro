import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://pro-web.vercel.app",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "PRO — Comunidad deportiva",
    description:
      "Encontrá con quién jugar tu próximo partido. Organizá y sumate a partidos cerca tuyo.",
  },
  icons: {
    icon: "/favicon.svg",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
