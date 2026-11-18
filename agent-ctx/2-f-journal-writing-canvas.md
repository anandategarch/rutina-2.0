# 2-f — Journal Writing Canvas (Rutina 2.0 jurnal screen)

Agent: 2-f (journal writing canvas)
Status: SELESAI — lint scope lolos, tsc scope bersih, dev.log bersih.

## Ringkasan

Jurnal diubah dari "tumpukan kartu" menjadi pengalaman menulis yang tenang:
mode MENULIS (kanvas layar penuh, autosave) dan mode BACA (reader editorial)
kini dua pengalaman yang jelas terpisah, dengan layar daftar yang lebih hening.

## File dibuat / diubah

1. **`src/components/rutina-mobile/journal-ui.ts`** (BARU)
   - Mini zustand store: `{ canvasOpen, editing, noteMoods, openCanvas(note?), closeCanvas(), setNoteMood(id, mood|null) }`.
   - `noteMoods` (id catatan → mood) dipersist ke localStorage (`rutina-2.0-journal-ui`, `skipHydration` + `partialize` hanya noteMoods — pola yang sama dengan store utama; rehydrate dipanggil dari JournalScreen pasca-mount).
   - Alasan: store.ts DILARANG diubah; model `Note` tidak punya field mood; ReadingSheet (di cangkang) perlu membuka kanvas.
   - Helper tulis: `createNote(input): string` — meniru `addNote` persis (id `note-${Date.now()}`, prepend, tone `(len*2)%3`, date 'Hari ini') tapi mengembalikan id secara sinkron; `patchNote(id, patch): boolean` — update title/body/folder TANPA mengubah id/date/pinned/tone, via `useRutina.setState` publik (tetap lewat middleware persist + sync engine; store tidak punya `updateNote`).
2. **`src/components/rutina-mobile/journal-canvas.tsx`** (BARU)
   - Overlay layar penuh `absolute inset-0 z-[70] bg-background` flex-col, TANPA chrome dasbor, menutupi navigasi bawah (z-20) dan semua sheet (z-50).
   - Bilah atas: tombol kembali (ChevronLeft, aria "Kembali ke jurnal") — indikator autosave center-right — tombol "Selesai" (bg-primary).
   - Judul: input playfair `text-[26px] sm:text-3xl font-semibold`, placeholder "Judul refleksi…", transparan & tanpa border; Enter → fokus ke isi.
   - Metadata: baris "SUASANA" (chip MOODS Ceria/Baik/Biasa/Lelah + ikon, redup sampai aktif) + "KATEGORI" (chip FOLDER_SHORT).
   - Isi: textarea auto-grow `[field-sizing:content] min-h-[38vh]` `text-[15.5px] leading-[1.8] text-content-secondary`, placeholder "Tulis apa yang ada di pikiranmu…".
   - Bilah format bawah: Bold/Italic (bungkus seleksi dengan `**` / `_`, murni manipulasi teks, seleksi dipulihkan via rAF) + hitung kata "N kata".
   - Autosave: debounce 800 mdetik; status `idle → saving ("Menyimpan…" + titik animasi) → saved (Check + "Tersimpan", text-success)`. Catatan baru dibuat pada simpanan pertama (id disimpan di ref); edit lanjutan via patchNote. Flush saat tombol kembali/Selesai/Escape + jaring pengaman flush saat unmount (idempoten via lastSavedRef). Gagal menyimpan → toast error + draf tetap di layar (kanvas TIDAK ditutup saat flush gagal — tidak ada data hilang).
   - Aturan kosong: catatan baru kosong → dibuang diam-diam; catatan lama dikosongkan total → dihapus saat flush (toast "Catatan kosong dihapus", perilaku map standar app catatan).
   - Focus trap (useFocusTrap) + fokus awal cerdas: catatan baru → judul, menyunting → akhir isi. Escape menutup.
   - Konten `max-w-[680px] mx-auto px-5 pt-6`; safe-area atas/bawah.
3. **`src/components/rutina-mobile/screens/journal.tsx`** (REWORK)
   - Header: `RutinaSectionHeader` eyebrow = `longDateLabel(todayISO())` (small-caps), title "Jurnal", description "N catatan · M disematkan".
   - Tombol utama "Tulis catatan" (h-12 full-width, bg-primary matcha, PenLine, Geist bold) → openCanvas().
   - Pencarian (judul+isi) dipertahankan + chip filter kategori kini dengan jumlah nyata (`folderCount`), pencarian+filter digabung.
   - Daftar satu kolom tenang (pengganti masonry): judul font-bold, cuplikan 2 baris text-content-muted, kaki kartu = chip kategori + titik/label mood + tanggal. Kartu dibuka ke ReadingSheet; tombol semat & SUNTING (buka kanvas) per kartu, target 44px.
   - Bagian "Disematkan" dulu, lalu "Catatan (lain)"; stagger variants journalList/journalCard dipertahankan.
   - Empty state: `RutinaEmptyState` "Belum ada catatan / Mulailah dengan satu kalimat jujur…" + tombol "Tulis catatan pertama"; hasil pencarian kosong → pesan "Tidak ada catatan yang cocok".
   - Rehydrate journal-ui di useEffect (pola skipHydration).
