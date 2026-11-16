import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Studio Komponen — Motion + anime.js + shadcn/ui",
  description:
    "Demo interaktif satu halaman: shadcn/ui sebagai kerangka antarmuka, Motion untuk animasi pegas, dan anime.js untuk koreografi lini masa serta SVG.",
  keywords: [
    "shadcn/ui",
    "Motion",
    "anime.js",
    "komponen React",
    "animasi",
    "demo",
    "Rutina",
  ],
  authors: [{ name: "Rutina" }],
  icons: {
    icon: "/icons/icon.svg",
  },
  openGraph: {
    title: "Studio Komponen",
    description:
      "Satu halaman, tiga pustaka — demo Motion, anime.js, dan shadcn/ui",
    siteName: "Rutina",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors closeButton position="bottom-right" />
      </body>
    </html>
  );
}
