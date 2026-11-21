# Task 2 — Bugar: Training Log & Pustaka Sesuai Alat

Agent: Task 2 (Bugar Training Log + equipment-aware library). Status: DONE —
`bunx eslint` exit 0 (4 files), `bunx tsc --noEmit` exit 0, dev.log clean, full E2E
smoke-tested headless at 390x844 (calendar nav/dots/detail, picker kit filters,
pustaka chips, trend period control — see below). Test workouts logged via UI were
deleted afterwards; store back to 0 workouts (as found). No `bun run build`, no dev
server restart, no files touched outside the 4 allowed.

## Files changed / created (ONLY these)

1. `src/components/rutina-mobile/fitness/data.ts` — EDIT (Part A)
2. `src/components/rutina-mobile/fitness/gerakan-picker-sheet.tsx` — EDIT (Part B)
3. `src/components/rutina-mobile/fitness/training-calendar.tsx` — NEW (Part C)
4. `src/components/rutina-mobile/screens/bugar.tsx` — EDIT (Part D)

## Helper / struktur Workout yang ditemukan (jawaban pertanyaan laporan)

- `Workout` (store.ts L1088): `{ id, kind: WorkoutKind, date: ISO, duration (menit),
  note: string, sets: WorkoutSet[], distance?: km (kardio), kcal? }`;
  `WorkoutKind = 'beban' | 'jalan' | 'lari' | 'lari-jalan' | 'badminton'`.
- `KIND_LABEL`, `isCardioKind`, `tonaseOf`, `durationLabel`, `paceOf`, `cardioSeries`,
  `filterWorkouts` — SEMUA diekspor dari `fitness/fit-utils.ts` (bukan lokal
  bugar.tsx), jadi training-calendar.tsx mengimpor langsung dari sana.
- `MIX_KIND_ICON` + `TONASE_DAY_NAMES/LABELS` — lokal di bugar.tsx, TIDAK diekspor
  → training-calendar.tsx mendefinisikan ulang `KIND_ICON` lokal (5 baris, komentar
  menjelaskan); TONASE_* tidak diperlukan (pakai `shortDateLabel` store).
- Store helpers dipakai: `DAYS`, `fromISO`, `isoOf`, `todayISO`, `useRutina`,
  `shortDateLabel`, `addDaysISO` (bugar.tsx); `monthLabel` + `shiftMonthKey` dari
  `finance/utils` (pola MonthCalendar) untuk label & navigasi bulan.
- `WoRange = '30' | '90' | 'semua'` + `WO_RANGES` sudah ada di bugar.tsx → dipakai
  ulang untuk state periode CardioTrendCard (label & id identik dengan spek).
- CATATAN data: field `equipment` EX_LIB ternyata punya 5 nilai, bukan 4 —
  'Barbel + Rak' (Rack Pull, Back Squat, Front Squat) tidak disebut spek; sesuai
  instruksi fallback, ketiganya jatuh ke kelas 'barbel' (komentar kode menjelaskan:
  gerakan barbel tetap bisa dimulai dari lantai tanpa rak).

## A. data.ts — klasifikasi alat

Ditambah setelah `EX_LEVELS` (sebelum `MUSCLE_GROUPS`): `export type EquipmentClass
= 'barbel' | 'badan' | 'bangku' | 'gantung'`, `equipmentClass(e)` (switch 4 nilai +
fallback 'barbel'), `KIT_META` (barbel `bg-secondary text-success` / badan
`bg-surface-sunken text-content-secondary` / bangku `bg-gold/20 text-warning` /
gantung `bg-clay/20 text-terracotta`) — persis sesuai spek.

## B. gerakan-picker-sheet.tsx — pemilih sesuai alat