4. **`src/components/rutina-mobile/reading-sheet.tsx`** (POLISH)
   - Reader editorial: judul playfair text-2xl, metadata (chip kategori + chip mood dengan titik warna + tanggal + indikator pin), isi `max-w-[62ch] whitespace-pre-wrap text-[15.5px] leading-[1.85]`, stagger konten halus (delay 0.08/0.14/0.2/0.26) di atas spring sheet.
   - Panel kini `max-h` + scroll untuk catatan panjang.
   - Footer: "Sunting" (buka kanvas DI ATAS reader — reader tetap terbuka di bawahnya; setelah kanvas ditutup, pembaca kembali dengan isi terbaru) + Sematkan/Lepas + Hapus (AlertDialog konfirmasi dipertahankan).
   - Escape reader kini dijaga: diabaikan selama `canvasOpen` (Escape milik kanvas duluan).
   - Fallback judul kosong "Tanpa judul" (italic).
5. **`src/components/rutina-mobile/compose-sheet.tsx** (MODIF RINGAN)
   - `<JournalCanvas />` dipasang sebagai sibling AnimatePresence di komponen cangkang ini (ComposeSheet dimuat langsung oleh rutina-app) — posisi anak-langsung-cangkang membuat overlay absolut kanvas menutupi seluruh aplikasi TANPA mengubah rutina-app.tsx. ComposeSheet sendiri tidak diubah fungsinya.
   - Catatan implementasi: task meminta `fixed inset-0`, tapi arsitektur bingkai HP desktop (DesktopStage tanpa transform) membuat `fixed` lolos keluar bingkai; `absolute inset-0` pada anak langsung cangkang mencapai tujuan yang sama (menutup nav bawah) dan konsisten dengan semua overlay lain (z-40/50/60).

## Alur tulis

- Baru: Jurnal → "Tulis catatan" (atau tombol empty state) → kanvas kosong (kategori awal = filter aktif) → autosave membuat catatan pada simpanan pertama → "Selesai"/kembali/Escape flush + toast "Catatan tersimpan".
- Sunting dari daftar: tombol pena di kartu → kanvas terisi penuh (payload snapshot note) → autosave patch.
- Sunting dari reader: "Sunting" → kanvas DI ATAS reader (reader tetap terbuka) → tutup kanvas → kembali membaca versi terbaru. Escape bertingkat: kanvas dulu, lalu reader.
- Beranda: tombol "Catatan Baru" + "+" folder TETAP memakai ComposeSheet (flow lain tidak disentuh, home.tsx terlarang).

## Fitur lama — akuntansi

- Folder + filter (journalFilter via openFolder dari Beranda) ✓ dipertahankan + jumlah.
- Pencarian judul+isi ✓ dipertahalan.
- Sematkan/lepas (kartu + reader) ✓.
- Hapus + konfirmasi AlertDialog (reader) ✓ + penghapusan saat catatan dikosongkan di kanvas.
- Kutipan hari ini (saveQuote → catatan tersemat folder bacaan) ✓ muncul sebagai catatan biasa.
- Date: memakai field `date` display-string yang ada ('Hari ini', '15 Jun'); edit TIDAK mengubah tanggal (pertahankan tanggal asli — tidak ada createdAt di model).
- Mood: model Note TIDAK punya field mood → diimplementasikan sebagai metadata sampingan per catatan di journal-ui (dipersist), opsi dari MOODS store, tampil sebagai titik warna di daftar/reader. Mood harian global Statistik TIDAK disentuh.
- Dihapus (dengan alasan): parallax header besar (diganti header seksi tenang per arah "tanpa elemen dasbor"), masonry 3-warna NOTE_TONES (field tone tetap tersimpan & dihitung saat membuat; visual seragam lebih tenang — tone bukan fitur fungsional), tombol bulat "+" (diganti tombol "Tulis catatan" yang lebih jelas).

## Lint & tipe

`bunx eslint` pada 5 file → LOLOS tanpa error/warning. `tsc --noEmit` → tidak ada error pada 5 file (satu error pre-existing di sync-engine.ts milik agen lain, tidak tersentuh). dev.log: kompilasi bersih, GET / 200 (entri EADDRINUSE = percobaan start server ganda oleh sistem, bukan kode).

## Catatan untuk agen lain

- Jangan pindahkan mount `<JournalCanvas />` dari compose-sheet.tsx tanpa mempertimbangkan posisi cangkang.
- Untuk menulis catatan dari luar jurnal: `useJournalUi.getState().openCanvas(note?)`.
- `performSave` idempoten — aman dipanggil ganda (flush tombol + unmount).
