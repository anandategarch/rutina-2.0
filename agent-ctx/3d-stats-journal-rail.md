# Task 3-d — Statistik + Jurnal: Module Identity & Adaptive ContextRail

Subagent: 3-d (Statistik Mineral Slate + Jurnal Dusty Mauve + ContextRail adaptif). Status: DONE — `bun run lint` exit 0, `bunx tsc --noEmit` exit 0 (baseline sebelum edit juga 0; tidak ada error baru).

Scope: HANYA `screens/stats.tsx`, `screens/journal.tsx`, `context-rail.tsx`. Tidak menyentuh globals.css, rutina-*.tsx foundation, store.ts, atau screen lain (semua read-only).

---

## 1. STATISTIK (stats.tsx) — identitas Mineral Slate + bento desktop

### Identitas modul (data-module="stats" → utilitas kontekstual module-accent)

| # | Lokasi | Sebelum | Sesudah |
|---|--------|---------|---------|
| 1 | Akar layar (div scroll di dalam TooltipProvider) | — | `data-module="stats"` (className tetap) |
| 2 | `SectionTitle` (lokal di stats.tsx) — judul seksi | teks polos | + titik `bg-module-accent` (h-1.5 w-1.5) sebelum judul |
| 3 | `SectionTitle` — hint kanan (`"30 hari terakhir"`, `"data modul Bugar"`, `"N/4 terbuka"`) | `text-content-muted` | `text-module-accent-strong` |
| 4 | Tabs pemilih periode "Pekan/Bulan" (aktif) ×2 trigger | `data-[state=active]:bg-primary …text-primary-foreground` | `data-[state=active]:bg-module-accent …text-module-accent-fg` (solid slate, kontras aman light+dark) |
| 5 | Chip suasana hati terpilih (kartu Suasana Hati, di atas kakao) | `border-primary bg-primary text-primary-foreground` | `border-module-accent bg-module-accent text-module-accent-fg` |
| 6 | Pil badge tren "naik/turun/stabil" (kartu Tren Penyelesaian) | `bg-primary/20 text-pistachio` | `bg-module-accent text-module-accent-fg` (pil solid — /15+strong kontrasnya buruk di atas kartu kakao mode terang) |
| 7 | Batang penggunaan anggaran (non-over) di Laporan Bulanan | `bg-primary` | `bg-module-accent` (`bg-destructive` saat lewat batas TETAP — semantik danger) |

Total 7 swap identitas (dalam anggaran 6–12).

**Sengaja TIDAK diubah:** gradien ring XP (`chart-4→chart-1`) & pil LV `bg-cocoa text-pistachio` (gamifikasi matcha); batang puncak grafik `from-chart-1 to-chart-4` + label `text-pistachio` (token grafik); ring misi `var(--chart-4)`; warna seri donut kategori (`var(--chart-1..5)`); batang konsistensi `from-primary to-pistachio` + angka `text-success` (semantik sukses); batang kategori `bg-clay`; badge/lencana terbuka `border-primary/45 bg-primary/20 text-pistachio` + lingkaran api streak `bg-primary/20` (gamifikasi); semua `focus-visible:outline-primary` (token interaksi); Heatmap/TrendLine (di luar file ini); `bg-gold`/`text-warning`/`text-content-danger` (semantik).

### Bento desktop (xl+) — 4 pasangan seksi bersebelahan

Verifikasi DOM (anak langsung wadah scroll): header → ring XP → grafik misi → **Ringkasan Pekan → Wawasan & Analitik** → div Heatmap+TrendLine → **Kalender → Laporan** → **Pekan Ini → Bugar & Tubuh** → **Piala → Streak** → DayDetailSheet. Keempat pasangan kandidat TERKONFIRMASI bersaudara berurutan (div Heatmap ada DI LUAR pasangan mana pun — hanya memisahkan pasangan 1 dan 2), jadi keempatnya dipasangkan; tidak ada yang di-skip.

| Pasangan | Span | Wrapper margin |
|---|---|---|
| Ringkasan Pekan + Wawasan & Analitik | `medium` + `medium` | `mt-6` |
| Kalender Aktivitas + Laporan Bulanan | `wide` + `feature` | `mt-6` |
| Pekan Ini vs Pekan Lalu + Bugar & Tubuh | `medium` + `medium` | `mt-6` |
| Piala & Lencana + Streak berjalan | `medium` + `medium` | `mt-3` |

Implementasi: tiap pasangan dibungkus satu `RutinaBentoGrid` (berisi 2 `RutinaBentoItem`); margin `mt-6`/`mt-3` milik seksi dipindah ke wrapper grid; konten dalam pasangan di-re-indent (+4 spasi) via skrip marker-based agar diff bersih & valid — urutan DOM dipertahankan 100%. Semua seksi di atasnya (header pemain, ring XP, grafik misi) + div Heatmap/TrendLine tetap full-width. Animasi `whileInView` asli tiap seksi tidak disentuh. Perilaku responsif mengikuti foundation: `medium` = ½ lebar mulai sm, pasangan 2 bertumpuk sampai lg lalu 8+4 di xl.

---

## 2. JURNAL (journal.tsx) — light touch, identitas Dusty Mauve

