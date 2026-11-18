# Task 2 — Layar "Kebiasaan" + Ganti Tab Jurnal → Kebiasaan

Agent: kebiasaan-screen (Task ID 2)
Scope: menambah tab/layar **Kebiasaan** sebagai pusat Habit Intelligence, menggantikan tab **Jurnal** di navigasi bawah. Layar Jurnal TETAP ada (file `screens/journal.tsx` tidak disentuh) dan tetap dapat dibuka lewat Quick Action Hub. Lihat catatan agen lain di `/agent-ctx` untuk konteks task sebelumnya (2a, 2b, 2c, 2-f, dst.).

## File yang diubah/dibuat

### Dibuat
- `src/components/rutina-mobile/screens/kebiasaan.tsx` — `KebiasaanScreen` default export, `'use client'`.

### Diubah (minimal, sesuai spesifikasi)
- `src/components/rutina-mobile/store.ts` — `Screen` type + `'kebiasaan'`; `SCREEN_THEME.kebiasaan = { bg: '#F5F3EE' }` (Record tetap lengkap).
- `src/components/rutina-mobile/bottom-nav.tsx` — TABS posisi ke-4: `jurnal/BookOpen` → `kebiasaan/Sprout` (import `BookOpen` dibuang).
- `src/components/rutina-mobile/rutina-app.tsx` — `ORDER = ['beranda','bugar','keuangan','kebiasaan','statistik','jurnal','profil']` (arah transisi tetap konsisten; jurnal tetap di ORDER agar transisi dari/ke layar jurnal tidak aneh); render `{screen === 'kebiasaan' && <KebiasaanScreen />}`; baris render jurnal TETAP; import baru.
- `src/components/rutina-mobile/desktop-sidebar.tsx` — NAV_ITEMS item ke-4: `jurnal` → `{ id: 'kebiasaan', label: 'Kebiasaan', icon: Sprout }` (Profil tetap terakhir).
- `src/components/rutina-mobile/quick-action-hub.tsx` — aksi `nav-kebiasaan` (`label: 'Buka Kebiasaan'`, `value: 'buka kebiasaan habit kebun tanaman'`, ikon `Sprout`, `screen: 'kebiasaan'`) ditempatkan tepat sebelum `nav-jurnal` yang TETAP ada.

Tidak menyentuh: `profile.tsx`, `sync-engine.ts`, `screens/journal.tsx`, `habit-sheet.tsx`, `prisma/`, `package.json`, `scripts/`.

## Isi layar Kebiasaan (urut dari atas)

1. **Header** — animasi masuk persis journal.tsx (`m.header` 0.45s standard); `RutinaSectionHeader` dengan `eyebrow={longDateLabel(todayISO())}`, `title="Kebiasaan"`, `description="{nAktif} kebiasaan aktif · {selesai}/{terjadwal} selesai hari ini"` (selesai/terjadwal dihitung dari habit terjadwal hari ini).
2. **Strip ringkasan** — grid 3 kartu (`RutinaCard` compact/2xl + `RutinaMetric`, stagger `journalList`/`journalCard`): "Runtun terpanjang" (max `habitStreak` habit aktif, unit hari, trend up saat > 0), "Selesai pekan ini" (total `doneCountOn` Senin–hari ini via `weekStartISO`), "Tanaman" (jumlah habit tahap `pohon-dewasa`/`berbunga` via `plantStageOf`, unit pohon).
3. **Saran Coach** (render hanya bila ada isi; maks 3 kartu total, Goldilocks maks 2):
   - Nudge "Jangan bolong dua kali" per habit dari `missedYesterday(...)` — kartu hangat emas (Flame, `border-gold/40 bg-gold/15`), judul habit + "Terlewat kemarin — jangan bolong dua kali.", tombol h-11 "Tandai selesai kemarin" → `toggleHabit(id, addDaysISO(today, -1))` + toast.
   - Goldilocks: tone `naik` → Sparkles aksen matcha (`bg-secondary text-success`); tone `kecilkan` → Target aksen espresso (`bg-espresso/10 text-espresso`); tampil `advice.title` + `advice.text`.
