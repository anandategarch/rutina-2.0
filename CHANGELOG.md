# Changelog — Rutina 2.0

Semua perubahan penting per versi. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/);
versi mengikuti gelombang pengembangan internal (bukan semver).

## [2.14] — Sorotan Harian, Rekap Pekan & Navigasi Plus Tengah

Fokus: Beranda selalu menunjukkan satu hal paling relevan untuk hari itu,
rekap perjalanan pekan yang memancing rasa ingin melihat perkembangan diri,
navigasi bawah "plus di tengah", dan refleksi yang bisa diganti-ganti.

### Ditambahkan
- **Sorotan Hari Ini** (`daily-highlight.ts` + `daily-highlight-card.tsx`) —
  kartu pertama Beranda, memilih SATU hal terpenting hari ini lewat logika
  prioritas murni: streak ≥3 hari belum selesai (runtun tertinggi menang) →
  anggaran kategori ≥85% terpakai bulan ini (rasio tertinggi menang, hanya
  transaksi bulan berjalan) → ≥3 hari tanpa latihan (hanya bila punya
  histori latihan) → tujuan tabungan ≥80% terdanai (belum 100%) → bonus
  harian (hanya bila punya kebiasaan aktif — pengguna baru disambut dulu) →
  hari sempurna (semua misi selesai) → jadwal kosong → sambutan. Tiap
  sorotan membawa aksen warna modul asal (kebiasaan/keuangan/bugar/beranda),
  suar bernapas untuk kandidat mendesak, mini-visual (chip runtun, batang
  anggaran & tujuan dengan role="progressbar", chip hitungan), dan satu CTA
  yang memetakan langsung ke aksi store (selesaikan misi, buka tab anggaran,
  buka lembar latihan, isi tabungan, klaim bonus, buka statistik, tambah
  kebiasaan).
- **Rekap Pekan** (`weekly-recap.ts` + `weekly-recap-card.tsx`) — ringkasan
  perjalanan pekan berjalan di permukaan garden-surface: strip perjalanan
  7 hari Senin–Minggu (kecambah penuh saat target harian tercapai, kecambah
  kecil saat beraktivitas, titik di hari kosong, lingkar putus hari
  mendatang, outline pada hari ini; ringkasan nonvisual role="img"),
  headline "N misi selesai" + chip perbandingan vs pekan lalu pada RENTANG
  HARI YANG SAMA (Senin..hari-setara), chip visual lintas modul (streak
  terpanjang, sesi latihan, XP misi, arus kas bersih dengan transfer
  netral), kalimat penutup naratif sesuai arah perkembangan, dan tombol
  "Statistik" (pintu utama ke layar Statistik yang turun dari tab).
- **Tombol plus besar di tengah navigasi bawah** — tab bawah kini
  **Beranda · Bugar · [＋] · Keuangan · Kebiasaan**: dock 56px menonjol ke
  atas bar dengan "kerah" ring senada permukaan, halo bernapas, plus
  berputar 45° menjadi silang saat hub terbuka; membuka Quick Action Hub
  (tambah kebiasaan, catatan, transaksi, latihan, asupan, check-in).
- **Baris "Jelajahi" di Quick Action Hub** — chip Statistik · Jurnal ·
  Profil di bawah kisi enam aksi (tampilan kueri kosong) — layar non-tab
  terjangkau satu ketuk tanpa mengetik.
- **Tombol "Ganti" pada Refleksi Hari Ini** — `cycleQuote` mengganti
  kutipan ke pilihan berikutnya dengan transisi slide lembut
  (AnimatePresence mode="wait"); offset hanya berlaku pada hari
  penggantian (hari baru kembali ke kutipan harian deterministik);
  bank kutipan diperluas 10 → 16.
- **`quoteFor` / `nextQuoteOffset` / `currentQuoteOf`** — helper murni
  (teruji) untuk matematika refleksi bergilir; state `quoteOffset` +
  `quoteDate` dipersist lokal.

### Diubah
- **Statistik bukan lagi tab bawah** — pintunya: tombol "Statistik" pada
  Rekap Pekan Beranda, baris Jelajahi + pencarian di hub, dan bilah sisi
  desktop (keenam layar tetap tampil di lg+).
- **QuickActionFab kini khusus desktop** (lg+) — di ponsel digantikan
  tombol plus tengah agar tidak ada dua pemicu yang bersaing.
- **"Insight pekan" (FocusWidget + StreakWidget) digantikan Rekap Pekan**
  — informasi keduanya (misi pekan, streak) terserap ke headline & chip
  rekap; kartu stempel pekan terlipat ikut diserap ke strip perjalanan
  (informasi "X dari 7 hari target" sama persis).
