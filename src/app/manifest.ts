import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    /* v2.76 (audit PWA P3): id — identitas stabil aplikasi terpasang.
       Tanpa ini, PWA diidentifikasi dari start_url; perubahan kecil pada
       URL bisa membuat sistem memperlakukan instalasi lama & baru sebagai
       dua aplikasi berbeda (duplikat ikon, data terpisah). */
    id: "/",
    name: "Rutina — Kebun Kebiasaan",
    short_name: "Rutina",
    description:
      "Kebun kebiasaan: sirami tiap hari, tumbuhkan tanaman, pantau runtun dan statistiknya.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F3EE",
    theme_color: "#F5F3EE",
    lang: "id",
    categories: ["lifestyle", "productivity", "health"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