4. **Agenda hari ini** — habit aktif terjadwal `scheduledOn(h, today)` belum selesai → `TaskRow` wiring PERSIS home.tsx (`done`, `streak={habitStreak(h, completions, today)}`, `recent={recentDays(...)}`, `weekDone={weekDoneCount(...)}`, `expanded={expandedTaskId === h.id}`, `xp={XP_PER_TASK}`, `onToggle`/`onExpand`/`onEdit`), urut jam pengingat (helper `byTime` senada home), grid `grid-cols-1 gap-2.5 sm:grid-cols-2`; lipatan "Selesai ({n})" collapsed default (pola home: centang dari daftar terbuka otomatis membuka lipatan); chip `aria-current="date"` "Hari ini" di aksi header; `RutinaEmptyState` "Tidak ada agenda terjadwal" bila kosong.
5. **Taman Pertumbuhan** — `<PlantGarden />` (komponen membawa `RutinaSectionHeader` + strip gulirnya sendiri, dibungkus `<section aria-label="Taman Pertumbuhan">`; tidak ada header ganda).
6. **Semua kebiasaan** — habit aktif dikelompokkan per `HABIT_CATS` (header kelompok: titik warna `HABIT_CAT_COLORS` + label + chip jumlah), grid TaskRow dengan `done={isDoneOn(completions, today, h.id)}`. Di bawahnya lipatan "Arsip ({n})" (AnimatePresence + chevron rotasi, pola home) berisi baris ringkas: ikon arsip, judul + "{cat} · diarsipkan", tombol "Pulihkan" (h-11, ArchiveRestore) → `setHabitArchived(id, false)` + toast, tombol ikon sunting (h-11 w-11, Pencil) → `openHabitEdit(id)`.
7. **Empty state** — bila `habits.length === 0`: `RutinaEmptyState` (Sprout) + tombol "Tanam kebiasaan pertama" → `openHabitCreate()`; seluruh seksi lain disembunyikan.
8. **CTA akhir konten** — tombol penuh h-12 "Kebiasaan baru" (Plus) → `openHabitCreate()` (pola "Tulis catatan" journal.tsx, sengaja di akhir konten sesuai spesifikasi; FAB global tetap ada).

A11y: `<section aria-label>` per seksi, `aria-expanded`+`aria-controls` pada kedua lipatan, `aria-current="date"`, `aria-label` pada tombol arsip, target sentuh ≥44px (h-11/min-h-11; TaskRow tetap komponen lama), `focus-visible` konsisten. Animasi pendek & tenang via `journalList`/`journalCard` + `motionTokens` (header 0.45s, stagger 0.05s/0.07s, fold 0.32s).

## Catatan teknis penting (React Compiler)

- `weekDoneCount`/`recentDays`/`byTime` diduplikasi lokal di kebiasaan.tsx (di home.tsx memang private, tidak diekspor store); `weekStartISO` diimpor dari store.
- **Temuan penting**: `const yesterday = addDaysISO(today, -1)` di level render lalu di-pass ke `toggleHabit(...)` dalam onClick memicu error `react-hooks/preserve-manual-memoization` ("This dependency may be modified later" pada `today`) — React Compiler menganggap nilai turunan `today` yang masuk ke fungsi tak-teranalisa bisa mengubah dependency memo. Solusi: hitung `addDaysISO(today, -1)` INLINE di dalam handler (ada komentar penjelas di kode). Diverifikasi lewat bisect bertahap (probe file, sudah dihapus). Pola `toggleHabit(h.id, today)` langsung AMAN (dipakai home.tsx juga).
- `missedYesterday` TIDAK difilter "belum selesai hari ini" (beda dari home) karena tombol aksinya di sini adalah backfill kemarin — spesifikasi meminta "untuk tiap habit dari missedYesterday(...)".

## Verifikasi

- `bunx tsc --noEmit` → 0 error (termasuk error pre-existing store.ts:1586 yang dulunya dilaporkan task 2a kini sudah tidak ada).
- `bun run lint` → PASS, exit 0, 0 error 0 warning seluruh proyek.
- Dev server (`dev.log`) recompile bersih berulang kali tanpa error setelah perubahan (`✓ Compiled`, `GET / 200`).

## Cara memverifikasi manual

Buka preview → tab bawah ke-4 kini "Kebiasaan" (ikon Sprout); bilah sisi desktop menampilkan Kebiasaan sebelum Statistik; Quick Action Hub (Cmd/Ctrl+K atau "/") → ketik "kebiasaan" → "Buka Kebiasaan"; "Buka Jurnal" tetap tersedia di hub dan layar jurnal berfungsi normal.