- `KIT_FILTERS` + state `kit: EquipmentClass | 'semua'`, default **'barbel'**.
- Baris chip DI BAWAH kolom pencarian (dalam blok `px-5 pt-3`): container
  `rounded-full bg-surface-sunken p-0.5`, tombol `h-7 px-3 text-eyebrow font-bold`,
  terpilih `bg-surface-inverse text-content-inverse shadow-soft` (pola toggle
  metrik CardioTrendCard), `role="group"` `aria-label="Filter alat gerakan"`,
  `aria-pressed` per chip. Label: Barbel rumah / Tanpa alat / Semua.
- `groups` memo: q non-kosong → cocokkan idName/name/muscle di SELURUH katalog
  (pencarian MENGABAIKAN filter kit — komentar kode menjelaskan alasan: pengguna
  yang mengetik nama jelas mencari lintas alat); q kosong → filter
  `equipmentClass(e) === kit` (atau semua). Deps `[q, kit]`.
- Chip alat `h-6 shrink-0 rounded-full px-2 text-[10px] font-bold leading-6` +
  `KIT_META[...].chip` di kanan tiap baris sebelum indikator centang; nama tetap
  truncate.
- Subjudul: "Katalog {EX_LIB.length} gerakan — saring sesuai alat yang kamu punya."

## C. training-calendar.tsx (BARU) — `export function TrainingCalendar()`

- `'use client'`; `useRutina(s => s.workouts)`; state `viewMonth` (default bulan
  berjalan) + `selected` (ISO | null, toggle ketuk).
- `minMonth` = bulan workout terlama (reduce; bulan ini bila kosong); `canPrev =
  viewMonth > minMonth`; `canNext = viewMonth < bulan berjalan`. Navigasi chevron
  + `monthLabel` + `shiftMonthKey` (pola MonthCalendar).
- Kisi 7 kolom `DAYS` Sen..Min, lead-cell penggenap, tiap tanggal `<button>`
  h-[52px]: angka + baris titik 5px gap 3px, maks 3 titik per JENIS urutan kardio
  (`bg-module-accent-strong`) → badminton (`bg-cocoa`) → beban
  (`bg-chart-stroke-4`); terpilih → titik `bg-primary-foreground/80`. Hari ini
  ring-2 ring-primary/60; terpilih `bg-primary text-primary-foreground shadow-soft`;
  tanpa aktivitas/masa depan angka `text-content-muted/50`; hover:bg-surface-sunken.
- aria-label sel: `{iso}{— hari ini}{— terpilih} — {jenis + durasi...}` /
  "tidak ada aktivitas"; aria-pressed (pola MonthCalendar).
- Kepala seksi: `<h3>` eyebrow "Kalender Latihan" + ringkasan kanan
  `{n} sesi · {h}j {m}m` (dari durasi; kosong → "bulan ini belum ada sesi").
  Container `m.section` `mt-[var(--layout-gap)] rounded-xl border border-border
  bg-surface-primary p-4 shadow-soft` + `useFirstVisit('bugar-kalender-latihan')` +
  whileInView (pola WeekActivityCard).
- Legenda 3 titik+label (Lari/Jalan, Badminton, Barbel) text-chart-label
  text-content-muted flex-wrap gap-3, di bawah kisi sebelum detail.
- Detail hari terpilih: panel `rounded-xl bg-surface-sunken px-3.5 py-3`,
  `shortDateLabel`, baris per workout (ikon KIND_ICON lokal + KIND_LABEL + durasi;
  kardio distance>0 → `X,X km · pace M:SS/km` (helper `paceLabel` lokal, desimal
  koma); beban → `{sets.length} set · {tonase} kg tonase` id-ID; note tiap workout
  bila ada). Kosong → "Tidak ada aktivitas tercatat." AnimatePresence mode="wait"
  crossfade chipReveal (opacity+y 6px). `selList` dibaca dari histori PENUH agar
  tetap benar saat navigasi bulan tanpa lepas pilihan.

## D. bugar.tsx — integrasi

