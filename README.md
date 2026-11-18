# Rutina 2.0 — Kebun Kebiasaan

Aplikasi pelacak kebiasaan, keuangan, kebugaran, dan jurnal dalam satu tempat.
Dibangun dengan Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Zustand,
Motion.dev, dan sinkronisasi cloud Turso (libSQL) dengan penyimpanan lokal
offline-first.

## v2.4 — Audit UI/UX Mobile: Nol Teks Terpotong

Sapuan audit menyeluruh di viewport ponsel **390px & 360px** (semua tab, layar
Jurnal/Profil, 6 sheet overlay, sesi latihan imersif, alat barbel, day-detail)
memakai deteksi DOM presisi (elemen terpotong = `scrollWidth > clientWidth`,
lulus-layar, dan overflow halaman) + verifikasi visual. 30+ temuan teks
terpotong diperbaiki hingga **0 tersisa** di kedua lebar layar.

| Perbaikan | Rincian |
|---|---|
| **Taman Pertumbuhan** | Kartu dilebarkan 136→156px (padding 3.5→3) dan judul kebiasaan kini `line-clamp-2` + `break-words` — "Review laporan mingguan" utuh 2 baris, subteks tahap ("Berbunga · Tahap akhir") tak lagi terpotong. |
| **Baris kebiasaan (TaskRow)** | Judul bebas melipat hingga 2 baris (sebelumnya `truncate` terjepit ±106px oleh pil streak + XP + chevron). Pil streak dipadatkan (ikon api + angka; satuan "hari" pindah ke `title` + `sr-only` demi aksesibilitas) sehingga judul mendapat ruang ±150px di 390px. |
| **Kartu Arus Kas (Beranda)** | Label metrik harian disingkat konsisten: Keluar / Masuk / Saldo (sebelumnya "Uang keluar"/"Pemasukan"/"Saldo bersih" terpotong di 360px). Catatan transaksi `line-clamp-2`, meta kategori `break-words`. |
| **Baris transaksi (Keuangan)** | Catatan (`line-clamp-2` + `min-w-0`) dan meta "Kategori · Dompet · Tanggal" kini melipat, bukan terpotong — "Makan & Minum · Tunai · 18 Nov" utuh di 360px. |
| **Baris anggaran (Keuangan)** | Restrukturisasi: label kategori mendapat baris penuh (badge Melebihi/Hampir batas di baris yang sama), nominal `terpakai / batas` pindah ke baris progres — "Makan & Minum" tak lagi terpotong di antara nominal. |
| **Grafik arus kas & peta panas** | Label bulan axis (fin-chart) dan penanda bulan heatmap pengeluaran memakai lebar konten (`w-max`) — "Agu"/"Nov" tidak terjepit kolom 18px. |
| **Bugar** | Baris rekor "Rekor e1RM: Back Squat ≈ 34,8 kg" dan meta program ("Pemula → Menengah · 3×/pekan · ±45 mnt") melipat 2 baris, bukan terpotong. |
| **Statistik** | "Runtun terbaik — {kebiasaan}" dan label metrik pekanan + "pekan lalu: …" kini `break-words` utuh. |
| **Kebiasaan** | Label kartu ringkasan "Runtun terpanjang" → "Runtun terbaik" (kata "TERPANJANG" 82px tak muat sel 77px pada grid-3 di 360px; konsisten dengan istilah di Statistik). |

Audit juga memastikan: navigasi bawah tetap 5 tab (Beranda, Bugar, Keuangan,
Kebiasaan, Statistik — tanpa Jurnal), layar Jurnal tetap terjangkau via
Quick Action Hub, container scroll tiap layar ber-`pb-28` sehingga konten akhir
tak tertutup FAB, tanpa error console, dan tanpa pergeseran tata letak.

## Gelombang migrasi Rutina lama → 2.0 (v2.1)

Audit menemukan 27 kelompok kapabilitas Rutina lama yang belum ada di 2.0.
Gelombang ini memulihkannya sesuai prioritas P0–P2, menyelaraskan tema
Premium Calm Productivity (matcha · warm sand · espresso) di frontend dan
backend.

### A. Habit Intelligence (P0)

