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
};

export default nextConfig;
