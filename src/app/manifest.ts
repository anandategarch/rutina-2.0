import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rutina — Kebun Kebiasaan",
    short_name: "Rutina",
    description:
      "Kebun kebiasaan: sirami tiap hari, tumbuhkan tanaman, pantau runtun dan statistiknya.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF7F0",
    theme_color: "#F59E0B",
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
