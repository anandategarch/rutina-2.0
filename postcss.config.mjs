import path from "node:path";

/* Basis pemindaian kandidat kelas DIBATASI ke src/ — seluruh kelas utility
   Rutina dipakai di src/**. Tanpa ini, basis default = direktori kerja
   (root proyek) dan pemindai otomatis akan menyusuri SEMUA direktori root,
   termasuk mount upload/ milik platform yang bisa menggantung saat daemon
   storage-nya mati (insiden sandbox 19 Nov: dev server beku >3 jam).
   Dengan basis src/, pipeline CSS tidak pernah menyentuh upload/.

   PENTING (perbaikan 19 Nov ~19.10): JANGAN memakai import.meta.url di
   sini. Evaluator modul Turbopack (next dev) mengompilasi ulang berkas
   konfigurasi ini dan menyintesis import.meta.url sebagai
   file://<proyek>/.next/postcss.config.mjs — BUKAN lokasi asli berkas —
   sehingga basis terpecah ke <proyek>/.next/src yang tidak ada dan
   Tailwind menghasilkan 0 kelas utility (seluruh aplikasi kehilangan
   styling; CSS ter-server hanya ~25KB tanpa utility). process.cwd()
   stabil untuk semua jalur yang memuat konfigurasi ini: server
   `next dev` beserta worker postcss-nya dijalankan dari root proyek. */
const projectRoot = process.cwd();

const config = {
  plugins: [
    ["@tailwindcss/postcss", { base: path.resolve(projectRoot, "src") }],
  ],
};

export default config;