- **Urutan baris bento tier-3 Beranda** — Rekap Pekan (7 kolom) didahulukan
  sebelum kartu arus kas (5 kolom); ponsel menumpuk rekap → finance.
- **`saveQuote`** — menyimpan kutipan yang SEDANG tampil (sadar offset),
  bukan selalu kutipan default harian.

### Pengujian
- `tests/calc-highlight.test.ts` (22 tes baru, total suite 97 / 5 file):
  prioritas & ambang sorotan (streak-risk memilih runtun tertinggi,
  ambang 85%/80%/3-hari, pengeluaran bulan lalu tak dihitung, tanpa
  histori latihan tidak dinag, tujuan 100% tidak ditonjolkan, onboarding
  menang atas bonus), rekap pekan (strip Sen–Min, total sampai hari ini,
  pembanding rentang-sama + delta, Sabtu/Minggu pekan lalu dikecualikan,
  transfer netral, pekan kosong valid), refleksi bergilir (offset maju,
  modulo penuh, reset harian, bank ≥10 & unik).

## [2.13] — Hardening & Review Frontend

Fokus: menutup utang rekayasa (konfirmasi hapus, pemeriksaan tipe, pengujian
otomatis, performa data besar) + menindaklanjuti review frontend eksternal
(Beranda 3 tingkat, navigasi Profil/Jurnal, aksesibilitas grafik, persistensi
preferensi, lipatan seksi sekunder).

### Ditambahkan
- **Konfirmasi AlertDialog** untuk dua jalur hapus terakhir yang belum
  berkonfirmasi: entri jurnal makan (Asupan → FoodRow) dan sesi latihan
  (Bugar → WorkoutRow). Kini seluruh aksi destruktif (transaksi, catatan,
  kebiasaan, anggaran, sesi, asupan, reset data) berpola sama.
- **Pengujian otomatis** (`bun test`, 75 tes / 4 suite):
  - `tests/calc-finance.test.ts` — format Rupiah, alat bulanan (kabisat),
    arus kas bulanan (transfer netral), saldo dompet & total, grup harian,
    deret grafik minggu/bulan/tahun relatif hari berjalan.
  - `tests/calc-fitness.test.ts` — e1RM Epley, tonase, pace, papan rekor,
    ringkasan pekan, kesiapan 4-komponen (normalisasi bobot), double
    progression, deteksi plateau, deload, guard kardio, pemuat piring IWF,
    tabel 1RM, tangga pemanasan.
  - `tests/calc-store.test.ts` — XP/level, penjadwalan, streak (grace hari
    ini, transparansi hari jeda, batas createdAt), bestStreak, kartu stempel.
  - `tests/sync-schema.test.ts` — snapshot valid + default Zod, penolakan
    muatan tidak valid (tipe asing, nominal negatif, tanggal rusak, di luar
    batas), pulang-pergi JSON, batas jumlah item domain.
- **Skrip npm**: `typecheck` (tsc --noEmit), `test` (bun test), `verify`
  (typecheck + lint + test berurutan).
- **uiPrefs** di store — preferensi UI yang bertahan saat berpindah layar:
  subtab Bugar, tab & periode grafik Keuangan, filter mutasi, periode
  Statistik. Dipersist ke localStorage, dikecualikan dari sinkronisasi
  (bukan data domain — tidak ada di DOMAIN_KEYS sync-engine).
- **Tombol Jurnal** di header Beranda (di samping avatar) dan item
  **"Buka Profil & Pengaturan"** di Quick Action Hub — kedua layar non-tab
  kini terjangkau satu ketukan dari mana pun.
- **Pintasan seksi Statistik** — chip Tren · Kalender · Laporan · Bugar ·
  Piala di kepala halaman (scroll-mulus + anchor id).
- **Ringkasan nonvisual grafik** — sr-only: total masuk/keluar/selisih
  (FinChart), rata-rata kalori vs target (grafik 7-hari Asupan).

### Diubah
- **next.config.ts** — `typescript.ignoreBuildErrors: false` dan
  `eslint.ignoreDuringBuilds: false`: error tipe/lint menggagalkan build.
- **Beranda** direorganisasi ke tiga tingkat informasi:
  1. *Hari ini* — hero progres, kalender dua pekan, agenda (+ nudge & saran
     coach di tile samping).
  2. *Perlu perhatian* — bonus harian langsung setelah agenda.
  3. *Aktivitas tambahan* — arus kas & insight pekan, kartu stempel terlipat,
     pintu Jurnal & Catatan ringkas, taman pertumbuhan, refleksi.
- **Kartu stempel pekan** dilipat default (`FoldedPunchCard`, ringkasan
  "X dari 7 hari" + lencana Sempurna di pemicu; `punchWeekInfo` diekspor).
- **Kisi folder catatan Beranda** diganti kartu "Jurnal & Catatan" ringkas
  (chip folder ber-hitungan tetap membuka folder di Jurnal).
