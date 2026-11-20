# 5-c — Fix Agent: Data Integrity & Journal (Rutina 2.0)

Tanggal: 2026-11-20 · Scope ketat: `store.ts`, `sync-engine.ts`, `journal-canvas.tsx`, `journal-ui.ts`, `screens/journal.tsx`. Tidak ada file lain yang disentuh.

## Ringkasan perbaikan yang DITERAPKAN

### 1. startFresh reset penuh (P1) — store.ts
- Masalah: reset hanya menyentuh 8 kunci; workouts, foodEntries, bodyLogs (berat badan!), moodLogs, wallets, budgets, customCats, habitGroups, identityText, deloadUntil, fitTargets, catRenames, hiddenCats, calorieTarget, dailyGoal, quoteSavedDate lolos dari "hapus permanen".
- Perbaikan: pabrik `initialDomainState(): DomainSlice` (tipe `Pick<RutinaState, …24 kunci domain>`) kini menjadi SATU sumber kebenaran nilai awal — dipakai baik oleh seed `create()` maupun `startFresh` (seed & reset tak mungkin beda). Fungsi (bukan konstanta) agar array/objek tak berbagi referensi.
- `startFresh` juga mengosongkan `useJournalUi.noteMoods` (semua catatan terhapus → metadata mood ikut), dan `selectedDate` kembali hari ini. Docstring diperbarui menjelaskan wipe total (janji UI "permanen — perangkat + cloud"); snapshot push berikutnya = nilai pabrik di server.
- Verifikasi runtime (bun, /home/z/scratch-5c — sudah dihapus): seluruh 24 kunci + noteMoods kembali nilai pabrik setelah startFresh.

### 2. Negosiasi sinkron satu ranah waktu (P2) — sync-engine.ts
- Masalah: `localNewer = lastEditAt > Date.parse(remote.syncedAt)` mencampur jam klien vs jam server; skew Δ menjadikan suntingan lokal < Δ "kalah" → tertimpa snapshot server (hilang senyap).
- Perbaikan: bila `meta.lastSyncedAt > 0`, `localNewer = lastEditAt > lastSyncedAt` (keduanya jam perangkat). Fallback ke perilaku lama (bandingkan vs jam server) HANYA bila belum pernah sinkron. Guard demo-seed, `localBeatsEmpty` (syarat `neverSynced`), `suppress`, jalur unggah-pertama (`remote` tanpa dataset), dan forcePull tetap utuh.

### 3. deleteHabit — afterId menggantung (P3) — store.ts
- Kebiasaan lain yang `afterId === id` dihapus di-set `afterId: null` (tipe `string | null`; kebiasaan.tsx sudah fallback aman).

### 4. deleteNote — pangkas noteMoods (P3) — store.ts
- `noteMoods` ternyata Record di store `useJournalUi` (journal-ui.ts), bukan di store utama. deleteNote kini memangkas entri mood id terkait saat itu juga (tidak menunggu kanvas ditutup).
- BUTUH PERHATIAN: ini menambah edge runtime melingkar `store.ts ↔ journal-ui.ts` (journal-ui memang sudah mengimpor store). Aman karena `useJournalUi` hanya disentuh DI DALAM aksi (runtime), tidak saat evaluasi modul — diverifikasi via bun dengan urutan evaluasi paling berisiko (journal-ui duluan): tanpa TDZ. Komentar penjelas ada di import.

### 5. Flush page-hide + retry focus (P3) — sync-engine.ts
- `flushPendingEdits()`: bilas tanpa debounce; guard `!ready || suppress` (selama boot, biarkan boot() yang menuntaskan), cek `hasUnsyncedEdits()`, bersihkan pushTimer, panggil `push()` (guard in-flight internal push mencegah dobel — kini mem-*queue* ulang).
- Listener `visibilitychange` (hanya state 'hidden'), `pagehide`, dan `focus` (retry push hanya bila status 'error'/'offline' + ada suntingan tertunda; sekali per event, tanpa loop). Semua listener di-register & di-cleanup selaras pola 'online'/'offline' yang sudah ada. Helper `hasUnsyncedEdits()` juga dipakai ulang di onOnline (DRY, semantik sama).

### 6. Jurnal — canvas + ui + screen
- journal-canvas.tsx:
  - `patchNote` hasilnya kini dicek; false → `conflictRef` + toast "Catatan dihapus dari perangkat lain" (pilih opsi toast, bukan re-create — lebih aman, tidak menghidupkan ulang catatan yang sengaja dihapus dari perangkat lain). SaveResult bertambah 'conflict'; autosave berikutnya di sesi itu berhenti menulis ke id hantu; `setNoteMood` DILOMPATI saat konflik (tidak menanam entri mood yatim); indikator kembali 'idle' (tidak bohong "Tersimpan").
  - Input judul & isi: + `rounded-md focus-visible:ring-1 focus-visible:ring-border-strong` (token ada: `--color-border-strong`) — indikasi fokus keyboard jujur, tipis, tak mengganggu kertas menulis.
  - Tombol Miring: `font-serif` → `${playfair.className}` (helper serif.ts; sudah diimpor).
- journal-ui.ts: label mood Ceria `text-matcha` (3.2:1) → `text-success` (#4f7440 ≈ 4.6:1, lolos WCAG AA teks kecil); titik warna tetap.
- screens/journal.tsx:
  - `<h1 className="sr-only">Jurnal</h1>` di puncak konten layar.
  - NoteList: `role="list"` pada wadah; `role="listitem"` pada `m.article` NoteCard (props motion utuh); tombol "Tampilkan lagi" dibungkus `role="presentation"` agar tidak dihitung sebagai butir daftar.
  - whileTap: 0.98→0.97 (Tulis catatan), 0.95→0.96 (Tulis catatan pertama & Hapus pencarian).

## Verifikasi
- `bun run lint` → bersih (0 error/warning).
- `bun run typecheck` (tsc --noEmit) → bersih.
- Smoke runtime bun (dihapus setelah pakai): siklus impor aman dua arah, deleteNote/deleteHabit/startFresh/patchNote perilaku benar.
- dev.log: tanpa error; dev server dikelola sistem (tidak saya jalankan sesuai instruksi).

## Catatan untuk agen berikutnya
- `initialDomainState()` di store.ts HARUS tetap sejalan DOMAIN_KEYS sync-engine.ts saat menambah kunci domain baru (tipe `DomainSlice` Pick memaksa kunci ada di RutinaState; sinkronisasi manual bila DOMAIN_KEYS berubah).
- `startFresh` reset state SETELAH hidrasi (aksi pengguna) — aman terhadap skema persist (partialize/version/migrate tak berubah).
