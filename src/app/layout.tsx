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
  title: "Rutina — Split Screen × Bento Grid × Earth Tone",
  description:
    "Pratinjau desain Rutina: earth tone 60-30-10, komposisi split screen, dasbor bento grid, dan tipografi editorial Playfair × Geist — dibangun dengan shadcn/ui, Motion, dan anime.js.",
  keywords: [
    "Rutina",
    "aplikasi mobile",
    "habit tracker",
    "kebiasaan",
    "jurnal",
    "earth tone",
    "matcha green",
    "split screen",
    "bento grid",
    "tipografi editorial",
    "mood tracker",
    "statistik kebiasaan",
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
    title: "Rutina — Aplikasi Mobile Kebiasaan & Jurnal",
    description:
      "Rutinitas harian, jurnal masonry, dan statistik mingguan dalam palet earth tone yang hangat.",
    siteName: "Rutina",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#231F1E" },
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