- **Laporan Bulanan & Piala/Lencana (Statistik)** dilipat default dengan
  ringkasan di pemicu.
- **TonaseStrip (Bugar)** — `role="img"` → `role="group"` bernama karena
  berisi 7 tombol interaktif (pembaca layar mengenali tiap kolom sebagai
  kontrol); `aria-pressed` tiap tombol dipertahankan.
- **Grafik kalori 7-hari** — pembungkus batang mendapat `role="group"` +
  ringkasan sr-only.
- **TaskRow** — grup pil meta (streak/kategori, XP, chevron) menjadi satu
  unit `shrink-0` dengan `ml-auto`; judul `basis-36`. Di kartu sempit pil
  menurun ke baris kedua alih-alih menjepit judul (memperbaiki terpotong
  ±24px di kisi 2-kolom desktop).
- **Tile agenda** melebar `@[52rem]:col-span-12` saat tile samping (nudge/
  coach) tidak memiliki konten — kolom mati di desktop hilang.
- **Pemilih bahasa (Profil)** menjadi baris informasi statis
  "Indonesia · aktif" sampai multi-bahasa benar-benar tersedia.
- **Batas render progresif**: ledger Mutasi 60 transaksi (+60 per muat),
  daftar catatan Jurnal 30 kartu (+30), riwayat Bugar 15 sesi (+15).

### Dipulihkan / Diverifikasi
- Seluruh alur diverifikasi end-to-end di browser (agent-browser):
  navigasi Jurnal/Profil, persistensi tab Bugar lintas layar, dialog hapus
  sesi, pintasan & lipatan Statistik, tanpa overflow di 320/390/768/1440px,
  tanpa error konsol.
- `tsc --noEmit` bersih 0 error (dulu diabaikan oleh ignoreBuildErrors).

## [2.12] — Visualisasi Data

Duplikasi grafik dipangkas; grafik yang tersisa kini informatif (angka
jelas, label jujur). FinChart: batang min 7px + kolom 32px + gulir
horizontal untuk histori panjang. Tile streak & misi-pekan Beranda dihapus
(sudah terbaca di chip hero & widget insight). Label grafik memakai
`w-max` agar tak terjepit.

## [2.11] — Color System v2 + Tipografi System v1.1

Kontras WCAG AA dipulihkan di seluruh pasangan warna teks-latarnya;
token warna dipusatkan; tipografi diselaraskan (Geist + Playfair Display,
skala baku, hirarki h1 tiap tab).

## [2.10] — Tipografi System v1

Geist benar-benar terpasang (self-hosted), skala tipografi baku,
letter-spacing & line-height dinormalisasi, hirarki judul per tab.

## [2.9] — Ruang Kerja Adaptif

Bento sadar-kontainer (container queries), inspector Statistik di desktop,
gerak terpusat lewat motion tokens.

## [2.8] — Lima Ruang Kerja

Layout grammar & animasi khas tiap tab (daybook · performance studio ·
vault & ledger · botanical garden · observatory).

## [2.7] — Audit Gerak

Overlay perayaan tak lagi macet; hidrasi bebas mismatch; animasi makin halus.

## [2.6] — Gerak & Permukaan

CSS motion layer + anime.js kit + shadcn/ui penuh.

## [2.5] — Ruang Warna

Identitas visual berbeda tiap layar (matcha · eucalyptus · bronze ·
rose clay · mineral slate).

## [2.4] — Audit UI/UX Mobile

Nol teks terpotong di 390px & 360px (30+ temuan diperbaiki).

## [2.3] — Earth-Tone Editorial Bento

Color System 2.0 (empat warna domain), bento foundation, split-screen
Kebiasaan, ContextRail adaptif.

## [2.2] — Tab Kebiasaan, Impor Rutina 1.0, PWA

Tab Jurnal → Kebiasaan; impor data Rutina 1.0 dari Turso (batch, idempoten);
tarik-ulang paksa dari cloud; PWA install.

## [2.1] — Migrasi 27 Kapabilitas Rutina Lama

Habit Intelligence (streak freeze, habit stacking, versi 2 menit, nudge,
goldilocks, taman pertumbuhan), Fitness Intelligence (kesiapan 4-komponen,
double progression, plateau/deload, guard kardio, rest timer, alat barbel,
neraca kalori), Life Analytics (kalender aktivitas, laporan bulanan, peta
panas, temuan keuangan, arus kas harian, pembanding pekan).

## [2.0] — Fondasi

Next.js 16 App Router + TypeScript + Tailwind 4 + Zustand + Motion.dev;
sinkronisasi cloud Turso offline-first; Quick Action Hub; layar inti
Beranda/Bugar/Keuangan/Statistik/Jurnal/Profil.
