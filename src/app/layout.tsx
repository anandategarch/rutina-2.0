import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  title: "Rutina CSS Lab — Kebun Efek CSS",
  description:
    "Perpustakaan efek CSS murni bertema taman botani Rutina: demo hidup dan kode siap salin untuk tombol, loader, teks, latar, kartu, input, toggle, dan animasi.",
  keywords: [
    "Rutina",
    "CSS effects",
    "CSS library",
    "animasi CSS",
    "efek CSS",
    "code snippet",
  ],
  authors: [{ name: "Rutina" }],
  icons: {
    icon: "/icons/icon.svg",
  },
  openGraph: {
    title: "Rutina CSS Lab",
    description: "Kebun efek CSS murni — demo hidup & kode siap salin",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
