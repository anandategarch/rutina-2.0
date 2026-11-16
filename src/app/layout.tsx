import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
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
    "Rutina versi mobile: kebun kebiasaan dengan jadwal fleksibel, skor kekuatan, pengingat, lencana, dan mode malam — dibangun dengan shadcn/ui, Motion, dan anime.js.",
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
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rutina",
  },
  openGraph: {
    title: "Rutina — Kebun Kebiasaan",
    description:
      "Sirami kebiasaanmu, tumbuhkan tanaman, pantau runtun dan statistiknya.",
    siteName: "Rutina",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#171209" },
  ],
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