| # | Fitur | Status |
|---|---|---|
| 1 | **Jeda Runtun Aman (Streak Freeze)** — maks. satu hari jeda per pekan, ditetapkan sebelum tanggalnya tiba, tidak bisa memulai streak baru; hari jeda transparan terhadap hitungan streak (`restDays`, `restDayError`, `habitStreak` sadar-jeda) | ✅ |
| 2 | **Susun Kebiasaan (Habit Stacking)** — pemicu `afterId` ("Setelah X, saya akan Y") + pemilih pemicu di editor + pil pemicu di baris tugas | ✅ |
| 3 | **Versi 2 Menit** — properti `mini` per kebiasaan + aksi "versi 2 menit" di baris tugas + editor | ✅ |
| 4 | **Nudge Jangan Bolong Dua Kali** — kartu pengingat hangat untuk kebiasaan yang terlewat kemarin (`missedYesterday`) | ✅ |
| 5 | **Goldilocks Nudge** — saran adaptif hasil pekanan: pekan sempurna → naikkan tantangan; capaian < 50% → perkecil target (`goldilocksOf`) | ✅ |
| 6 | **Taman Pertumbuhan** — lima tahap tanaman per kebiasaan (Benih → Tunas → Pohon Muda → Pohon Dewasa → Berbunga) dari total penyelesaian nyata; strip Taman di Beranda + tahap di detail kebiasaan (`plantStageOf`) | ✅ |
| 23/24 | **Suara Identitas & Semangat Hari Ini** — editor identitas personal di Profil + kutipan harian bergilir deterministik (`dailyQuote`, `identityText`) | ✅ |
| 25 | **Riwayat mood per tanggal** — `moodLogs` per ISO (menggantikan mood tunggal), strip 14 hari di Profil + tabel `rutina_mood_logs` | ✅ |

### B. Fitness Intelligence (P0–P1)

| # | Fitur | Status |
|---|---|---|
| 13 | **Kesiapan 4 komponen** — Tidur 30% · DOMS 30% · Stres 20% · Energi 20% (`readinessOf` v2 + rincian per komponen + ajakan melengkapi) | ✅ |
| 14 | **Double Progression otomatis** — semua set capai target → +2,5 kg; repetisi jauh tertinggal → −10%; saran Coach di dalam sesi latihan dengan tombol Terapkan | ✅ |
| 15 | **Deteksi Plateau & Deload** — stagnasi e1RM 3 sesi terakhir → rekomendasi deload 7 hari; target beban otomatis 50% selama deload; aksi akhiri deload | ✅ |
| 16 | **Guard latihan silang** — kardio ≥ 5 sesi/7 hari → saran variasi beban/mobilitas (`cardioGuard`) | ✅ |
| 17 | **Rest timer bersuara** — beep 3-2-1, chime, dan instruksi suara "Ayo, set berikutnya!" (WebAudio + SpeechSynthesis id-ID, dengan tombol bisu) | ✅ |
| 18–20 | **Alat Barbel** — Kalkulator Pemuat Piring (warna IWF), Kalkulator 1RM Epley + tabel 95–65%, Tangga Pemanasan bar–40–60–80% | ✅ |
| 21–22 | **Neraca kalori + coaching adaptif** — Sisa = Target + Terbakar − Masuk; kalori aktivitas mengikat jatah energi; pesan menyesuaikan defisit/surplus (termasuk peringatan defisit terlalu dalam) | ✅ |

### C. Life Analytics (P1–P2)

| # | Fitur | Status |
|---|---|---|
| 7 | **Kalender aktivitas lengkap** — grid bulanan + titik harian (kebiasaan/transaksi/latihan) + Detail Harian drill-down (kebiasaan, catatan, keuangan, aktivitas, tubuh & mood) | ✅ |
| 8 | **Laporan Bulanan** — konsistensi kebiasaan, 3 kategori pengeluaran teratas, penggunaan anggaran, refleksi identitas | ✅ |
| 9 | **Peta panas pengeluaran** — grid 12 pekan intensitas matcha→amber per tanggal | ✅ |
| 10 | **Temuan & Rekomendasi keuangan** — over-anggaran, kategori dominan, tren bulan-ke-bulan, transaksi berulang, surplus (bahasa observasi, tanpa klaim kausal) | ✅ |
| 11 | **Arus Kas Hari Ini di Beranda** — keluar/masuk/saldo bersih, top 3 kategori, transaksi hari ini dengan drill-down ke Keuangan | ✅ |
| 12 | **Pembanding pekan lengkap** — hari aktif, kebiasaan selesai, catatan, pengeluaran, latihan vs pekan lalu | ✅ |

### D. Alat pendukung (P2)

| # | Fitur | Status |
|---|---|---|
| 26 | **CSS Lab** — 17 efek CSS hidup dalam 6 kategori, pratinjau interaktif, pencarian, salin CSS (dari Papan Desain) | ✅ |
| 27 | **Offline shell PWA** — service worker `sw.js`: precache shell, network-first navigasi, stale-while-revalidate aset statis, API tidak pernah di-cache | ✅ |

