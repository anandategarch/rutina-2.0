# Task 1 — Beranda Command Center (audit pengguna: nearly-done, insight kontekstual, draf jurnal, tombol statistik, peringatan anggaran)

Tanggal: sesi ini. Lingkup: HANYA 4 file yang diizinkan (edit bedah, tanpa refactor di luar scope).

## File yang diubah

1. `src/components/rutina-mobile/daily-highlight.ts`
2. `src/components/rutina-mobile/daily-highlight-card.tsx`
3. `src/components/rutina-mobile/screens/home.tsx`
4. `src/components/rutina-mobile/home-finance-card.tsx`

## Ringkasan per bagian

### A. nearly-done (Sorotan Hari Ini)
- `daily-highlight.ts`:
  - `HighlightKey` + `'nearly-done'`; union `visual` + varian `{ kind: 'progress'; done; total; pct; nextTitle; nextTargetMin }`.
  - Blok prioritas BARU #5 (setelah goal-near, sebelum bonus): kondisi `todayHabits.length >= 2 && doneToday >= 1 && doneToday < todayHabits.length`. `doneToday` DIPINDAH dari blok perfect ke atas (dihitung sekali, dipakai blok 5 dan 7).
  - Misi berikutnya = pending terjadwal hari ini, urut reminder "HH:MM" terawal (null paling belakang, tie-break `localeCompare` judul).
  - `nextTargetMin`: struktur `Habit.target` = JUMLAH/hari (integer) + `Habit.unit` = SATUAN string ("gelas"|"halaman"|"menit"|"langkah"|"kali"|custom ≤12 char, lihat habit-sheet.tsx:771). Adaptasi jujur: hanya `unit === 'menit'` (trim+lowercase) dan `target > 0` → `target`; satuan lain → null. Konsisten dengan `isMeasured` di task-row.tsx (`target != null && target > 0`).
  - Return persis spec: title 'Sedikit lagi — lanjutkan', cta 'open-stats' (BUKAN 'complete-habit' — invariant dedup v2.37, kartu informatif), pct = done/total.
  - Blok 5–8 lama dinomori ulang 6–9; komentar prioritas di kepala file diperbarui.
- `daily-highlight-card.tsx`:
  - `KEY_ICON` + `'nearly-done': ListChecks` (import lucide ditambah). TIDAK ditambah ke URGENT_KEYS (kartu tenang).
  - Render visual 'progress': eyebrow `justify-between` (`{done} dari {total} misi` kiri; `Target {n} mnt` kanan hanya bila `nextTargetMin != null`), lalu bar `role="progressbar"` h-2 bg-surface-sunken dengan `m.div` fill `bg-primary` `origin-left` animasi `scaleX` + `motionTokens.spring.bar`, aria-label "Progres misi hari ini X persen" + aria-valuenow/min/max (pola budget/goal).

### B. Insight kontekstual (home.tsx)
- `netCash7` useMemo: iterasi txs non-transfer dalam jendela `[addDaysISO(today,-6), today]` (7 hari kalender, konsisten strip "Pengeluaran 7 hari" di HomeFinanceCard); kembalikan `{ net: masuk-keluar, count }`.
- Caption RutinaMetric "Saldo bersih": bila `count > 0` → `Surplus|Defisit {formatIDRShort(|net|)} dari arus kas 7 hari — transfer antar-dompet dikecualikan`; else caption lama. Label/value TIDAK diubah.

