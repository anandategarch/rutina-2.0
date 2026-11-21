# STAGE-1 — Fitness Visualizations (Phase 2, Rutina 2.0)

Task: tiga deliverable visualisasi kebugaran "Phase 2" sesuai master plan.
Semua bahasa UI Indonesia, Warm Editorial (token CSS saja, tanpa hex mentah,
tanpa biru/indigo), Motion.dev React (`motion/react-m` + useFirstVisit +
motionTokens + useReducedMotion), tanpa dependensi baru.

## Deliverable 1 — PaceTrack (lintasan pace kardio)

- BARU `src/components/rutina-mobile/visualizations/fitness/pace-track.tsx` (326 baris, 'use client', presentasional).
  - Props: `sessions: PaceTrackSession[]` ({ id, date, paceMinPerKm, distanceKm, durationMin, kind? }), `selectedId: string | null`, `onSelect: (id: string | null) => void`.
  - Track metaphor: 3 garis lane melengkung (clay, dekoratif, aria-hidden), viewBox 320x140.
  - Kronologis kiri→kanan (x = slot tengah); y = pace dengan LEBIH CEPAT = LEBIH TINGGI (`yOf`: TOP_Y + norm*(BOT_Y-TOP_Y), span floor 0.5 — pola lama dipertahankan). Ukuran titik ∝ jarak (r 4.5–8), tidak menggeser posisi.
  - Anotasi "↑ lebih cepat" in-SVG; header "Pace per sesi · menit/km" + "N sesi terakhir"; footnote kejujuran (lane dekoratif, ukuran = jarak).
  - Pemilihan: lapisan tombol overlay ≥44px (minWidth `max(100%, n*44px)` + overflow-x-auto — pola cashflow-river), aria-pressed, focus-visible ring; marker terpilih dapat cincin chart-stroke-5 + label pace (auto pindah bawah bila mepet tepi atas); baris bacaan aria-live: tanggal panjang, pace menit/km, kind, km, durasi.
  - Deret < 3 sesi → lintasan kosong ilustratif (lane putus-putus + pesan "Butuh setidaknya 3 sesi kardio dengan jarak & durasi"), BUKAN garis datar.
  - Format pace memakai `paceLabelOf` + `durationLabel` dari fit-utils (tidak duplikasi formula); pace numerik dihitung PEMANGGIL.
- Integrasi `screens/bugar.tsx` CardioTrendCard:
  - Import line 100; deret `pacePts` (pace = duration/distance di sumber deret) lines 1381–1401; render PaceTrack lines 1563–1574.
  - Tab Jarak|Pace dipertahankan; tombol Pace kini SELALU aktif (gerbang disabled lama dihapus — semantik "≥3 sesi" pindah ke lintasan kosong di komponen, jujur tergambar saat periode menghasilkan < 3 sesi valid). Periode 30/90/semua, batang jarak, KPI "terjauh", state selIdx jarak: semua utuh. Pilihan pace kini id-based (`paceSelId`), direset saat ganti metrik/periode.
  - Polyline lama + overlay tombolnya + paceSeries mentah dihapus; `paceLabelOf` dihapus dari import (tak terpakai); `paceOf`/`durationLabel`/`KIND_LABEL` tetap dipakai bagian lain.

## Deliverable 2 — RecoveryOrbit (orbit pemulihan Tubuh)

- BARU `src/components/rutina-mobile/visualizations/fitness/recovery-orbit.tsx` (492 baris, 'use client', presentasional).
  - Props: `{ sleepH, energy, soreness, stress, water: number | null; waterTarget?: number (default 8); date?: string; className?: string }`.
  - Radial 240x240 (render ≤250px, muat 320px): inti tenang (hati clay + label tanggal), lingkar panduan dashed r58 dekoratif, 5 satelit r82.
  - Tiap metrik glif + encoding SENDIRI: tidur = bulan sabit gold + busur 0–8 jam dengan zona 7–8; energi = kilat matcha + baterai 5 sel; nyeri = zigzag clay + titik berskala (r 1.7+0.88×skala, cincin referensi); stres = gelombang cocoa dengan amplitudo ∝ skor; hidrasi = tetesan dengan level isi vs target (clipPath useSvgId, isi pistachio). Skala persis seperti BodyHistory (jam, 1–5, gelas/target).
  - Metrik null → satelit putus-putus netral + "—" (TIDAK pernah nol); semua null → return null; aria-label role="img" merangkum nilai + "belum dicatat"; footnote konvensi putus-putus saat ada yang kosong.
  - TIDAK menggabungkan metrik jadi satu skor; `readinessOf` (Kesiapan latihan) tidak disentuh.
  - Gerak: rakitan satu kali staggered (satAnim, first-visit 'tubuh-recovery-orbit', reduced-motion aware), tanpa rotasi kontinu.
- Integrasi `fitness/tubuh-panel.tsx` (import line 38): di dalam BodyHistory, heading "Orbit Pemulihan" + <RecoveryOrbit> lines 455–472, DI ATAS baris riwayat per metrik. Data: `latestOf` per metrik dari DERET bodySeries yang sama dengan baris riwayat (lines 399–426, tanpa pipeline kedua); label tanggal = tanggal metrik terbaru ("Hari ini" / "12 Jan").

## Deliverable 3 — BarbellProgression + ExerciseDetailSheet

- `visualizations/fitness/barbell-progression.tsx` (427 baris):
  - a) Deret kosong (line 86–134): barbel kosong ilustratif — batang + kolar + 2 piringan hantu dashed, dimmed, caption "Belum ada set tercatat — mulai catat untuk melihat progresi" (menggantikan `return null`).
  - b) Sorotan PR (bukan lagi sesi terakhir): `prIdx` = e1RM tertinggi (line 143–148); kolom PR gold `chart-stroke-3` + lebar sedikit lebih besar + bintang 5 titik di atas kolom (line 292–308, menghindar naik saat label nilai terpilih muncul); label tanggal PR gold + bold (line 341–361); sesi TERBARU → penanda mini "terbaru" di bawah label tanggal (line 363–374); baris bacaan + "— rekor pribadi" saat PR dipilih. Label "e1RM (estimasi Epley) per sesi" + footnote kejujuran piringan UTUH.
- `fitness/exercise-detail-sheet.tsx` (319 baris): 0 set tercatat → render `<BarbellProgression points={[]} ...>` ilustratif (lines 179–191, menggantikan teks polos); gerbang grafik penuh tetap `chartPts.length >= 2`; 1 titik tetap perilaku lama (ringkasan+tabel tanpa grafik); tombol "Catat set" dipindah keluar ternary (lines 300–312) agar CTA juga tampil pada keadaan kosong.

## Validasi

- `bun run typecheck` — PASS (0 error).
- `bun run lint` — PASS (0 error, tanpa warning baru).
- dev.log: kompilasi + render `GET / 200` bersih setelah perubahan, tidak ada runtime error.
- Tidak menjalankan build/test/git.

## Catatan untuk agen berikutnya

- PaceTrack dipakai hanya di CardioTrendCard (bugar.tsx); RecoveryOrbit hanya di BodyHistory (tubuh-panel.tsx); BarbellProgression dipakai exercise-detail-sheet (keadaan kosong points=[] + grafik penuh ≥2 titik).
- Konvensi: komponen viz fitness murni presentasional; angka domain dihitung adapter/pemanggil (fit-utils).
