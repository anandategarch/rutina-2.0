# STAGE-2 — Daily Mission Trail + Balance Pulse landmarks + 2 bug konsistensi

Agent: STAGE-2. Status: DONE — `bun run typecheck` exit 0, `bun run lint` exit 0, dev.log bersih (GET / 200, tanpa error), verifikasi runtime via browser (trail render, centang → perayaan emas + sparkle, undo balik, landmark sparkline tampil dengan label).

## A. Mission Trail ("Jalur Misi") — Beranda

- BARU `src/components/rutina-mobile/mission-trail.tsx` (203 baris, 'use client', presentasional, token-only).
  - Props: `missions: { id, title, done }[]` (URUTAN PANGGIL: selesai dulu, lalu tertunda sesuai urutan agenda — pemanggil TIDAK sortir ulang), `upcomingOnly?` (tanggal masa depan → tanpa cincin aktif), `className?`.
  - Checkpoint: selesai = dot penuh bg-primary + glif Check (px-espresso saat perayaan); AKTIF = dot pertama belum-selesai, cincin border-primary + halo shadow module-accent-soft, STATIS (tanpa pulse); akan datang = lingkar dashed border-border-strong. Semua selesai → perayaan: dot & jalur bg-gold + Sparkles text-warning di samping chip "x/y" (keluarga token gold/warning).
  - Jalur penghubung: dasar dashed selalu tampak; lapisan padat (bg-primary/bg-gold) menumbuh via barFill HANYA menuju checkpoint yang benar-benar selesai (kedua ujung selesai) — jujur.
  - >14 misi dilipat proporsional ke 14 checkpoint (pola MissionSteps); ukuran dot adaptif 16/14/12px agar muat 320px; total tinggi strip ≈ 40-46px.
  - Umpan balik: dot yang baru selesai MEMASANG ulang (key `${id}-${state}`) + initial pop spring.playful; deteksi "baru selesai" via `useState(() => ({ filled, complete }))` initializer (mount-time snapshot — bukan ref; react-hooks/refs melarang baca ref saat render). Mount ulang/kunjungan ulang tampil instan (anti-replay); rakitan pertama via useFirstVisit('home-mission-trail') stagger stagger.tight. Pop Motion ini TERPISAH dari pop anime.js MissionSteps (hero, tak disentuh).
  - A11y: rel = `role="img"` aria-label ringkasan; baris `sr-only aria-live="polite"` (saudara, di luar role=img) mengumumkan perubahan. Format: `Jalur misi: X dari Y misi selesai, berikutnya: <nama>` / lengkap: `Jalur misi: semua Y misi selesai`. Kepala strip (label "Jalur Misi" + chip x/y) aria-hidden. Checkpoint BUKAN tombol (interaksi tetap di TaskRow). Hari kosong → komponen null (state kosong agenda utuh).
- `screens/home.tsx`:
  - Import line 40. Derivasi `trailMissions` lines 602-618: `[...doneHabits (urutan seksi Selesai), ...attention.items (urutan prioritas homeAttention — SATU sumber urutan agenda)]`.
  - Render lines 1112-1126: DI DALAM cabang non-kosong paper-surface agenda, DI ATAS pagar compact/rel waktu → tampil di mode ringkas DAN expanded; `key={selectedDate}` (ubah tanggal = pasang ulang instan, tanpa pop replay); `upcomingOnly={selectedDate > today}`.

## B. Balance Pulse — landmark transaksi (keuangan.tsx)

- Interface `SaldoSparkMark` lines 1365-1378 + prop spark diperluas `marks` (lines 1398-1400).
- Memo `saldoSpark` (lines 2562-2604): setelah deret utuh (tak diubah), marks = 3 transaksi TERBESAR non-transfer pada jendela identik gerak deret ([today−30, today], filter sama dengan netByDay), urut nominal, tiap mark: `{ id, i: 31−daysAgo (indeks titik deret), dir, amount, catLabel (catMeta), dateLabel (fmtDate) }`. Deret datar → null → tanpa landmark.
- SaldoCard:
  - Geometri `markGeom`/`topGeom` lines 1418-1436 (rumus x/y identik polyline).
  - Render lines 1525-1674: hi/lo kolom DALAM tetap h-10 (perataan puncak/lembah utuh) + label jendela "30 hari" di bawah nilai lo; svg dibungkus `relative h-10 flex-1`; landmark = circle r=3 (masuk fill var(--hero-accent) emas, keluar var(--palette-clay), cincin stroke var(--hero-surface)) + `<title>` tooltip "Pemasukan/Pengeluaran <kategori> <nominal> · <tanggal>"; label terlihat HANYA untuk terbesar = chip espresso `↓ Rp500 rb` (glif arah + formatIDRShort, pointer-events-none, kiri di-clamp 12-88%, atas/bawah dot sesuai posisi y). aria-label role=img diperluas: "… Transaksi terbesar: <kategori> <pemasukan/pengeluaran> <nominal> pada <tanggal>". NON-INTERAKTIF (kartu Vault sendiri role=button "tambah transaksi" — target ketuk ganda dihindari; drill tx tidak trivial). Delta row, gradient, hi/lo, caption "perkembangan 30 hari terakhir", null-when-flat: utuh.

## C. Dua perbaikan bug

1. home.tsx hero (lines 861-906): teks "X dari Y misi" + MissionSteps `total` kini `scheduledToday` (= dcToday.due, sadur-jadwal) — penyebut sama dengan persen; sub-baris kondisi ikut `scheduledToday`, + cabang baru "Hari jeda — tidak ada misi jatuh tempo." (todayHabits>0 tapi due=0 = semua hari-jeda). Dulu `todayHabits.length` (mentah habitsOn) bisa menulis "3 dari 5 misi" di samping "100%".
2. profile.tsx line 951: bar rasio pengingat `reminderCount / habits.length` → `/ activeHabitCount` (sesuai teks "N dari M kebiasaan"; habits.length masih menghitung arsip).

## Validasi

- `bun run typecheck` PASS · `bun run lint` PASS (satu iterasi: deteksi pop awal pakai ref ditolak react-hooks/refs → diganti snapshot useState initializer).
- Browser: GET / 200; a11y tree memastikan ringkasan trail + landmark aria terbaca; screenshot VLM konfirmasi visual (cincin aktif, dot emas + check + sparkle + jalur padat saat lengkap; chip "↓ Rp500 jt" + label "30 hari" di Vault).
- Catatan: state demo sebelumnya tanpa kebiasaan — ditambah 2 kebiasaan uji via UI ("Minum air putih" Sen-Jum via pemilihan manual, "Membaca 10 menit" setiap hari) agar fitur bisa dipratinjau.
