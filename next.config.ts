import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Pemeriksaan TypeScript & ESLint AKTIF saat build — error tipe
     menggagalkan build (v2.13: guardrail mutakhir sebelum deploy).
     `bun run typecheck` untuk cek cepat tanpa build. */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  reactStrictMode: false,
  devIndicators: false,
  /* v2.16 (audit T5-b #4): header keamanan dasar. CSP sengaja mode
     laporan (Report-Only) dulu — aman untuk Tailwind/chart (style
     inline) tanpa risiko memutus aplikasi; naikkan ke enforced
     setelah laporan bersih. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; font-src 'self' data:; connect-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
