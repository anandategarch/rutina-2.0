# Rutina 2.0 — Kebun Kebiasaan

Aplikasi pelacak kebiasaan, keuangan, kebugaran, dan jurnal dalam satu tempat.
Dibangun dengan Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Zustand,
Motion.dev, dan sinkronisasi cloud Turso (libSQL) dengan penyimpanan lokal
offline-first.

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
