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
  title: "Rutina — Kebun Kebiasaan",
  description:
    "Redesain total Rutina: kebun kebiasaan interaktif dengan shadcn/ui sebagai kerangka, Motion untuk animasi pegas, dan anime.js untuk koreografi tanaman yang tumbuh.",
  keywords: [
    "Rutina",
    "habit tracker",
    "kebiasaan",
    "shadcn/ui",
    "Motion",
    "anime.js",
    "animasi",
  ],
  authors: [{ name: "Rutina" }],
  icons: {
    icon: "/icons/icon.svg",
  },
  openGraph: {
    title: "Rutina — Kebun Kebiasaan",
    description:
      "Sirami kebiasaanmu, tumbuhkan tanaman, pantau runtun dan statistiknya.",
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
