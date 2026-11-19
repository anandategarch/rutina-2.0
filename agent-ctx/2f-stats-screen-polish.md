# Task 2f — Poles Layar Statistik (Rutina 2.0, Tahap 2 Screen Polish) — SELESAI

Agent: frontend polish (stats observatory)
Files edited (ONLY, sesuai scope): `src/components/rutina-mobile/screens/stats.tsx` (1917 → ~2130 baris), `src/components/rutina-mobile/heatmap.tsx`.
TIDAK menyentuh: finance/fin-chart.tsx, counter.tsx, anime-kit.tsx, store.ts, globals.css, month-calendar.tsx, day-detail-sheet.tsx (tidak perlu — sudah sesuai). Tidak ada commit/push, tidak ada dependensi baru.

## Akar masalah "KPI terpotong" (bukti DOM)
`RutinaBentoGrid` dasar membawa `@[52rem]:grid-cols-12`; className override lama hanya `grid-cols-2 @[42rem]:grid-cols-4`.
tailwind-merge mendedupe variant SAMA (`@[42rem]`) tapi `@[52rem]:grid-cols-12` tetap hidup → di ruang kerja kontainer ≥832px
(desktop 1500px: 1500−240 sidebar−288 rail = 876px) grid KPI jadi 12 kolom × 60px; label `<p>` clientW 26px vs scrollW 91px
→ persis "KONS… / MISE SELE… / STREA…". Di 320/390 (2 kolom) tidak terpotong — bug murni breakpoint kontainer.
FIX: `className="grid-cols-2 @[42rem]:grid-cols-4 @[52rem]:grid-cols-4"` + caption Konsistensi diberi periode "· 30 hari"
+ jarak angka-satuan dinaikkan gap-1 → gap-1.5. TANPA truncate/overflow-hidden pada label; label tetap 1 kata utuh & wrap-able.

## Perubahan per butir audit
1. **KPI terpotong** — FIX terbukti: 1500px grid sekarang 4×208.5px (tileW [209,209,209,209]), overflow [] di 320/390/1500.
2. **Hierarki seksi** — urutan baru: XP ring + KPI strip → Fokus Periode+Misi Selesai (insight) → Tren & Konsistensi →
   Kalender+Laporan → Wawasan (Komposisi donut + Suasana Hati, DIPINDAH ke sini, id=`stats-wawasan`) → Pekan Ini vs Lalu →
   Bugar & Tubuh → Piala. Chip pintasan jadi 6 (grid 3×2 rapi): Tren/Kalender/Laporan/Wawasan/Bugar/Piala.
3. **Tooltip+legenda+periode** — Recharts Tooltip tren & donut memakai token terang (bg-surface-primary, border-border-strong,
   text-content, shadow-pop; konstanta CHART_TOOLTIP_*). Batang Misi jadi TOMBOL (aria-pressed, `interactive`) dengan readout
   aria-live ("P4: 4 misi selesai — teruji"). Legenda tren: garis solid %selesai + garis putus rata-rata (ReferenceLine
   chart-stroke-5). Donut legenda list + tooltip "N kebiasaan". Label periode di header kartu: "7 hari terakhir / 4 pekan terakhir",
   hint seksi tren "30 hari terakhir · % selesai/hari", heatmap "12 pekan terakhir", KPI caption "· 30 hari".
4. **Animasi sekali** — semua m.* whileInView sudah `viewport={{ once: true }}` (dipertahankan); grafik Recharts (Area tren +
   Pie donut) kini dipasang saat PERTAMA masuk viewport via useInView(once) + placeholder tinggi tetap → animasi
   isAnimationActive bermain tepat saat masuk viewport, tidak diulang saat scroll balik. anime.js bar stagger tetap digerbang
   barsPlayedRef; guard `bars.length === 0` ditambahkan (kartu empty-state).
5. **Empty-state bermakna** — RutinaEmptyState kompak (px-4 py-6): Misi chart (total 0), Tren (tidak ada jadwal 30 hari),
   Donut (tanpa kebiasaan aktif), Latihan ("Belum ada sesi Bugar — catat sesi pertamamu di tab Bugar", adaptif bila histori
   ada tapi di luar 30 hari), Asupan ("Belum ada jurnal makan … Bugar › Asupan"), Tubuh ("Belum ada check-in tubuh …").
   Laporan bulanan tetap punya empty-state lama.