### Pertahankan (lebih maju dari versi lama)

Quick Action Hub & pencarian universal · Global Check-in Sheet · Workout Session
imersif · Journal Writing Canvas · Finance Command Center · Desktop Sidebar &
Context Rail · komponen Rutina UI (shadcn) · motion tokens · sinkronisasi
cloud Turso + penyimpanan lokal.

## Perbaikan penting

- `punch-card.tsx`: animasi stempel 3-keyframe kini tween (Motion.dev hanya
  mendukung 2 keyframe untuk spring) — menghilangkan crash saat penyelesaian.
- Logika streak freeze: hari jeda transparan penuh terhadap hitungan (aturan
  "tidak memulai streak baru" dijaga di lapisan validasi penjadwalan).
- Migrasi persist v1 → v2: field baru kebiasaan/identitas/deload/moodLogs
  terisi otomatis untuk data lama pengguna.

## Arsitektur singkat

```
src/components/rutina-mobile/
  store.ts            — state domain Zustand (persist v2, skipHydration)
  habit-coach.ts      — habit intelligence murni (freeze, nudge, goldilocks, tanaman)
  sync-engine.ts      — offline-first ↔ /api/state (debounce push, server-menang)
  fitness/fit-utils.ts— coach kebugaran murni (kesiapan, progresi, plateau, alat barbel)
  finance/utils.ts    — helper keuangan murni (bulan, arus kas, peta panas)
src/lib/
  sync-schema.ts      — skema wire Zod (validasi PUT publik)
  sync-server.ts      — baca/tulis snapshot Turso (transaksi tunggal)
prisma/schema.prisma  — SQLite/Turso: Habit(+restDays/afterId/mini), BodyLog(+soreness/stress), MoodLog
public/sw.js          — service worker offline shell
```

Sinkronisasi skema ke Turso: `bun run db:push-turso` · Uji koneksi:
`bun run db:smoke-turso`.

## v2.2 — Tab Kebiasaan, Impor Data Rutina 1.0, PWA Install

| Perubahan | Rincian |
|---|---|
| **Tab Kebiasaan** | Tab Jurnal diganti Kebiasaan (ikon Sprout) di navigasi bawah & bilah sisi desktop. Layar baru `screens/kebiasaan.tsx`: ringkasan (runtun terpanjang, selesai pekan ini, tanaman dewasa), Saran Coach (nudge "jangan bolong dua kali" + Goldilocks), Agenda hari ini, Taman Pertumbuhan, semua kebiasaan per kategori + arsip, CTA "Kebiasaan baru". Layar Jurnal tetap hidup via Quick Action Hub (Cmd/Ctrl+K → "Buka Jurnal"). |
| **Impor data Rutina 1.0 dari Turso** | Akar masalah "data kebiasaan/keuangan tidak pernah ter-import": Rutina 2.0 hanya membaca tabel `rutina_*`, sementara data lama tersimpan di tabel lawas (`habits`, `habit_checkins`, `transactions`, `workspace_modules`) di database Turso yang sama. Skrip baru `bun run db:import-rutina1` (batch + retry, idempoten): 19 kebiasaan (Personal→Pribadi, Learning→Belajar, Health→Kesehatan; jadwal dari metadata), 73 check-in, 281 transaksi (kategori lama dipetakan ke FinCat 2.0 — `CAT_META` dipakai tanpa fallback), 4 dompet nyata + 279 transaksi ter-taut dompet, 3 tujuan tabungan, 2 templat transaksi berulang (bulanan), 21 mood + 21 body log (tidur/energi dari check-in; air ml→gelas & berat dari wellness). |
| **Tarik ulang dari cloud** | Tombol baru di Profil → Data & Penyimpanan: `forcePull()` di sync-engine menarik snapshot server secara paksa (server-menang, lewati negosiasi stempel waktu) — alat pemulihan setelah impor di sisi server. |
| **PWA Install** | Kartu "Aplikasi" baru di Profil: tombol Pasang (beforeinstallprompt — Chrome/Edge/Android), deteksi sudah-terpasang (display-mode standalone), dan panduan iOS (Bagikan → Tambahkan ke Layar Utama). Manifest + service worker offline shell sudah ada (`app/manifest.ts`, `public/sw.js`). |
| **Ketahanan env sandbox** | Kredensial Turso kini juga di `.env.local` (prioritas lebih tinggi dari `.env` yang bisa ditimpa ulang platform) — dev server selalu tersambung ke cloud yang benar. |

Menjalankan impor (sekali saja, aman diulang):

```bash
bun run db:import-rutina1   # baca tabel lawas → tulis rutina_* + re-stamp lastPushAt
```