| # | Lokasi | Sebelum | Sesudah |
|---|--------|---------|---------|
| 1 | Akar layar | — | `data-module="journal"` |
| 2 | Header `RutinaSectionHeader` (eyebrow tanggal) | tanpa `accent` | `accent` → eyebrow + titik kini mauve (`text-module-accent-strong` / `bg-module-accent`, prop baru foundation) |
| 3 | Chip filter folder AKTIF (Semua/Kerja/Ide/Bacaan/Pribadi) | `bg-surface-inverse text-content-inverse shadow-soft` | `border border-module-accent/35 bg-module-accent/15 text-module-accent-strong` (chip non-aktif tetap netral) |
| 4 | Ikon keadaan kosong "Tidak ada catatan yang cocok" | lingkar `bg-secondary` + `text-primary` | `bg-module-accent/15` + `text-module-accent-strong` |

Total 4 swap (di bawah batas ~6). **Tetap parchment/netral:** tombol CTA "Tulis catatan" (`bg-primary` — aksi utama), input pencarian + ring fokus (`primary/50` — interaksi), permukaan baca/tulis (NoteCard, kanvas — tidak di-tint), badge folder di kartu (`bg-secondary`), dot suasana hati (`MOOD_DOT` — di journal-ui.tsx, luar scope), label seksi. Editor TIDAK diwarnai mauve sesuai instruksi.

---

## 3. CONTEXT RAIL ADAPTIF (context-rail.tsx)

Dirombak jadi rail responsif terhadap layar aktif (`useRutina((s) => s.screen)`), tetap 3 slot `m.section` dengan animasi masuk identik (delay berjenjang 0.05/0.13/0.21, duration.enter, easing standard) via wrapper `RailSection`. `aside aria-label="Panel konteks"` & seluruh className wadah tidak berubah. `MetricRow` dipertahankan (+ prop opsional `valueClass` untuk warna semantik/identitas nilai + `truncate` pada nilai/label agar judul panjang aman). Kartu keadaan kosong memakai pola garis putus-putus yang sudah ada (`RailCalm`, teks tenang gaya "Semua misi hari ini telah dijadwalkan."). Aksen ikon memakai PETA EKSPLISIT `MODULE_TINT` / `MODULE_TEXT` dari rutina-module.tsx (rail berada di luar layar ber-`data-module`).

| Layar | Kartu 1 | Kartu 2 | Kartu 3 |
|---|---|---|---|
| beranda / profil / jurnal (default) | **Ringkasan pekan ini** — misi pekan ini (dayCounts 7 hari), streak (bestStreak), saldo bersih (masuk−keluar, transfer dikecualikan) — PERSIS kartu lama | **Berikutnya** — habit terjadwal dgn reminder > sekarang (logika lama utuh) | **Tips** — teks lama utuh |
| bugar | **Kesiapan tubuh** — bodyLog terbaru (sort tanggal desc): tidur (jam, koma desimal) + energi (n/5) + hint kesiapan; kosong → "Belum ada check-in tubuh" | **Rekor pribadi** — top-2 `prBoard(workouts)` (e1RM Epley, "≈ 72,5 kg", nilai `MODULE_TEXT.bugar`); tanpa sesi beban → ringkasan sesi terakhir (durasi + shortDateLabel); tanpa latihan → pesan tenang | **Hidrasi** — gelas hari ini dari bodyLog hari ini (fallback log terakhir) "6/8 gelas" + hint sisa; kosong → tips 8 gelas |
| keuangan | **Ringkasan periode** — saldo bersih + `monthFlow(txs, yyyy-ff)` masuk/keluar bulan berjalan (formatIDRShort) | **Anggaran** — kategori dgn rasio pakai tertinggi (`monthSpendByCat` ÷ limit budgets, mirip monthReport stats): "% terpakai" (nilai `MODULE_TEXT.finance`) + "dari batas X"; tanpa pemakaian → "N dompet · M transaksi" | **Aktivitas terakhir** — 3 tx terbaru (sort ts desc): catatan (truncate) + nominal; masuk `+` hijau (bg-success/15/text-success), keluar `−` merah (bg-destructive/10/text-content-danger), transfer netral tint finance |
| kebiasaan | **Konsistensi** — streak + misi pekan ini, chip matcha `bg-primary/15 text-success` | **Agenda** — reuse penuh logika+markup "Berikutnya" (judul "Agenda") | **Taman** — jumlah habit aktif + hint "Setiap misi yang selesai ikut menyirami tanamannya." |
| statistik | **Insight** — misi 7 hari terakhir vs 7 hari sebelumnya (dayCounts ×2) dgn baris delta ±N (ikon TrendingUp/Down/Minus, nilai `MODULE_TEXT.stats`); 0-0 → pesan tenang | **Fokus** — habit paling sering selesai 7 hari terakhir (hitung completions per habit; judul di-truncate); fallback jumlah habit aktif | **Tips** — sama dgn default |

Catatan teknis: semua derivasi dihitung render-time untuk display (tanpa callback — aman React Compiler); array store disalin sebelum sort (`[...txs]`, `[...workouts]`) agar state tidak termutasi; semua nilai didegradasi anggun (empty state tenang); tanpa emoji; bahasa Indonesia; angka pakai `formatIDRShort` / koma desimal `replace('.', ',')`.

---

## Verifikasi

- `cd /home/z/my-project && bun run lint` → exit 0.
- `bunx tsc --noEmit` → exit 0, tanpa error baru (baseline 0/0).
- Sanity: stats.tsx memuat 4 `RutinaBentoGrid` + 8 `RutinaBentoItem` (medium/medium, wide/feature, medium/medium, medium/medium); `data-module="stats"` & `data-module="journal"` masing-masing tepat 1 di akar layar; seksi & DayDetailSheet tidak hilang (file 1562 → 1596 baris hanya karena wrapper + re-indent).
- Tidak menjalankan dev server / build sesuai instruksi.
