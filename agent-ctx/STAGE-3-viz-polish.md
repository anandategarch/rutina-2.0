# STAGE-3 — Lima polish visualisasi kustom (vine nav, sumbu-y, mood, SR keuangan)

Agent: STAGE-3. Status: DONE — `bun run typecheck` exit 0, `bun run lint` exit 0, dev.log bersih (✓ Compiled, GET / 200).

## 1. Growth Vine — navigasi pekan (utama)
`src/components/rutina-mobile/visualizations/habits/growth-vine.tsx` (488 → 613 baris). Integrasi `kebiasaan.tsx` tetap SATU baris `<GrowthVine />` (komentar di atasnya diperbarui).

- **Navigasi**: `weekOffset` state di DALAM komponen (0 = pekan berjalan; negatif = lampau). Tombol `m.button` h-11 w-11 (44px) ChevronLeft/Right, aria-label "Pekan sebelumnya"/"Pekan berikutnya", whileTap 0.92 + pressSnappy, focus-visible, disabled:opacity-30. **Batas**: prev ≥ −26 pekan (`MIN_WEEK_OFFSET`); next disabled di 0 (masa depan tak bermakna). Header flex-wrap aman 320px.
- **Label**: "Pekan ini" atau rentang `weekRangeLabel(start)` — "16 – 22 Nov" (sebulan) / "28 Okt – 3 Nov" (lintas bulan, cek bulan+tahun). `p aria-live="polite"` membawa span terlihat (aria-hidden) + `sr-only` pengumuman penuh: "Pekan 16 – 22 Nov: 4 dari 6 hari terjadwal selesai" (atau "tidak ada hari terjadwal"); hanya hari !future && pct!=null dihitung.
- **Data**: `vineWeek(habits, c, start, today)` kini menerima Senin-nya pekan tampil; `dayCompliance` tetap dipanggil per-hari TANPA fork. Semantika pekan lampau gratis dari rumus lama: `future: iso > today` & `isToday: iso === today` dihitung terhadap HARI INI nyata → pekan lampau selalu final (0% = 'missed', pct null = 'rest'), 'pending' hanya bila pekan tampil memuat hari ini, 'future' hanya mungkin di pekan berjalan (next dikunci).
- **Animasi ganti pekan**: state `navigated`; `playLeaves = (firstVisit || navigated) && !reducedMotion`. Kunci `g key={d.iso}` → ganti pekan = simpul dipasang ulang → VineLeaf entrance celebration-spring + stagger token lama diputar sekali per ganti pekan; render biasa (centang habit) tak me-replay (kunci stabil). Stem pathLength hanya kunjungan pertama (geometri identik antar pekan). Seleksi hari di-clear saat ganti pekan.
- **Perataan ketuk**: overlay `grid-cols-7` (kolom pusat 7.14%..92.9% meleset ±1.6% dari simpul) → tombol absolut `left: (x−NODE_STEP/2)/VB_W`, `width: NODE_STEP/VB_W` (NODE_STEP=44) → kolom bertumpuk rapat tepat di bawah simpul 28..292, fraksi viewBox mengikuti skala w-full SVG.
- Dipertahankan: DayDetailSheet, semua bentuk daun, legenda, baris bacaan aria-live, ring hari ini.

## 2. Life Constellation — label sumbu-y
`visualizations/stats/life-constellation.tsx`. Konstanta margin `PLOT_LEFT=34` (selat label) + `PLOT_RIGHT=42` menggantikan literal 6/42 di SEMUA titik (gridline, baseline, avg line, x-tick pertama/terakhir `PLOT_LEFT−2` / `w−PLOT_RIGHT−2`, plot star `left/right`). Label `0 / 25 / 50 / 75%` (textAnchor end, x=PLOT_LEFT−5, fontSize 8.5 = tick, fill var(--content-muted), y+2.5) di dalam m.g gridline (ikut fade entrance); "%" hanya di label teratas, TIDAK ada "100" (tak ada garisnya). minWidth scroll = `n*24 + PLOT_LEFT + PLOT_RIGHT` (konsisten, selat tetap utuh di lebar minimum). Skala jujur 0–100% + garis rata² utuh; ariaSummary kini menyebut "skala 0–100%".

## 3. Mood Wheel — sorotan mood terfilter
`visualizations/journal/mood-wheel.tsx`: prop `selectedMood?: string | null` (string mood, cocok `moodFilter` journal). Dicoocokkan ke `counts` (nilai usang diabaikan → roda tak pernah meredup tanpa sorotan). Arc terpilih: strokeWidth 14→16 + opacity 1; arc lain opacity 0.55. Per-value transition: strokeDashoffset (entrance data+stagger lama), strokeWidth pressSnappy, opacity preset.interaction — tanpa glow, tetap non-interaktif. aria-label ditambah ", suasana X dipilih". Wiring `screens/journal.tsx`: WritingActivityCard prop baru `selectedMood` (default null) → `<MoodWheel counts={moodCounts} selectedMood={selectedMood} />`; call site `selectedMood={moodFilter}`. moodCounts tetap distribusi penuh.

## 4. Mini Finance — ringkasan pembaca layar
`home-finance-card.tsx`: `<p className="sr-only">` di bawah strip aria-hidden (UI visual tak berubah): "Pengeluaran 7 hari terakhir: total Rp…, rata-rata Rp… per hari. Hari dengan pengeluaran: Sen Rp25 rb, Rab Rp120 rb. Hari ini: Rp60 rb." (formatIDRShort; hari nol dilewati; "belum ada pengeluaran" bila hari ini kosong; strip hanya render saat weekMax>0 → daftar tak pernah kosong). Tambahan `weekTotal`/`todaySpend`.

## Validasi
- `bun run typecheck` PASS · `bun run lint` PASS (nol iterasi).
- dev.log: ✓ Compiled setiap file berubah, GET / 200, tanpa error/warning.
- Token-only (var(--palette/*), var(--chart/*), var(--surface/*), var(--content-*), var(--module-*)); tanpa hex, tanpa blue/indigo; tanpa deps baru.