### C. Tombol draf jurnal (home.tsx)
- Terverifikasi: `journal-ui.ts` ekspor `isDraftNote` (title kosong), `noteFirstLine`, `useJournalUi.openCanvas(note)`; `JournalCanvas` dipasang di `compose-sheet.tsx:214` dan ComposeSheet dipasang global di `rutina-app.tsx:345` → openCanvas aman dari Beranda.
- `latestDraft` useMemo = `notes.find(isDraftNote)` (store menyimpan terbaru dulu). `draftLabel`: first line terpotong 24 char + '…' (… hanya bila benar-benar terpotong); first line kosong → "Lanjutkan draft terakhir".
- Render hanya bila ada draf: chip h-9 `border-module-journal/40 bg-surface-primary px-3.5 text-meta font-bold text-module-journal-strong` + hover/focus-visible, ikon PenLine, baris tersendiri mt-2 setelah chip folder, onClick `useJournalUi.getState().openCanvas(latestDraft)`, aria-label "Lanjutkan menulis draf jurnal terakhir".

### D. Tombol Statistik (home.tsx)
- `m.button` BarChart3 sebelum tombol Jurnal di header; gaya identik tombol Jurnal (h-9 w-9 rounded-full border-border bg-surface-primary/70 shadow-soft + hover/focus-visible + whileTap 0.92); aria-label "Buka Statistik — ringkasan dan perkembangan"; onClick `setScreen('statistik')`.

### E. Peringatan anggaran (home-finance-card.tsx)
- `budgetAlert` useMemo: pakai helper `monthSpendByCat(txs, today.slice(0,7))` dari `finance/utils` (sudah ada — setara spec: type keluar, bulan berjalan, agregasi per cat); bandingkan `budgets` (limit > 0), ambil rasio tertinggi; tampil bila ≥ `BUDGET_WARN_PCT` (0.85, diimpor dari `daily-highlight` — satu sumber ambang dengan Sorotan budget-warning).
- Strip `<button>` full-width sebagai elemen PERTAMA di dalam `<RutinaCard>` (otomatis tampil di kedua cabang empty/normal), `rounded-xl border px-3.5 py-2.5 text-left` + mb-4; rasio < 1 → `border-gold/45 bg-gold/15` + TriangleAlert `text-warning`; rasio ≥ 1 → `border-clay/40 bg-clay/15` + ikon `text-content-danger`. Teks `text-note font-semibold`: "Anggaran {catMeta(cat).label} terpakai X%" + span `text-meta text-content-muted` " — sisa {formatIDRShort(limit-spent)}" (negatif tampil apa adanya — preseden teks budget-warning Sorotan). onClick `setScreen('keuangan')` + `setUiPref({ finTab: 'anggaran' })` (selector `setUiPref` ditambah). aria-label lengkap deskriptif.

## Hasil verifikasi
- `bunx eslint` pada 4 file: BERSIH (tanpa error/warning).
- `bunx tsc --noEmit`: satu-satunya error adalah pre-existing di `fitness/training-calendar.tsx(278)` — file agen lain (task 3f/bugar), BUKAN dari file ini; keempat file saya nol error type.
- `curl localhost:3000/` → 200; dev.log bersih (compile sukses, tanpa runtime error).
- Region yang diubah dibaca ulang — JSX/braces seimbang.

## Keputusan penting
1. Struktur target Habit: `target: number|null` (jumlah) + `unit: string|null` (satuan bebas) — "target menit" hanya valid saat unit "menit"; gelas/halaman/langkah/km TIDAK dikonversi → `nextTargetMin = null`.
2. Jendela "7 hari terakhir" = `[today-6, today]` (7 hari kalender inkl. hari ini) — mengikuti konvensi `weekSpend` di HomeFinanceCard.
3. `doneToday` dipindah ke atas blok 5 agar nearly-done dan perfect berbagi satu perhitungan (tanpa duplikasi).
4. Ambang 0.85 peringatan anggaran diimpor dari `BUDGET_WARN_PCT` (satu sumber kebenaran lintas Sorotan & kartu keuangan).
5. Tombol draf jurnal dirender sebagai baris tersendiri mt-2 setelah deret chip folder (hindari campur tinggi h-8/h-9 dalam satu flex-wrap).
6. nearly-done sengaja TIDAK memfilter `excludeHabitIds` — kartu murni informatif (cta open-stats), tidak membuat tombol centang kedua.