6. **Token grafik** — kartu instrumen (Misi batang, Tren area, Heatmap, Donut, Mood, Bugar & Tubuh) dipindah ke parchment
   `bg-surface-primary` + hairline; stroke area = `--chart-stroke-4`, fill = `--chart-4` opasitas 0.22→0; batang puncak gradasi
   chart-1→chart-4, non-puncak content-primary/15, terpilih chart-stroke-4; label puncak chart-stroke-1 (AA di parchment);
   ikon Bugar = text-chart-stroke-4/3/2; status berat = text-success/text-warning. Heatmap: level 0 = surface-secondary (netral),
   level penuh = chart-stroke-1. Kartu tetap espresso (disengaja, identitas hero ink): KPI strip, Fokus Periode, BadgeCard, chip LV.
   Angka besar tetap kpi tokens + tabular-nums.
7. **Fitur existing tetap** — tab Pekan/Bulan (teruji berpindah + morph batang), drill-down hari (sheet mobile teruji
   "SHEET TERBUKA: Kamis, 5 November 2026…"; panel inspector desktop teruji "Minggu, 8 November 2026"), navigasi bulan kalender,
   collapsible Laporan & Piala (teruji buka), mood buttons, pintasan scroll. BONUS FIX: hitungan pemicu Piala "3/4 terbuka"
   → dinamis "3/8 terbuka" (koleksi v2.22 = 8 lencana) + tabular-nums.

## Interaktif & aksesibilitas
Kelas `interactive` dipasang pada: chip pintasan, tombol mood, tombol batang grafik, pemicu Laporan & Piala (menggantikan
rantai focus-visible bespoke — utility interactive sudah menyediakan focus-visible ring + active:scale). Heatmap cells & sel
kalender TIDAK diberi `interactive` (transform inline anime.js akan melawan transisi CSS transform pada elemen sama).

## Verifikasi
- `bun run lint` → 0 error, 0 warning. `bunx tsc --noEmit` → bersih. dev.log → GET / 200, PUT/GET /api/state 200, tanpa error runtime.
- Browser (agent-browser, session `stats`):
  - 390×844: errors kosong; KPI 2 kolom × 173px, overflow []; ketuk 5 Nov → sheet detail terbuka; ganti periode Bulan → ketuk
    batang → aria-live "P4: 4 misi selesai"; balik Pekan; buka Piala. Screenshot: /tmp/stats-390.png, -daysheet, -bulan, -wawasan, -piala.
  - 320×700: errors kosong; KPI 2 kolom × 138px, overflow []; scan seluruh layar: cx=0 di semua elemen (tidak ada potongan
    horizontal). Screenshot: /tmp/stats-320.png.
  - 1500×900: errors kosong; KPI 4 kolom × 208.5px (bukti fix 12-kolom); scan horizontal full-page []; klik 8 Nov → panel
    inspector detail. Screenshot: /tmp/stats-1500.png, -inspector.
  - VLM QA pada 390 final: label KPI & caption terbaca penuh, spacing angka-satuan baik, tidak ada teks terpotong/tumpang tindih.
- Data nyata tampil: 18 kebiasaan (donut 2/6/10), 540 terjadwal/12 selesai 30 hari, streak 1 (Bangun Pagi), rekor 2,
  281 transaksi (kalender & laporan), 48 hari check-in tubuh (tidur 7,4 jam; energi 3,7/5; hidrasi 5,6/8; berat −1,9 kg),
  laporan bulanan konsistensi 4%. Latihan/Asupan kosong sesuai data asli → empty-state bermakna tampil (bukan angka nol polos).

## Catatan untuk agent lain
- `RutinaBentoGrid` TIDAK menghapus breakpoint kolom yang tidak ditimpa — bila memakai className col-span/grid-cols custom,
  timpa SEMUA breakpoint dasar (2/42rem/52rem) yang relevan, atau grid diam-diam jadi 12 kolom di kontainer lebar.
- Dev server sandbox mati saat proses bash induk selesai; verifikasi browser harus dijalankan dalam SATU perintah bersama server
  (lihat pola skrip /home/z/verify-stats*.sh).