1. `TrainingCalendar` diimpor dari `../fitness/training-calendar`, dipasang TEPAT
   SETELAH `<WeekActivityCard />` sebagai sibling langsung di div `tab === 'latihan'`
   (setelah `</RutinaBentoGrid></m.div>` penutup bento hero+coach). Grid `@[52rem]`
   TIDAK tersentuh — kalender masuk ritme `--layout-gap` tumpukan vertikal yang sama
   dengan WeekActivityCard (di ≥52rem tetap full-width di atas ruang kerja 12 kolom,
   tidak merusak pasangan 7:5 / 5:7).
2. `ExerciseCard` (Pustaka Gerakan, dipakai baik mode flat maupun grup otot +
   pratinjau): chip KIT_META + equipmentClass di kanan sebelum chevron (gaya sama
   pemilih); span judul diberi `truncate` agar rapi 390px.
3. `CardioTrendCard`: state `period: WoRange` default '90' (label/id reuse
   `WO_RANGES`). `windowed` memo filter `date >= addDaysISO(today, -(N-1))`
   (konvensi filterWorkouts); 'semua' tanpa jendela. distSeries =
   cardioSeries(windowed, 'semua' ? 14 : 8).reverse(); paceSeries slice(-14/-8).
   Ganti periode → setSelIdx(null). Guard `distSeries.length < 3 → return null`
   TETAP pada deret aktif. Kontrol periode = baris kedua kepala (justify-end, tidak
   muat sebaris dengan toggle Jarak|Pace di 390px): role="group"
   aria-label="Periode tren kardio", aria-pressed, h-7 px-3 text-eyebrow font-bold,
   terpilih bg-surface-inverse (bahasa toggle yang sama). Kepustakaan komentar
   "mengikuti rentang riwayat aktif" diperbarui. Tidak ada logika lain yang diubah.

## Verifikasi

- `bunx eslint` 4 file → exit 0; `bunx tsc --noEmit -p tsconfig.json` → exit 0
  (satu error awal TS2345 `shortDateLabel(selected)` di training-calendar fixed
  dengan guard `{selected && selList && ...}`).
- E2E headless 390px (agent-browser + VLM screenshot audit):
  - Kalender: header "4 sesi · 3j 27m" (data uji 4 sesi Nov 207 mnt), titik
    bg-module-accent-strong/bg-cocoa/bg-chart-stroke-4 tervalidasi di DOM, sel 21
    (hari ini+terpilih) titik putih, nav ke Oktober ("1 sesi · 0j 45m", prev
    disabled = minMonth), detail "Min, 15 Nov / Barbel di rumah / 45 mnt / 6 set ·
    330 kg tonase" & "Sab, 21 Nov / Lari / 32 mnt / 5,2 km · pace 6:09/km"
    (pace 32/5,2 = 6:09 benar), VLM: grid 7 kolom rapi, tanpa overlap/terpotong.
  - Picker: subjudul baru, chip filter; default 'barbel' menyembunyikan Bench/Incline/
    Pull-Up/Push-Up; 'Semua' menampilkan semuanya; 'Tanpa alat' → hanya Push-Up;
    pencarian "bench" saat filter 'Tanpa alat' tetap menemukan 3 Bench variant
    (search ignores kit — sesuai keputusan berkomentar di kode).
  - Pustaka: chip "+ Bangku"/"Cukup barbel"/"+ Bar gantung" tampil di tiap
    ExerciseCard (mode grup pratinjau).
  - Tren kardio: default '90 hari' pressed, 3 batang; klik "30 hari" → kartu hilang
    (2 sesi < 3 — perilaku spek); remount (toggle filter) → kembali dengan default
    '90'; pilih batang lalu ganti periode → seleksi reset ("Ketuk batang…");
    metrik Pace jalan dengan deret terfilter (3 titik 11:15/7:16/6:09).
- Data uji (5 workout via UI sheet) dihapus via UI (Hapus aktivitas → Ya, Hapus);
  `workouts.length` kembali 0, sync PUT /api/state 200, dev.log bersih.