## v2.3 — Earth-Tone Editorial Bento (Color System 2.0)

Sistem visual baru di atas fondasi yang ada (tanpa membongkar ulang): matcha tetap
identitas global, tiap modul mendapat warna domain sendiri, dan komposisi desktop
berubah dari tumpukan kartu menjadi bento grid + split-screen.

| Perubahan | Rincian |
|---|---|
| **Color System 2.0** | Empat warna domain di `globals.css` (lapisan semantic, lengkap dark mode): **Eucalyptus Teal** `#5F8A82` untuk Bugar, **Antique Bronze** `#AC8148` untuk Keuangan, **Dusty Mauve** `#8C7A91` untuk Jurnal, **Mineral Slate** `#71899A` untuk Statistik — masing-masing base/strong/soft/fg. Kontras strong-vs-soft 4,68–5,42:1 (WCAG AA). Token baru `--module-*` + utilitas `bg-module-*`; shadcn semantic (`--primary` dsb.) tidak tersentuh. |
| **Aksen kontekstual `module-accent`** | Cukup satu atribut `data-module="bugar\|finance\|journal\|stats"` pada akar layar — seluruh utilitas `bg-module-accent/15`, `text-module-accent-strong`, `bg-module-accent-soft` di dalamnya otomatis mengikuti warna domain layar itu (default matcha), terang & gelap. Warna status (success/warning/danger) tetap semantic — bronze tidak pernah berarti "pemasukan", eucalyptus tidak pernah menggantikan hijau berhasil. |
| **Bento Foundation** | Komponen baru: `rutina-bento.tsx` (`RutinaBentoGrid` 12-kolom xl / 6-kolom sm / 1-kolom ponsel + `RutinaBentoItem` span hero/feature/wide/medium/stat/compact/full), `rutina-hero.tsx` (`RutinaHero` — eyebrow/headline/visual/aksi/info-sekunder, gradasi per modul + `heroActionClass` tombol kaca), `rutina-module.tsx` (tipe + shell + peta kelas eksplisit). `RutinaCard` kini punya varian `hero`/`module`/`flat`; `RutinaMetric` punya slot ikon + ukuran `sm` (tile stat); `RutinaSectionHeader` punya `accent`. |
| **Beranda bento** | Desktop: hero progres (8 kolom) bersebelahan dengan kartu baru **"Insight hari ini"** (4 kolom — streak, misi pekan, saldo bersih); Agenda (8) + Pengingat & Saran Coach (4). Urutan ponsel dipertahankan. |
| **Kebiasaan split-screen** | Desktop: daftar "Semua kebiasaan" (7 kolom) + **Panel Detail Kebiasaan** sticky (5 kolom): identitas & kategori, streak, selesai pekan ini, versi 2 menit, habit stacking ("Setelah"), hari jeda, riwayat 30 hari (titik), tombol sunting. Klik baris atau buka lewat keyboard memilih kebiasaan; ponsel tetap satu kolom. |
| **Bugar & Keuangan** | `data-module` + aksen domain (tab aktif, chip ikon, eyebrow); bento hero latihan (8) + Coach Bugar (4); Peta Panas (8) + Temuan (4). Rutina Vault tetap hero espresso+emas (identitas merek); anggaran/saldo masuk-keluar tetap warna status. |
| **Statistik & Jurnal** | Statistik: aksen slate (titik seksi, tab periode, chip mood terpilih) + 4 pasangan bento (Ringkasan+Wawasan, Kalender+Laporan, Pembanding+Bugar&Tubuh, Piala+Streak). Jurnal: sentuhan mauve pada eyebrow, chip folder aktif, empty state — kanvas menulis tetap parchment terang. |
| **ContextRail adaptif** | Panel kanan desktop (xl+) kini berganti isi mengikuti layar aktif: Beranda/Profil/Jurnal = ringkasan pekan + berikutnya + tips; **Bugar** = kesiapan tubuh + rekor pribadi + hidrasi; **Keuangan** = ringkasan periode + anggaran + aktivitas terakhir; **Kebiasaan** = konsistensi + agenda + taman; **Statistik** = insight pekan + fokus. Ikon chip rail memakai peta eksplisit agar warna domain tetap benar di luar layarnya. |
| **Pintasan 1–6** | Pintasan keyboard desktop mengikuti urutan tab baru (4 = Kebiasaan, 5 = Statistik, 6 = Profil). |

Prinsip komposisi: ~70% permukaan netral parchment, 20% matcha, 10% aksen modul &
status; hero berwarna maksimal satu per layar; gradien hanya di hero; variasi
hierarki lewat ukuran tile, bukan warna kartu.

