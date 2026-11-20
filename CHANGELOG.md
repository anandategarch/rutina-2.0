# Changelog — Rutina 2.0

Semua perubahan penting per versi. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/);
versi mengikuti gelombang pengembangan internal (bukan semver).
Sejak v2.35, `version` di package.json mengikuti nomor gelombang internal
(2.35.0) agar tidak ada lagi tiga penomoran yang berbeda.

## [2.35] — Final Design Engineering Polish: Motion Governance, Anti-Replay & Premium CSS

Gelombang penyelesaian (finishing) setelah redesain v2.27–v2.34 disetujui
arahnya. TIDAK ada layar yang didesain ulang, TIDAK ada dependensi baru —
tujuh ruang kerja dipertahankan, yang dipoles adalah kematangan motion,
konsistensi CSS, presisi interaksi, dan pembuktian mutu.

| Prioritas | Rincian |
|---|---|
| **Motion governance penuh** | Semua literal duration/easing/spring/delay di 7 layar + modul bersama masuk token semantik: preset `pageEntrance`/`panelReveal`/`cardReveal`/`chipReveal`/`gardenMilestone`/`screenSwap`/`activityPulse`, spring `progressArc`/`rowEnter`/`letter`, skala delay absolut `tight→sweep`. Audit grep pasca-migrasi: **nol** literal tersisa di rentang 0.2–0.5 dtk. Karakter tiap ruang TETAP berbeda — yang disatukan sumber angkanya, bukan rasanya. |
| **first-visit jadi hook** | `firstVisit()` lama memutasi Set module-scope SAAT render — kini `useFirstVisit(key)`: pembacaan di initializer useState, penandaan lewat useEffect pasca-commit (render murni, StrictMode aman, terdokumentasi). |
| **Anti-replay 7 ruang** | Kebijakan seragam: animasi pembuka hanya kunjungan pertama seumur sesi. Gerbang baru di Jurnal (header/CTA/daftar catatan), Kebiasaan, Bugar, Statistik (cincin XP `initial=target` — batang tidak "penuh-lalu-mengecil"), Profil, Keuangan (GoalCard/BudgetRow). Baris ledger & inspector tetap dianimasikan (item dinamis/interaksi data). Terverifikasi browser: opacity elemen = 1 tepat setelah remount. |
| **Audit dua-engine: nol pelanggaran** | Motion.dev (state UI) vs anime.js (orkestrasi momen) — seluruh 12 titik `useAnimePop`, heatmap, batang grafik, piring barbel, saldo ka-ching, splash, perayaan sesi diverifikasi tidak pernah menganimasi properti transform yang sama pada elemen yang sama; 33 addEventListener = 33 removeEventListener; kontrak dua-engine didokumentasikan permanen di `anime-kit.ts`. |
| **Premium CSS** | Token komposisi `--layout-content-max` 45rem (720px) — diukur dari konsumen nyata (layar Jurnal + kanvas menulis; kanvas dipasang di level cangkang sehingga dideklarasikan di `:root`). Token inspector/rasio/hero-height sengaja TIDAK dibuat (split 12-kolom bento sudah mengungkapkannya). Radius literal → token (`rounded-xl`/`rounded-2xl`/`rounded-sheet`); type floor `text-[9px]` → `text-chart-label`. |
| **Interaksi presisi** | Skala tekan centang kebiasaan 0.85/0.88 → **0.92** (aksi tersering di produk; saran audit 0.92–0.96, selaras konvensi token 0.90–0.92 kontrol kecil). Audit a11y: fondasi sudah benar (dialog semantics, focus trap, focus-visible, aria lengkap, disabled states, reduced-motion tiga lapis). |
| **Pembuktian mutu (dijalankan, bukan diklaim)** | `bun run verify` hijau: typecheck + lint + **133 test lulus, 0 gagal**. Browser E2E: **42/42 kombinasi** lebar (320/390/768/1024/1280/1440) × 7 layar tanpa overflow horizontal; CRUD kebiasaan utuh (buat → detail → sunting/arsip/**hapus permanen** → hilang); autosave Jurnal ("Tersimpan" muncul, catatan masuk daftar, hapus bersih); **nol error halaman & konsol bersih**. |

## [2.34] — Motion & Responsif Final (STEP 06)
Governance shell & responsif: transisi antar-layar diringankan, 42 kombinasi
lebar×layar diuji tanpa overflow. Detail: git log `f90212f`.

## [2.33] — Writing Room & Control Room (STEP 05)
Jurnal: kanvas 720px fokus, metadata merunduk saat menulis, tipografi
editorial. Profil: split settings desktop (navigasi kategori kiri,
pengaturan kanan), hero identitas ringkas. Detail: git log `30966ff`.

## [2.32] — Statistik: The Observatory (STEP 04b)
Hierarki KPI (satu angka dominan + baris sekunder), struktur grafik,
insight lintas domain; data entry dipisahkan dari analisis.
Detail: git log `415547b`.

## [2.31] — Kebiasaan: The Garden (STEP 04a)
Tiga ruang jelas — Agenda / Konsistensi / Perpustakaan — dengan navigasi
sticky dan bahasa permukaan organik (garden-surface/bed). Detail: git log `cbdfd73`.

## [2.30] — Bugar: Performance Studio (STEP 03b)
Hero performa, coach, timeline riwayat, grafik interaktif; subtab
keep-alive agar entrance tidak diulang. Detail: git log `2d6de7d`.

## [2.29] — Keuangan: The Vault (STEP 03a)
Split workspace 4:8 (saldo kiri, ledger tengah), baris buku kas hairline,
panel saldo & inspector — workspace finansial otentik. Detail: git log `00d14ae`.

## [2.28] — Beranda: The Daybook (STEP 02)
Sorotan diturunkan jadi info sekunder, insight flat editorial, hero
diringkas, band bawah berpermukaan beda sesuai isi. Detail: git log `b01ccf5`.

## [2.27] — Fondasi Layout Grammar Tujuh Ruang (STEP 01)
`data-layout` tujuh ruang kerja: token gap/hero-radius/density/grid-gap
per ruang + permukaan khas (paper/garden/ledger/timeline).
Detail: git log `2e680d3`.

## [2.26] — Audit CRUD Menyeluruh · Opsi Hapus Kini Terjangkau di Mana-mana

Audit menyeluruh atas operasi kelola data (buat/sunting/hapus) di seluruh
modul, dipicu keluhan "tidak ada opsi hapus kebiasaan" — akar masalahnya
bukan hilangnya aksi, melainkan REACHABILITY (aksi terkubur) dan CEKUNGAN
CRUD (entitas tanpa hapus/sunting sama sekali).

### KRITIS — layar Statistik & Profil tidak bisa dimuat
- **Impor dinamis rusak** (v2.25): `import('./screens/statistik')` dan
  `import('./screens/profil')` menunjuk berkas yang tidak ada (nama
  sebenarnya `stats.tsx` / `profile.tsx`) — kedua layar gagal termuat
  (module-not-found) saat dibuka. Diperbaiki + diverifikasi browser E2E.

### Tujuan Tabungan — CRUD lengkap (dulu: sekali buat, selamanya menempel)
- **Sunting tujuan** (baru): nama & target bisa diubah kapan pun lewat
  dialog sunting — tabungan terkumpul tetap utuh.
- **Hapus tujuan** (baru): konfirmasi AlertDialog, termasuk riwayat
  setorannya; tujuan TERCAPAI kini akhirnya bisa dilepas (dulu buntu
  total — badge "Tercapai" tanpa jalan keluar).
- **Tombol kelola (kebab)** di sudut kartu tujuan membuka sheet tujuan
  yang sama dengan "Setor" — satu tempat kelola untuk semua keadaan.
- Store: `updateGoal`, `deleteGoal`, `openGoalEdit`/`closeGoalEdit`,
  `goalEditId` — otomatis ikut persist lokal + sinkronisasi domain.

### Kebiasaan — aksi kelola turun ke Panel Detail
- **Arsipkan + Hapus permanen kini ada LANGSUNG di Panel Detail** (inline
  ponsel & kolom kanan desktop) — sebelumnya terkubur di dasar sheet
  sunting yang harus digulir penuh (akar keluhan "tidak ada opsi hapus").
- Konfirmasi AlertDialog + saran "pertimbangkan arsip" pada teks hapus.

### Kelompok kebiasaan — ganti nama & warna (baru)
- Chip "Kelola" di sheet kebiasaan kini bisa diklik untuk mengisi baris
  buat dengan data kelompok (mode sunting: tombol Buat → Simpan, tautan
  batal tersedia). Store: `renameHabitGroup` dengan validasi duplikat.

### Audit CRUD modul lain (verifikasi — sudah lengkap, tanpa perubahan)
- Catatan jurnal: sunting + hapus + sematkan ✓ · Transaksi: sunting +
  hapus ✓ · Dompet: sunting + hapus ✓ · Kategori: hapus ✓ · Aktivitas
  bugar: hapus (dengan ringkasan set) ✓ · Asupan makanan: hapus ✓

### Verifikasi
- `tsc --noEmit` + ESLint bersih; keenam layar 0 error halaman/console.
- E2E browser (desktop 1440px + ponsel 390px): buat→sunting→hapus
  tujuan; buat→arsip→pulihkan→hapus kebiasaan; buat→ganti nama→hapus
  kelompok; kedua layar yang dulu rusak termuat sempurna.

## [2.25] — Tahap 3+4 · Motion Terarah & Performa

### Tahap 3 — Motion design
- **Transisi layar distandarkan**: 72px/0,32dtk → **24px/0,24dtk** —
  perpindahan antarmodul adalah aktivitas sering; transisi kini menjadi
  isyarat arah yang cepat, bukan perayaan yang menghambat.
- Lima micro-interaksi inti audit diverifikasi terpasang: checklist
  (pressSnappy + tint matcha + XP pop), progress ring (spring + pop
  100% via anime.js), bottom sheet (sheetSpring), grafik reveal sekali
  viewport, milestone taman (usePlantGrowth per tanaman).

### Tahap 4 — Performa & kualitas
- **Code splitting**: hanya Beranda statis di chunk utama; enam layar
  lain dimuat malas via next/dynamic + **skeleton Rutina** (rutina-
  skeleton: kepala + hero + bento). Recharts & ribuan baris layar berat
  (Keuangan ±3,1rb, Statistik ±2,1rb) keluar dari bundel awal.
- **Prefetch idle**: keenam layar dihangatkan di latar belakang ±1,5
  dtk setelah app siap — navigasi pertama tetap instan.
- Audit a11y & reduced-motion: MotionConfig reducedMotion="user" +
  LazyMotion strict; anime-kit menghormati prefers-reduced-motion;
  focus-visible hadir di 20+ komponen; pintasan keyboard 1-6 desktop.

## [2.24] — Tahap 2 · Pemolesan Layar: 7 Modul dalam Warm Editorial Productivity

Eksekusi audit Tahap 2 — tiap layar dipoles menurut karakter fungsinya,
tanpa library baru, seluruhnya token desain 2.0.

### Beranda — personal dashboard
- **Hero progres**: kalimat editorial "Satu langkah lagi menuju hari
  sempurna." saat tersisa 1 misi (hierarki: cincin % → X dari Y → dukungan).
- **Baris agenda** (TaskRow): pil "07.00 · Kategori" (jam pengingat +
  kategori SATU pil, informasi paling operasional), streak kompak terpisah,
  **mini-history 7 hari** (titik-titik, sm+), XP & chevron tetap.
- **Sorotan Hari Ini dua tingkat**: normal = kartu hairline tenang;
  mendesak = tepi bertint modul 35% + suar bernapas (selaras glow ikon).
- **Rekap Pekan interaktif**: setiap hari pada strip kecambah kini
  DAPAT DITEKAN — panel ringkas (tanggal, X misi, status target,
  sesi latihan, arus kas ±) + tombol membuka DayDetailSheet penuh.

### Keuangan — vault & ledger
- Verifikasi menyeluruh struktur audit (sudah paten): hero Rutina Vault,
  Jatah Hari Ini, Arus Kas + Masuk/Keluar/Net, ledger profesional
  (ikon·nama·dompet·nominal kanan tabular-nums ±), anggaran 3-warna
  (matcha <80% · gold ≥80% · terracotta lewat) + sisa, Spotlight hanya
  di Tujuan, ShineBorder hanya di hero.
- **Tujuan hampir tercapai**: cincin progres bernapas lembut (≥80%)
  + label "hampir tiba" — rayuan halus menuntaskan sisa langkah.

### Bugar — performance studio
- Hero mingguan SATU komposisi (menit aktif utama + km/jam/sesi pendukung);
  SATU CTA dominan "Mulai Sesi" + shortcut chip ringkas; grafik tonase
  hari-dapat-ditekan dengan detail + "vs hari sama lalu"; riwayat
  timeline hairline; Coach maks 2 saran; counter hanya di metrik utama.

### Kebiasaan — tiga ruang berbeda
- **Agenda hari ini** (header "X dari Y selesai" + progress + kelompok
  Pagi/Siang/Malam) · **Konsistensi** (streak + taman dalam garden
  surface) · **Perpustakaan** (inventaris per kategori, ledger-row,
  mini-history 7 hari) — tiga komposisi berbeda, bukan kartu seragam.

### Jurnal — writing app premium
- Kolom editor 640–720px di desktop; latar parchment tenang; Playfair
  untuk judul, Geist untuk toolbar; leading-relaxed isi.
- **Indikator autosave 3 keadaan**: "Menyimpan…" (debounce) → "Tersimpan"
  → "Offline — tersimpan di perangkat" (navigator.onLine) — kecil,
  tenang, selalu terlihat.

### Statistik — data observatory
- **FIX KRITIS KPI terpotong**: akar masalah breakpoint grid 12-kolom
  RutinaBentoGrid di kontainer lebar → semua grid custom kini menimpa
  seluruh breakpoint; label KPI terbaca penuh di 320/390/1500px.
- Hierarki: KPI → Fokus Periode → Tren → Kalender → Laporan → Wawasan
  (donut + mood) → Pekan vs Pekan → Bugar & Tubuh → Piala.
- Tooltip Recharts token earth-tone; batang grafik jadi tombol dengan
  readout aria; sumbu X tanggal nyata; legenda + label periode selalu
  terlihat; animasi grafik hanya saat pertama masuk viewport; empty
  state menjelaskan data yang perlu dikumpulkan.

### Profil — grouped settings tenang
- Identitas → Riwayat Mood → Preferensi → Data & Penyimpanan →
  **Zona Kritis** (operasi destruktif dipisah) → Aplikasi & Bantuan.
  Pola baris standar: ikon · label · keterangan · kontrol kanan.

### Ketahanan infrastruktur sandbox (post-mortem insiden 19 Nov)
- Mount platform `upload/` (ossfs) mati → readdir menggantung → git
  status & worker postcss beku >3 jam. Perbaikan: (1) file upload warisan
  di-untrack dari index git; (2) `postcss.config.mjs` kini membatasi
  basis pemindaian Tailwind ke `src/` sehingga pipeline CSS tak pernah
  menyentuh direktori mount; (3) dev server sandbox dijalankan dari
  clone hardlink `/tmp/projcopy` (file identik via inode) karena mount
  mati tak dapat dilepas tanpa akses root.

## [2.23] — Tahap 1 · Fondasi Visual: Shell Desktop Profesional

Permintaan pengguna: eksekusi audit desain frontend 4 tahap (Warm Editorial
Productivity — calmer, premium, data-rich). Tahap 1 memoles fondasi tanpa
menambah library baru.

### Shell desktop (prioritas tertinggi audit)
- **Rail konteks kolapsibel**: 1280–1439px tampil sebagai strip ringkas 56px
  (tombol buka + tiga titik aksen domain); ≥1440px tiga kolom penuh. Toggle
  tersimpan di localStorage (`rutina-2.0-rail-collapsed`); pra-mount selalu
  render strip agar hidrasi SSR bebas mismatch.
- **Konten rail per halaman** (sebelumnya jurnal/profil jatuh ke set umum):
  Statistik → Insight · Pencapaian (Level/XP/streak terbaik) · Fokus;
  Profil → Sinkronisasi · Penyimpanan (inventaris data nyata) · Preferensi
  (target harian, mood, streak). Beranda/Bugar/Keuangan/Kebiasaan tetap.
- **Jurnal tanpa rail** — ruang menulis tenang, panel kanan disembunyikan
  total saat layar Jurnal aktif.
- Header rail "PANEL KONTEKS" + tombol ringkas — terasa seperti panel
  program desktop, bukan kolom statis.

### Status sinkronisasi dinamis (mengganti teks statis "Tersinkron cloud")
- Empat keadaan + boot: **Tersinkron** (jam sinkron terakhir "pukul HH.MM"),
  **Menyinkronkan** (perubahan sedang dikirim), **Offline** (tersimpan di
  perangkat), **Gagal** (+ tombol "Coba lagi").
- `syncStatusStore` (zustand vanilla, bukan slice domain — tak ikut
  ter-persist/ter-push) dibaca lewat `useSyncStatus()`; transisi mengalir
  dari push/boot/forcePull; listener `online`/`offline` otomatis mendorong
  ulang perubahan tertunda saat koneksi kembali.
- Kartu status dipakai di dua tempat: sidebar desktop (varian ringkas) &
  rail Profil (varian kartu) — `sync-status-card.tsx`.

### Konsistensi state & governance CSS
- Utility `interactive` baru di globals.css: transisi 160ms, umpan balik
  tekan scale(0.98), focus-visible ring 2px, disabled redup — kontrak
  minimal seluruh elemen interaktif (RutinaButton sudah selaras).

### Pemulihan data
- Snapshot sandbox tertimpa data uji sesi verifikasi lama → dipulihkan
  via `pull-production` (18 kebiasaan · 281 transaksi · 4 dompet · 3 tujuan)
  + transaksi uji warisan dibersihkan.

## [2.22] — Gelombang Paritas Rutina 1.0: P0 + Kilat + P1

Permintaan pengguna: adaptasi fitur Rutina 1.0 yang belum ada di 2.0
(hanya fiturnya — desain tetap earth-tone 2.0: motion.dev, anime.js,
shadcn/ui) — hasil analisa gap 21 fitur + riset aplikasi relevan.

### P0 — Fondasi fungsional (5 fitur kritis)
- **Sunting transaksi**: lembar transaksi kini punya MODE SUNTING
  (`txEditId`) — terbuka terisi nilai lama (arus, kategori, nominal,
  catatan, dompet, jadwal berulang); tombol "Sunting" di detail baris
  mutasi (transfer dikecualikan — butuh dua sisi dompet); salinan
  otomatis berulang menjelaskan ikut-templatnya.
- **Kebiasaan terukur** (target & satuan/hari, mis. "8 gelas"):
  completions kini bernilai `true | angka` — angka = progres parsial,
  mencapai target otomatis menjadi `true` sehingga streak & statistik
  lama tak berubah semantik; stepper ± + bar progres + persen di baris
  agenda ( klik cepat akurat — dibaca dari state segar); lembar
  kebiasaan mendapat saklar "Kebiasaan terukur" + stepper target +
  chip satuan (gelas/halaman/menit/langkah/kali) + satuan bebas.
- **Kelola dompet**: sunting nama & saldo awal (dialog mode sunting);
  hapus dengan konfirmasi informatif — transaksi terkait jadi "tanpa
  dompet" (tidak ada catatan hilang); kartu dompet baru: arus
  masuk/keluar bulan ini + bar proporsi + net + ketuk untuk drill.
- **Kelola kategori**: lembar "Kelola Kategori" (dari pemilih kategori
  & tab Anggaran) — ganti nama kategori bawaan menular ke seluruh
  tampilan via `catRenames` (data transaksi tak tersentuh), sembunyi-
  kan dari pemilih (`hiddenCats`), hapus kategori buatan (transaksinya
  pindah ke "Lainnya"); jumlah transaksi + total nominal nyata per
  kategori ditampilkan sebagai dasar keputusan.
- **Jatah harian + proyeksi + pace**: kartu "Jatah Hari Ini" (Keuangan
  › Ringkasan) — jatah aman per hari (count-up), vonis proyeksi akhir
  bulan (aman/waspada/lewat), bar laju belanja dengan PENANDA POSISI
  IDEAL hari ini, tiga statistik (sisa/rata²/proyeksi); ringkas
  "Jatah hari ini ±Rp X" di kartu Arus Kas Beranda.

### Kilat — nilai besar, effort kecil
- **Kartu Langgananmu**: agregasi templat transaksi berulang — daftar
  langganan aktif + setara biaya per bulan (mingguan ×52/12) +
  "terakhir tercatat" + total/bulan + saran berhenti langganan.
- **Ekspor & cadangan** (Profil): unduh cadangan JSON penuh (bentuk
  identik snapshot /api/state), unduh transaksi CSV (BOM UTF-8, label
  kategori sadar rename), pulihkan cadangan JSON (validasi bentuk,
  terapkan + push otomatis); "Mulai dari awal" dipindah ke seksi
  Zona Bahaya tersendiri.

### P1 — Kedalaman modul
- **Kelompok kebiasaan custom**: buat kelompok bernama + warna chip
  earth-tone (6 pilihan) langsung dari lembar kebiasaan; layar
  Kebiasaan otomatis beralih mengelompokkan per kelompok (sisanya
  "Tanpa kelompok") saat ada yang memakainya; kelola/hapus kelompok
  inline.
- **Pohon Kebun** (reinkarnasi pohon konsistensi 1.0): SATU pohon
  line-art 2.0 di Beranda yang tumbuh dari hari aktif seluruh kebun
  (ambang 1/7/30/90 — Benih→Berbunga), sway idle halus, koreografi
  pertumbuhan anime.js + toast saat naik tahap, bar progres antar
  tahap; hormat reduced-motion.
- **Sasaran bugar lengkap** (8 target): kartu "Sasaran Musim" di tab
  Tubuh (menit/pekan, sesi/pekan, gelas air/hari, protein/karbo/lemak
  g/hari, berat tujuan, tinggi badan) + kembalikan bawaan; bar
  menit/sesi vs sasaran di hero Latihan; target makro "x / y g" di
  tab Asupan; BMI + delta vs berat tujuan di kartu Berat; target air
  hidrasi ikut sasaran.
- **Donat komposisi interaktif**: pengeluaran bulan ini per kategori
  (Recharts, top-6 + "Lainnya") — hover irisan mengganti pusat
  (kategori & nominal), klik irisan/legenda membuka drill kategori.
- **Drill-down universal**: lembar bedah KATEGORI (dari donut) &
  DOMPET (dari kartu dompet) — statistik bulan berjalan, bar
  pemakaian anggaran / proporsi arus, daftar transaksi terkait (maks
  30) + ringkasan sepanjang masa.
- **Lencana 4 → 8**: + Hari Terpadat (5+ misi sehari), Trio 30 (tiga
  kebiasaan 30+ penyelesaian), Penjaga Andalan (juara 30+), Pelari
  10× (10 sesi kardio) — progres terkunci tampil di deskripsi.

### Fondasi data & sinkronisasi
- Prisma: `Habit.target/unit/groupId`, `HabitLog.value`, tabel
  `HabitGroup` baru; db-migrate DDL idempoten (ALTER + CREATE IF NOT
  EXISTS) menyembuhkan drift otomatis.
- Wire & server: `habitGroups`, `catRenames`, `hiddenCats`,
  `fitTargets` (Zod + GET/PUT /api/state + AppSetting JSON);
  completions union `boolean | number` (log `value` REAL).
- Store: `updateTx/openTxEdit`, `updateWallet/deleteWallet/
  openWalletEdit`, `renameCat/hideCat/unhideCat/deleteCustomCat`,
  `setHabitValue`, `addHabitGroup/deleteHabitGroup`, `setFitTargets`,
  `openFinDrill/closeFinDrill` — semua ikut DOMAIN_KEYS sinkronisasi
  & persist lokal (migrasi aman untuk data lama).
- `doneCountOn` kini hanya menghitung `true` (progres parsial belum
  selesai) — streak/heatmap/takaran hari tak berubah perilaku.
- Tes punch-card mati (sisa v2.20) dibersihkan — suite hijau penuh
  133 tes.

## [2.21] — Audit Menyeluruh "Bug Terpotong" UI/UX

Permintaan pengguna: "cari bug terpotong ui UX menyeluruh" — detektor
overflow terprogram (scrollWidth/clientHeight × bounding rect) dijalankan
di browser pada **390px, 320px, dan 1280px**, menyisir seluruh 7 layar +
tab + 12 lembar (picker, form, detail hari) dalam dua kondisi: keadaan
kosong dan data uji string-panjang (nama dompet/kategori/makanan/kebiasaan
ekstrem), divalidasi visual per-screenshot dengan VLM.

### Bug terpotong yang diperbaiki (16 lokasi, 15 file)
- **Sapaan Beranda terpotong 19px di atas layar saat dimuat** (paling
  sering dilihat pengguna): `scrollIntoView(block:'nearest')` pada chip
  "hari ini" strip kalender ikut menggeser gulir VERTIKAL halaman ±84px
  karena chip berada dekat tepi bawah liang pandang — kini pemusatan
  horizontal murni via `scrollTo` pada stripnya sendiri; pola sama di
  deretan chip sesi workout diperbaiki (chip aktif tak lagi membuat
  layar sesi "melompat").
- **Riwayat Transfer (Dompet)**: baris "Dompet A → Dompet B · tanggal"
  terpotong hingga 260px di 320px — dompet TUJUAN seluruhnya tak
  terlihat. Kini nama kedua dompet selalu utuh (wrap penuh), tanggal
  pindah ke baris kecil tersendiri.
- **Kartu dompet**: nama dompet panjang (`truncate`) kini wrap 2 baris.
- **Jurnal makan (Asupan)**: nama makanan terpotong hingga 257px ("Nasi
  goreng spesial dengan telur mata sapi da…") — kini 2 baris; kalibrasi
  diverifikasi terhadap 179 nama master terpanjang (54 karakter, muat).
- **KPI Statistik**: caption tile (`truncate`) memotong "Belum ada
  jadwal kebiasaan", judul kebiasaan terbaik, "dalam 30 hari terakhir"
  — kini 2 baris.
- **Kartu Jurnal Beranda**: subtitle "3 catatan di 4 folder" terpotong
  48px di antara dua tombol — kini wrap 2 baris.
- **Chip "Sering dipakai"** (picker dompet): terpotong KERAS tanpa
  elipsis ("…Keluarla") karena span tanpa `min-w-0` — elipsis kini
  bekerja; chip picker kategori (tanpa proteksi apa pun) mendapat
  `min-w-0 truncate` + `max-w-full`.
- **Baris daftar picker** (dompet & kategori): `truncate` satu baris →
  2 baris pada baris pilihan lengkap.
- **Pemilih di form transaksi/transfer**: baris kategori & dompet
  terpilih (`h-12` + `truncate`) → `min-h-12` + wrap 2 baris.
- **Lembar Detail Hari (Statistik)**: judul kebiasaan (terpotong 240px),
  judul catatan, dan catatan transaksi (164px) → wrap 2 baris.
- **Pemicu "Susun Kebiasaan"**: judul kebiasaan di ringkasan & daftar
  kandidat (terpotong 206px) → wrap 2 baris.
- **Rail konteks desktop**: judul kebiasaan "Berikutnya" (terpotong
  128px di 1280px) → wrap 2 baris.
- **Kartu tanaman Kebiasaan**: judul `line-clamp-2` → `line-clamp-3`
  (kartu sekilas 156px).
- **Baris kebiasaan (TaskRow)**: judul kini TANPA clamp saat baris
  dikembangkan — judul penuh selalu terlihat saat detail terbuka.
- **Chip gerakan** (sesi barbel & picker): batas keras `max-w-[140px]` →
  `200px` — nama gerakan panjang ("Dorong barbel terlentang") tak lagi
  terpotong.

### Metode
Deteksi programatik (bukan hanya review statis): elemen dengan
`scrollWidth > clientWidth` + `truncate/line-clamp` aktif, konten
terpotong tanpa sinyal visual, dan elemen melewati tepi viewport —
dijalankan setelah pemicuan seluruh section `whileInView`; temuan
divalidasi visual (VLM) per screenshot; data uji panjang disuntik ke
localStorage dengan sinkronisasi server di-blok (dataset produksi
sandbox tetap kosong, dibersihkan penuh pasca-audit).

## [2.20] — Deep Review Frontend: motion.dev, anime.js & shadcn/ui (4 Agent Audit + 6 Agent Perbaikan)

Permintaan pengguna: "full deep review front end, motion.dev anime.js.
dan shandc ui dan lainnya lagi yang banyak" — empat agent audit paralel
(motion.dev · anime.js v4 · shadcn/ui konsistensi · polish visual)
menyisir ±70 file, lalu enam agent perbaikan mengeksekusi temuannya.

### Bug nyata yang diperbaiki
- **Exit animasi transaksi mati** (Keuangan): daftar TxRow tidak
  dibungkus `AnimatePresence` sehingga transaksi yang dihapus menghilang
  seketika — kini `mode="popLayout"` di kedua daftar (Ringkasan & Mutasi).
- **Sumbu grid stagger heatmap terbalik**: `grid: [7,12]` → `[12,7]`
  (grid[0] = item per baris) — gelombang sel kini radial dari kiri-atas,
  bukan diagonal acak (terverifikasi empiris terhadap engine anime.js).
- **Kebocoran animasi statistik**: `animate()` tanpa cleanup terus
  berjalan ±1,2 dtk pasca-unmount — kini `anim.cancel()` (bukan revert,
  agar batang tidak menghilang).
- **Kelas CSS tidak valid** `outline-offset--2` (dobel tanda minus) di
  stepper set workout — focus ring tak pernah diterapkan.
- **13 permukaan `bg-cocoa` di Statistik/Heatmap** — token primitive
  yang tidak di-inversi dark mode (teks nyaris tak terbaca saat gelap);
  seluruhnya dimigrasi ke keluarga hero token (dark-safe).
- **Judul ganda "Profil." → "Profil"** di layar Profil dihapus.
- **`theme_color` manifest** (#749B58) ≠ meta viewport (#F5F3EE) —
  diseragamkan ke sand.

### Spesifikasi "satu pola picker" akhirnya ditegakkan
- **GerakanPickerSheet** (baru): pencarian nama/otot + bagian "Terakhir
  dilatih" dari histori nyata + daftar terkelompok per otot — mengganti
  **3 `<select>` native** (form catat, panel dalam sesi, susun sesi).
- **WalletPickerSheet** (baru): pola cat-picker penuh — cari + "Sering
  dipakai" berbasis frekuensi transaksi nyata (Kas 140×, CIMB 90×…) +
  daftar saldo + tambah dompet inline — mengganti **2 `<select>` native**
  di transfer dan chip scroll di form transaksi.
- **Pemicu "Susun Kebiasaan"** dirampingkan: chip-wall tanpa batas →
  satu baris pemicu + panel terkurasi (cari + listbox max-h-64).
- Empty state Bugar (riwayat/PR/pustaka) yang dibuat tangan →
  `RutinaEmptyState` + tombol aksi.

### motion.dev (motion v14) — governance dijalankan
- 9 preset mati di `transitions.ts` kini dipakai nyata: 12 sheet →
  `sheetSpring`/`fade`, kanvas → `canvasFade`, perayaan → `celebrate`;
  token baru `spring.bar` (konsolidasi 4 varian bebas di 16 titik),
  `spring.chart`, `spring.navPop`, `easing.confettiFall`,
  `duration.ambient`; 14 literal easing → token.
- **RutinaTabs pil meluncur**: varian segment kini memakai `layoutId`
  (context + useId per instance) — indikator aktif meluncur antar tab
  di Keuangan, Bugar, dan Statistik (menggantikan Tabs shadcn mentah).
- Progress bar `width` → `scaleX` transform-only (16+ titik); recharts
  tunduk token `chartRevealMs` + guard reduced-motion; KPI Statistik
  memakai `Counter` count-up.
- 3 kelas `animate-*` tanpa `motion-safe:` diberi guard; guard
  reduced-motion ditambahkan ke titik "Menyimpan…" jurnal.

### anime.js v4 — momen "hidup" baru
- **Plate "clink"** barbel: piring bermunculan stagger `outBack` saat
  beban berubah; hasil 1RM & tangga pemanasan pop elastis.
- **"SET SELESAI" pop**: chip set terakhir + counter `{n}/{target}`
  meledak elastis setiap set tercatat; KPI "N set" ikut timeline
  perayaan sesi.
- **Lencana Statistik** pop saat unlock; nilai asupan & saldo pop saat
  berubah (`RutinaMetric` kini punya prop `popOn`); default `useAnimePop`
  selaras preset `valuePopMs` (520ms).
- Spend heatmap keuangan kini bergelombang seperti heatmap kebiasaan.

### shadcn/ui & konsistensi UI
- Dialog portal (Tujuan Tabungan, Tentang) → `RutinaDialog` in-frame;
  form-dalam-AlertDialog (edit anggaran) → RutinaDialog semantik benar;
  input mentah WalletDialog → `Input`/`Label` shadcn.
- Segmented tulisan tangan (rentang riwayat Bugar, periode Statistik) →
  `RutinaTabs`; food sheet punya bagian "Sering dimakan" dari histori.
- Backdrop sheet diseragamkan `bg-espresso/45` + pegangan
  `bg-content-secondary/25`; hover tombol gelap → token baru
  `surface-inverse-raised` (dark-mode-safe); FAB gold melanggar peran
  warna → chip `hero-accent` di dalam SaldoCard.
- **Kode mati dihapus**: focus-widget, streak-widget, punch-card,
  rutina-field, rutina-icon-button, rutina-list-item (0 importer);
  DesignBoard + CssLab kini dimuat malas (dynamic import) — tidak lagi
  ikut bundel utama.

### Polish visual
- Sistem radius diikat ke skala (±101 `rounded-[Npx]` arbitrer →
  `rounded-lg/xl/2xl`); 48 kebocoran tipografi → token
  (`text-lead/body/meta`); MOOD_TONE hex lepas → token + satu sumber
  bersama journal; kartu identitas Profil mendapat permukaan hero;
  splash memakai skala token + Playfair untuk wordmark; tepi fade strip
  taman; `text-pretty` untuk paragraf panjang.

## [2.19] — Data Asli Saja: Seed Demo Dihapus Total & Pemolesan Visual

Permintaan pengguna: "cek data asli ku dan data dummy, data dummy hapus
aja" — aplikasi kini **100% jujur**: yang tampil hanya histori asli
Rutina 1.0 (dari cloud) atau keadaan kosong yang sesungguhnya. Tidak ada
lagi "Meditasi 10 menit", "Sarapan oatmeal & kopi", atau histori palsu
84 hari.

### Data demo dihapus dari akar
- **Seed dihapus dari store** (`store.ts`): `SEED_HABITS` (6 kebiasaan
  contoh), `buildSeedCompletions` (histori palsu 84 hari), `SEED_NOTES`,
  `SEED_TXS` (20 transaksi contoh), `SEED_WALLETS`, `SEED_GOALS` — state
  awal kini kosong; server cloud (histori asli) mengambil alih saat boot.
- **Konsep `demoMode` dihapus menyeluruh**: wire schema
  (`sync-schema.ts`), pembacaan/penulisan setting (`sync-server.ts`),
  DOMAIN_KEYS & applyServerState (`sync-engine.ts`), dan state store.
  Baris `app.demoMode` lama di database diabaikan.
- **Banner "Data contoh" dihapus** dari Beranda (beserta aksi
  `keepSample`); `startFresh` dipertahankan sebagai reset penuh di
  Zona Bahaya Profil.
- **Penjaga warisan demo** (`hasLegacyDemoSeed()`): perangkat yang dulu
  memilih "pakai contoh" masih memegang id seed (`h1–h6`, `n1–n6`,
  `f-*`, `w-*`, `g-N`) di localStorage — data itu **tidak akan pernah**
  menimpa server berisi histori asli, seberapa pun suntingan lokalnya
  (terverifikasi E2E: seed demo + lastEditAt lebih baru → tetap kalah
  dari server).
- **Baris uji sesi audit dihapus dari database**: 2 kebiasaan uji
  ("Test kebiasaan", "Tes Audit B"), 2 transaksi uji (101 & 15555),
  kategori uji "Kebun", 3 sesi latihan uji-template, 1 body-log uji —
  tersisa **17 kebiasaan, 283 transaksi, 4 dompet, 75 log kebiasaan,
  21 catatan tubuh & mood — semuanya asli Rutina 1.0** (Juli–Desember).
  `sync.lastPushAt` dinaikkan agar localStorage basi kalah dari server.

### Pemolesan visual (review frontend)
- **Bugar — keadaan kosong yang memandu**: saat empat angka pekan masih
  nol, muncul kalimat pengarah ("Belum ada aktivitas pekan ini — catat
  lewat pintasan di bawah…") alih-alih deretan nol yang "mati".
- **Bugar & Statistik — chip kisi 3 kolom**: pintasan "Catat Lari/Jalan/
  Lari+Jalan/Badminton/Barbel" dan navigasi seksi Statistik kini
  se-lebar-selaras (baris kedua rapi, "Piala" tidak lagi menggantung
  sendirian); layar lebar kembali ke satu baris flex.
- **Kebiasaan — kartu Coach tidak lagi kembar**: titik warna kategori di
  judul + saran yang bergilir (3 variasi) + saran "versi 2 menit" bila
  kebiasaan punya `mini`.
- **Keuangan**: ikon kategori Hiburan `Gamepad2` → `Tv` (penggunaan
  dominan: langganan streaming).
- **Beranda**: chip bonus tidak lagi menduplikasi angka tombol CTA
  ("Hadiah harian gratis" vs "Klaim +120 XP").

### Perbaikan lain
- **Noise log `prisma:error` hilang**: `hasColumn()` di `db-migrate.ts`
  memakai klien libSQL mentah (PRAGMA tidak didukung jalur `queryRaw`
  Prisma sehingga pemeriksaan selalu gagal → ALTER memicu "duplicate
  column" berulang di log). `src/lib/db.ts` kini mengekspor `libsql`
  bersama `db`.
- `bun run verify` hijau: typecheck + lint + **135 tes**; verifikasi
  E2E browser: toggle kebiasaan pulang-pergi bersih (75 log tetap),
  pintasan "Catat Lari" membuka lembar tepat di mode kardio-lari, data
  asli tampil di semua tab mobile & desktop tanpa error konsol.

## [2.18] — Pemulihan Histori Rutina 1.0, Tanpa Subkategori & Pintasan Template Aktivitas

Tiga hal sekaligus: **(1)** histori keuangan & kebiasaan Rutina 1.0 yang
"hilang" dipulihkan — akar masalahnya bukan impor, melainkan drift skema:
v2.17 menambah kolom `subcat`, tabel `rutina_fin_categories`, dan kolom
`distance`/`kcal` ke kode, tetapi DDL-nya tidak pernah sampai ke Turso
produksi (kredensial push hilang dari sandbox) sehingga
`/api/transactions`, `/api/workouts`, dan `/api/state` produksi mati —
data impor yang sejak v2.16 tersimpan di Turso (19 kebiasaan, 281
transaksi, 4 dompet nyata) tidak bisa dibaca sama sekali. **(2)**
Subkategori dihapus atas permintaan pengguna — kategori saja cukup;
kebetulan juga menyembuhkan drift `subcat`. **(3)** Template lari/jalan
kini terbuka SEKETIKA lewat chip pintasan di hero Bugar.

### Pemulihan produksi — auto-migrasi skema (`src/lib/db-migrate.ts`)
- **`ensureSchema()`** — DDL idempoten berjalan sekali per proses server
  sebelum query pertama: `CREATE TABLE IF NOT EXISTS rutina_fin_categories`
  + indeks, dan `ALTER TABLE rutina_workout_sessions ADD COLUMN
  distance/kcal` (dijaga `PRAGMA table_info` agar bebas noise log).
  Dipanggil dari `readFullState`/`writeFullState` + route
  transactions/workouts. Tanpa ini, deploy tanpa `db:push-turso`
  (butuh token) kembali merusak produksi.
- **Dipanggil dari** `/api/state` (GET/PUT), `/api/transactions`,
  `/api/workouts` — cold-start pertama pasca-deploy menyembuhkan Turso
  secara otomatis; histori Rutina 1.0 langsung terbaca lagi.
- **Verifikasi pasca-deploy**: `GET /api/health` → `connected: true`;
  `GET /api/state` → `initialized: true` (bukan lagi 500 "Gagal membaca
  state").

### Subkategori dihapus — kategori saja cukup
- **Skema**: kolom `Transaction.subcat` dan `FinCategory.parentKey`
  dihapus; `CustomCat` kini FLAT (id, name, type). Rincian seperti
  "Sarapan" atau "Ojek Online" cukup ditulis di catatan transaksi.
- **UI**: seksi subkategori dihilangkan dari lembar transaksi, pemilih
  kategori (kini daftar flat: cari → sering dipakai → semua → tambah),
  detail transaksi, dan detail harian; pemilih anggaran menyederhanakan
  filter kategori buatan.
- **Migrasi aman**: klien lama yang masih mengirim `subcat`/`parentKey`
  di-strip Zod di server (tidak ditolak); data lama tanpa kolom tetap
  terbaca. Kategori buatan yang pernah jadi subkategori kini tampil
  setara (di-hash `parentKey` lama dibuang saat db push).

### Bugar — pintasan template aktivitas di hero
- **Chip "Catat Lari / Jalan / Lari + Jalan / Badminton / Barbel"**
  langsung di kartu Ringkasan Aktivitas: `openWorkoutSheet(seed?, hint?)`
  menerima `{ mode, cardioKind }` sehingga lembar terbuka pada template
  yang dimaksud — menjawab "template lari/jalan mana?" tanpa mencari.
- **Seed program kini membuka mode Barbel otomatis** (dulu selalu
  kardio); hint eksplisit menang atas seed.
- Teks link kecil "Catat aktivitas lain" dihapus (chip menggantikannya).

### Lain-lain
- `bun run verify` hijau: typecheck + lint + **135 tes** (registry
  kategori diuji ulang tanpa subkategori; skema wire menguji strip
  `subcat` & customCats flat).
- Dev sandbox: `db/custom.db` dimigrasi (`subcat`/`parentKey` di-drop,
  baris kategori "Kebun" selamat); dev server wajib restart setelah
  `prisma db push` (client lama memuat kolom lama).

## [2.17] — Bugar: Pusat Catatan Aktivitas & Keuangan: Satu Sistem Kategori

Dua redesain arah pengguna. **Bugar** kini PUSAT CATATAN aktivitas &
progres — bukan pelacak olahraga yang menyaingi smartwatch: hasil lari,
jalan, badminton, dan barbel 5 kg digabung dalam satu tempat dengan
ringkasan mingguan per jenis. **Keuangan** menyatukan kategori bawaan
2.0, hasil impor Rutina 1.0, dan kategori buatan pengguna ke SATU
daftar tanpa penanda asal, dengan pemilih dropdown + subkategori.

### Bugar — empat jenis aktivitas (WorkoutKind +2)
- **Kind baru `lari-jalan` & `badminton`**: kombinasi lari+jalan tetap
  SATU catatan (pace dihitung dari total waktu & jarak); badminton
  cukup durasi + kalori + kondisi bermain — tanpa metrik jarak/pace
  yang dipaksakan.
- **Kalori dari smartwatch** (`WorkoutSession.kcal`, opsional): angka
  jam tangan pengguna menang mutlak; tanpa itu Rutina menaksir via MET
  (dilabeli "taksiran") — tidak mengklaim sebagai pengukuran sendiri.
- **Lembar "Catat Aktivitas"** tiga mode: Lari & Jalan (Jalan/Lari/
  Lari + Jalan + jarak + durasi + pace otomatis + kalori), Badminton
  (chip Santai/Sedang/Intens), Barbel (blok gerakan–beban–repetisi–set).
- **Ringkasan Aktivitas** hero baru: lari & jalan (km), badminton
  (jam), latihan barbel (sesi), hari aktif — angka dari histori nyata.
- **Riwayat Olahraga** dengan filter jenis (Semua/Lari & Jalan/
  Badminton/Barbel) + rentang tanggal (30/90 hari/semua); filter
  bertahan saat berpindah layar (uiPrefs.woFilter/woRange).
- **Grafik Perkembangan Jarak** — batang kompak 8 sesi kardio terakhir
  (hanya bila ≥3 sesi; satu grafik, halaman tidak penuh grafik).
- **Detail lari**: jarak jadi angka utama (hero "Jarak tempuh") +
  durasi + pace + kalori; detail barbel menampilkan total repetisi,
  volume, e1RM; detail badminton ringkas.
- **Nama gerakan bahasa Indonesia utama** — 31 gerakan EX_LIB kini
  punya `idName` ("Angkat barbel ke arah dada", "Dorong barbel ke
  atas", "Tarik barbel ke arah perut", "Turunkan dan angkat barbel",
  "Dorong barbel sambil berbaring", "Jongkok sambil memegang
  barbel", dst.); istilah Inggris jadi keterangan kecil. Pencarian
  pustaka mengenal kedua nama.
- **Kemajuan 5 kg bukan hanya beban**: baris barbel menampilkan total
  repetisi + volume (tonase) berdampingan e1RM — alat tetap 5 kg,
  kemajuan terlihat dari repetisi/set/konsistensi.

### Keuangan — satu sistem kategori (v2.17)
- **Hilangkan penanda asal**: blok "Dari Rutina 1.0" dihapus dari
  lembar transaksi — kategori bawaan 2.0 + impor 1.0 tampil dalam
  SATU daftar; tidak ada label "kategori lama/baru".
- **Pemilih kategori dropdown** (`CatPickerSheet`) menggantikan kisi
  25 kategori: (1) kolom pencarian, (2) kategori sering dipakai (dari
  frekuensi transaksi nyata), (3) daftar lengkap yang bisa diluas,
  (4) subkategori muncul setelah induk dipilih, (5) tombol tambah
  kategori. Form transaksi tetap pendek — hanya kategori terpilih.
- **Subkategori opsional**: kategori utama 2.0 punya subkategori
  bawaan terkurasi (mis. Makan & Minum → Sarapan/Makan Siang/Makan
  Malam/Camilan) yang sengaja tidak menabrak nama kategori impor 1.0
  berdiri sendiri; transaksi menyimpan `subcat` dan menampilkannya di
  baris mutasi, detail, serta lembar hari.
- **Kategori buatan pengguna** (model `FinCategory`, tabel
  `rutina_fin_categories`): bisa ditambah dari pemilih (validasi
  anti-duplikat case-insensitive terhadap semua label bawaan), ikut
  disinkronkan penuh lewat /api/state, ikut anggaran (pool "belum
  dianggarkan"), dan tampil dengan nama + ikon tag pengguna.
- **`catMetaOf` + `useCatMeta`**: lookup meta aman untuk slug apa pun
  (bawaan / buatan / asing) — seluruh UI (mutasi, beranda, statistik,
  context rail, detail hari) dimigrasi dari `CAT_META[cat]` langsung.

### Teknis
- Prisma: `WorkoutSession.kcal Int?`, `Transaction.subcat @default("")`,
  model `FinCategory`; wire schema + sync server + engine + REST route
  (`/api/workouts`, `/api/transactions`) mengikuti.
- Store: `Tx.cat` dilebarkan ke `string` (jujur menampung id kategori
  buatan), `customCats` + aksi `addCustomCat`/`removeCustomCat`,
  `activitySummary`, `filterWorkouts`, `cardioSeries` (urut tanggal
  sendiri — pola audit T5-e) di fit-utils.
- Tes: 138 lulus (+35 baru) — registry kategori terpadu (invarian
  tanpa label asal, subkategori anti-tabrakan, catMetaOf fallback,
  allCatsOf/subcatsOf/frequentCats), jenis aktivitas + ringkasan +
  kalori smartwatch + filter riwayat + idName, dan validasi wire v2.17
  (kind baru, kcal, subcat, customCats).
- Terverifikasi end-to-end di browser: catat lari 4,25 km (pace
  otomatis, kalori smartwatch), badminton 60 mnt (chip kondisi),
  barbel 5 kg × 12 (tonase + e1RM), filter riwayat, dropdown kategori
  + subkategori + tambah kategori "Kebun", transaksi kategori buatan,
  sinkronisasi cloud (customCats + kind baru + subcat terlihat di
  /api/state), responsif 390px & 1280px tanpa cacat visual.

## [2.16] — Deep Audit Menyeluruh (5 Agent Paralel) & Perbaikan Prioritas

Deep audit seluruh basis kode oleh lima auditor paralel — kualitas kode
(T5-a, 6,5/10), keamanan (T5-b, 6,5/10), performa & pertumbuhan data
(T5-c, 6/10), UI/UX & aksesibilitas (T5-d, 8/10), integritas data &
sinkronisasi (T5-e, 6,5/10). Temuan critical/major prioritas atas telah
diperbaiki; sisanya masuk peta jalan di bawah.

### Diperbaiki — Integritas Data (audit T5-e)
- **Demo seed tidak lagi bisa menimpa server** (`sync-engine.ts` boot):
  perangkat baru yang membuka aplikasi pertama kali secara offline lalu
  menyunting data contoh tidak lagi meng-PUT data demo menimpa dataset
  nyata di cloud; `localBeatsEmpty` kini hanya berlaku bagi lokal yang
  belum pernah sinkron sama sekali, sehingga reset kosong yang disengaja
  ("Mulai bersih") dari perangkat lain tidak dihidupkan ulang oleh
  perangkat lama yang masih memegang data.
- **Resurreksi salinan transaksi berulang** (`materializeRecurring`):
  ts TEMPLAT dimajukan ke due terakhir yang direncanakan — menghapus
  salinan terbaru tidak lagi memundurkan kursor sehingga tanggal yang
  sama tidak dibuat ulang. Dibuktikan `tests/recurring.test.ts` (3 tes).
- **`exStatOf` salah sesi terakhir** (`fit-utils.ts`): urutkan sesi
  terbaru-dulu di dalam fungsi — "set terakhir" kini selalu dari sesi
  bertanggal terbaru (sebelumnya sesi TERLAMA pada urutan produksi
  newest-first; memengaruhi prefill beban coach). +1 tes urutan
  produksi.
- **Impor Rutina 1.0 menulis `app.demoMode='false'`** — tanpa ini data
  hasil impor tampil dengan banner "Data contoh" + tombol "Mulai bersih"
  yang satu klik dari menghapus data pengguna sendiri.
- **Validasi tanggal impor** (`created_at`, `recurring.nextDate` wajib
  ISO; fallback createdAt kini check-in terawal kebiasaan itu, bukan
  konstanta masa depan) + penghitung baris yang dilewati.

### Diperbaiki — Keamanan (audit T5-b)
- **`db/custom.db` di-untrack dari git** — berikut data pribadi nyata
  (gaji, jurnal, mood) tidak lagi ikut ter-commit; `.gitignore` kini
  berlaku. DEPLOY.md diperbarui dengan catatan jujur bahwa riwayat lama
  masih memuat snapshot lamanya (panduan filter-repo disertakan).
- **Shared secret opsional `/api/*`** (`src/middleware.ts` baru): bila
  `SYNC_TOKEN`/`NEXT_PUBLIC_SYNC_TOKEN` diisi, seluruh API kecuali
  health menolak permintaan tanpa header `x-sync-token` (kosong =
  perilaku lama). Klien mengirim header dari `sync-engine.ts`.
- **Batas kunci record** `moodLogs` & `budgets` (refine Zod + cek route,
  selaras `MAX_TRACKED_DAYS`) — menutup celah muatan raksasa; +1 tes.
- **Header keamanan dasar** di `next.config.ts`: `X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`, CSP Report-Only.
- **Pesan error generik** (`guard`, `/api/state`, `/api/health`) — pesan
  mentah yang bisa membocorkan detail infrastruktur kini hanya di log
  server; `ok()` selalu `cache-control: no-store`.
- Route scaffold `src/app/api/route.ts` dihapus.

### Diperbaiki — Aksesibilitas (audit T5-d)
- **Focus trap di Quick Action Hub** (`use-focus-trap` + opsi
  `initialFocus: 'panel'`): satu-satunya dialog tanpa pengurungan Tab
  kini terkurung penuh; terverifikasi browser (5× Tab tetap di dalam
  dialog).
- **Umpan balik pembaca layar**: nominal transaksi `aria-live` (keypad
  tanpa umpan balik sebelumnya), input cari makanan ber-`aria-label`,
  caption heatmap `aria-live`, seksi Kategori/Dompet/Berulang jadi
  `role="group"` berlabel.
- Label `text-[9px]` spend-heatmap → token `text-chart-label`.

### Diperbaiki — Performa (audit T5-c)
- **Anggar render daftar Mutasi ponsel** (`MutasiPhoneList`): 14 hari
  pertama + tombol "Muat lagi" — selaras budget ledger desktop; jumlah
  TxRow terpasang kini konstan (terverifikasi browser: "Muat lagi —
  sisa 5 hari" muncul & berfungsi).
- `bestStreak` & `netSaldo` Beranda dibungkus `useMemo`.

### Diperbaiki — Kualitas (audit T5-a)
- `tsconfig.json`: `noImplicitAny: false` dihapus (strict penuh) +
  seluruh `scripts/**/*.ts` kini masuk cakupan typecheck.

### Pengujian
- 5 tes baru (114 total / 7 file): anti-resurreksi berulang (3), urutan
  produksi exStatOf (1), batas kunci moodLogs/budgets (1).
- Verifikasi browser (390px): fokus trap hub (5× Tab), lembar transaksi
  dengan grup berlabel, Mutasi ponsel + muat lagi, tanpa error konsol.

### Peta jalan (temuan besar yang belum dikerjakan — disengaja)
1. **Pecah `store.ts` (1.828 baris) & `keuangan.tsx` (2.624 baris)** ke
   modul (`store/{types,derive,seeds,theme,index}`, `finance/tabs/*`)
   mengikuti pola `fitness/` (T5-a #6-7).
2. **Sinkronisasi incremental per-slice** — pakai dirty-flag `DOMAIN_KEYS`
   + route REST per-domain yang sudah ada; mengubah biaya per-aksi dari
   O(total data) → O(perubahan) (T5-c #1-2; horison masalah ±1 tahun
   pemakaian padat).
3. **Version counter pada snapshot** — menutup lost-update dua perangkat
   aktif (T5-e #4).
4. **Ekstrak `useSheetLifecycle`** — 11× pola reset-draf + 15× Escape
   manual (T5-a #3); 5× duplikasi MOOD_ICONS (T5-a #4).
5. **Code-split**: `next/dynamic` untuk layar Statistik (recharts) +
   celebration; konsolidasi anime.js/motion (T5-c #6-7).
6. Gate render `ContextRail` pada <xl (T5-c #5); target sentuh 44px
   sistemik (T5-d #4); skip-link & pengumuman pergantian layar (T5-d
   #11-12); migrasi `Budgets` → `Partial<Record<FinCat, number>>` untuk
   memberantas 10 cast `as FinCat` (T5-a #8).

## [2.15] — Logo “r Tunas” & Impor Kategori Keuangan dari Turso

Fokus: identitas visual baru yang sepenuhnya berbeda dari versi lama,
dan kategori keuangan asli Rutina 1.0 (Turso) diimpor apa adanya —
tidak lagi dilipat menjadi kategori umum saat impor data.

### Ditambahkan
- **Logo baru “r tunas”** (menggantikan total logo lama) — huruf r
  lowercase digambar SATU goresan menerus (batang + bahu berakhir jam-12
  dengan tutup bundar), dengan satu daun yang sengaja MELAYANG ±3px di
  ujung bahu: rutinitas (goresan) + pertumbuhan (tunas). Seluruh aset
  diregenerasi dari satu sumber geometri (`scripts/gen-icons.ts` +
  sharp): `public/logo.svg` (marka matcha, latar transparan),
  `public/icons/icon.svg` (kotak sudut-bulat matcha + marka parchment),
  `icon-512.png`, `icon-192.png`, `apple-touch-icon.png` (180), dan
  `maskable-512.png` (marka 46%, aman di zona 80%). Palet flat earth
  tone — tanpa gradien emerald ikon lama, tanpa kotak-huruf-Z logo lama;
  tema PWA tetap matcha `#749b58`.
- **Splash pembuka memakai marka baru** — goresan r ditarik garis demi
  garis lalu daun melayang digaris tepi (stroke 9, grid 140); geometri
  identik dengan ikon — satu sumber kebenaran.
- **24 kategori hasil impor Rutina 1.0 (Turso)** — kategori asli yang
  benar-benar dipakai pengguna di aplikasi lama, dipertahankan apa adanya
  (termasuk ejaan khas “Cathering” & “Loundry”). Sisi keluar (22): Kopi,
  Makanan Berat, Jajan, Cathering, Bensin, Parkir, Pajak Motor, Servis
  Motor, Loundry, Dating, Badminton, Tagihan & Utilitas, Tagihan Air,
  Tagihan Listrik, Pulsa & Paket Data, Skin Care, Potong Rambut, Hutang,
  Iuran Kas, Tak Terduga, Pendidikan, Lifestyle. Sisi masuk (2):
  Investasi, Penghasilan.
- **Pemilih kategori dua tingkat di lembar transaksi** — kisi ikon
  bawaan 2.0 seperti sebelumnya, lalu seksi berlabel “Dari Rutina 1.0”
  (pemisah garis) berisi chip ringkas ikon+label; himpunan tetap berganti
  arah mengikuti Pengeluaran/Pemasukan.
- **9 subkategori impor masuk daftar anggaran** (`BUDGETABLE_CATS`):
  Kopi, Makanan Berat, Jajan, Bensin, Parkir, Loundry, Tagihan Air,
  Tagihan Listrik, Pulsa & Paket Data — tampil sebagai chip “tambah
  anggaran” di tab Anggaran dan dihormati filter temuan over-anggaran.

### Diubah
- **`scripts/import-rutina1.ts` — CAT_MAP kini identitas**: kategori lama
  dipetakan ke slug-nya sendiri (“Kopi”→kopi, “Bensin”→bensin), bukan
  dilipat ke kategori umum; `RECUR_CAT_MAP` ikut (Lifestyle,
  Penghasilan). Menjalankan ulang impor setelah v2.15 memperbarui
  kategori baris lama (INSERT OR REPLACE, id sama) ke nama aslinya.
- **`finance/cats.ts`** — registry dipisah `PRIMARY_CATS_BY_TYPE` dan
  `LEGACY_CATS_BY_TYPE`; `CATS_BY_TYPE` = gabungan (bawaan duluan, jadi
  default lembar tetap “Makan & Minum” / “Gaji”).
- Skrip baru `bun scripts/gen-icons.ts` — regenerasi aset logo/ikon
  sewaktu-waktu (idempoten).

### Pengujian
- `tests/cat-registry.test.ts` (11 tes baru; total suite 109 / 6 file):
  meta lengkap + label unik, daftar per arah bebas duplikat, gabungan
  bawaan+impor, elemen pertama tetap bawaan, impor tidak tumpang tindih,
  BUDGETABLE ⊆ keluar, subset impor di anggaran, 24 slug CAT_MAP
  terdaftar.
- Verifikasi visual ikon: tiga putaran kritik VLM (lebar goresan seragam,
  sambungan, pemusatan optis) hingga vonis SHIP — konsep final “daun
  melayang”: terminal goresan bersih + celah disengaja, tanpa benjolan
  sambungan.
- Verifikasi browser (agent-browser, 390px): splash marka baru, lembar
  transaksi dua tingkat (22 chip keluar + 2 masuk), simpan transaksi
  kategori Kopi Rp18.000 → muncul di kartu arus kas Beranda, anggaran
  Kopi ditambahkan dari chip — tanpa error konsol.

## [2.14] — Sorotan Harian, Rekap Pekan & Navigasi Plus Tengah

Fokus: Beranda selalu menunjukkan satu hal paling relevan untuk hari itu,
rekap perjalanan pekan yang memancing rasa ingin melihat perkembangan diri,
navigasi bawah "plus di tengah", dan refleksi yang bisa diganti-ganti.

### Ditambahkan
- **Sorotan Hari Ini** (`daily-highlight.ts` + `daily-highlight-card.tsx`) —
  kartu pertama Beranda, memilih SATU hal terpenting hari ini lewat logika
  prioritas murni: streak ≥3 hari belum selesai (runtun tertinggi menang) →
  anggaran kategori ≥85% terpakai bulan ini (rasio tertinggi menang, hanya
  transaksi bulan berjalan) → ≥3 hari tanpa latihan (hanya bila punya
  histori latihan) → tujuan tabungan ≥80% terdanai (belum 100%) → bonus
  harian (hanya bila punya kebiasaan aktif — pengguna baru disambut dulu) →
  hari sempurna (semua misi selesai) → jadwal kosong → sambutan. Tiap
  sorotan membawa aksen warna modul asal (kebiasaan/keuangan/bugar/beranda),
  suar bernapas untuk kandidat mendesak, mini-visual (chip runtun, batang
  anggaran & tujuan dengan role="progressbar", chip hitungan), dan satu CTA
  yang memetakan langsung ke aksi store (selesaikan misi, buka tab anggaran,
  buka lembar latihan, isi tabungan, klaim bonus, buka statistik, tambah
  kebiasaan).
- **Rekap Pekan** (`weekly-recap.ts` + `weekly-recap-card.tsx`) — ringkasan
  perjalanan pekan berjalan di permukaan garden-surface: strip perjalanan
  7 hari Senin–Minggu (kecambah penuh saat target harian tercapai, kecambah
  kecil saat beraktivitas, titik di hari kosong, lingkar putus hari
  mendatang, outline pada hari ini; ringkasan nonvisual role="img"),
  headline "N misi selesai" + chip perbandingan vs pekan lalu pada RENTANG
  HARI YANG SAMA (Senin..hari-setara), chip visual lintas modul (streak
  terpanjang, sesi latihan, XP misi, arus kas bersih dengan transfer
  netral), kalimat penutup naratif sesuai arah perkembangan, dan tombol
  "Statistik" (pintu utama ke layar Statistik yang turun dari tab).
- **Tombol plus besar di tengah navigasi bawah** — tab bawah kini
  **Beranda · Bugar · [＋] · Keuangan · Kebiasaan**: dock 56px menonjol ke
  atas bar dengan "kerah" ring senada permukaan, halo bernapas, plus
  berputar 45° menjadi silang saat hub terbuka; membuka Quick Action Hub
  (tambah kebiasaan, catatan, transaksi, latihan, asupan, check-in).
- **Baris "Jelajahi" di Quick Action Hub** — chip Statistik · Jurnal ·
  Profil di bawah kisi enam aksi (tampilan kueri kosong) — layar non-tab
  terjangkau satu ketuk tanpa mengetik.
- **Tombol "Ganti" pada Refleksi Hari Ini** — `cycleQuote` mengganti
  kutipan ke pilihan berikutnya dengan transisi slide lembut
  (AnimatePresence mode="wait"); offset hanya berlaku pada hari
  penggantian (hari baru kembali ke kutipan harian deterministik);
  bank kutipan diperluas 10 → 16.
- **`quoteFor` / `nextQuoteOffset` / `currentQuoteOf`** — helper murni
  (teruji) untuk matematika refleksi bergilir; state `quoteOffset` +
  `quoteDate` dipersist lokal.

### Diubah
- **Statistik bukan lagi tab bawah** — pintunya: tombol "Statistik" pada
  Rekap Pekan Beranda, baris Jelajahi + pencarian di hub, dan bilah sisi
  desktop (keenam layar tetap tampil di lg+).
- **QuickActionFab kini khusus desktop** (lg+) — di ponsel digantikan
  tombol plus tengah agar tidak ada dua pemicu yang bersaing.
- **"Insight pekan" (FocusWidget + StreakWidget) digantikan Rekap Pekan**
  — informasi keduanya (misi pekan, streak) terserap ke headline & chip
  rekap; kartu stempel pekan terlipat ikut diserap ke strip perjalanan
  (informasi "X dari 7 hari target" sama persis).
- **Urutan baris bento tier-3 Beranda** — Rekap Pekan (7 kolom) didahulukan
  sebelum kartu arus kas (5 kolom); ponsel menumpuk rekap → finance.
- **`saveQuote`** — menyimpan kutipan yang SEDANG tampil (sadar offset),
  bukan selalu kutipan default harian.

### Pengujian
- `tests/calc-highlight.test.ts` (22 tes baru, total suite 97 / 5 file):
  prioritas & ambang sorotan (streak-risk memilih runtun tertinggi,
  ambang 85%/80%/3-hari, pengeluaran bulan lalu tak dihitung, tanpa
  histori latihan tidak dinag, tujuan 100% tidak ditonjolkan, onboarding
  menang atas bonus), rekap pekan (strip Sen–Min, total sampai hari ini,
  pembanding rentang-sama + delta, Sabtu/Minggu pekan lalu dikecualikan,
  transfer netral, pekan kosong valid), refleksi bergilir (offset maju,
  modulo penuh, reset harian, bank ≥10 & unik).

## [2.13] — Hardening & Review Frontend

Fokus: menutup utang rekayasa (konfirmasi hapus, pemeriksaan tipe, pengujian
otomatis, performa data besar) + menindaklanjuti review frontend eksternal
(Beranda 3 tingkat, navigasi Profil/Jurnal, aksesibilitas grafik, persistensi
preferensi, lipatan seksi sekunder).

### Ditambahkan
- **Konfirmasi AlertDialog** untuk dua jalur hapus terakhir yang belum
  berkonfirmasi: entri jurnal makan (Asupan → FoodRow) dan sesi latihan
  (Bugar → WorkoutRow). Kini seluruh aksi destruktif (transaksi, catatan,
  kebiasaan, anggaran, sesi, asupan, reset data) berpola sama.
- **Pengujian otomatis** (`bun test`, 75 tes / 4 suite):
  - `tests/calc-finance.test.ts` — format Rupiah, alat bulanan (kabisat),
    arus kas bulanan (transfer netral), saldo dompet & total, grup harian,
    deret grafik minggu/bulan/tahun relatif hari berjalan.
  - `tests/calc-fitness.test.ts` — e1RM Epley, tonase, pace, papan rekor,
    ringkasan pekan, kesiapan 4-komponen (normalisasi bobot), double
    progression, deteksi plateau, deload, guard kardio, pemuat piring IWF,
    tabel 1RM, tangga pemanasan.
  - `tests/calc-store.test.ts` — XP/level, penjadwalan, streak (grace hari
    ini, transparansi hari jeda, batas createdAt), bestStreak, kartu stempel.
  - `tests/sync-schema.test.ts` — snapshot valid + default Zod, penolakan
    muatan tidak valid (tipe asing, nominal negatif, tanggal rusak, di luar
    batas), pulang-pergi JSON, batas jumlah item domain.
- **Skrip npm**: `typecheck` (tsc --noEmit), `test` (bun test), `verify`
  (typecheck + lint + test berurutan).
- **uiPrefs** di store — preferensi UI yang bertahan saat berpindah layar:
  subtab Bugar, tab & periode grafik Keuangan, filter mutasi, periode
  Statistik. Dipersist ke localStorage, dikecualikan dari sinkronisasi
  (bukan data domain — tidak ada di DOMAIN_KEYS sync-engine).
- **Tombol Jurnal** di header Beranda (di samping avatar) dan item
  **"Buka Profil & Pengaturan"** di Quick Action Hub — kedua layar non-tab
  kini terjangkau satu ketukan dari mana pun.
- **Pintasan seksi Statistik** — chip Tren · Kalender · Laporan · Bugar ·
  Piala di kepala halaman (scroll-mulus + anchor id).
- **Ringkasan nonvisual grafik** — sr-only: total masuk/keluar/selisih
  (FinChart), rata-rata kalori vs target (grafik 7-hari Asupan).

### Diubah
- **next.config.ts** — `typescript.ignoreBuildErrors: false` dan
  `eslint.ignoreDuringBuilds: false`: error tipe/lint menggagalkan build.
- **Beranda** direorganisasi ke tiga tingkat informasi:
  1. *Hari ini* — hero progres, kalender dua pekan, agenda (+ nudge & saran
     coach di tile samping).
  2. *Perlu perhatian* — bonus harian langsung setelah agenda.
  3. *Aktivitas tambahan* — arus kas & insight pekan, kartu stempel terlipat,
     pintu Jurnal & Catatan ringkas, taman pertumbuhan, refleksi.
- **Kartu stempel pekan** dilipat default (`FoldedPunchCard`, ringkasan
  "X dari 7 hari" + lencana Sempurna di pemicu; `punchWeekInfo` diekspor).
- **Kisi folder catatan Beranda** diganti kartu "Jurnal & Catatan" ringkas
  (chip folder ber-hitungan tetap membuka folder di Jurnal).
- **Laporan Bulanan & Piala/Lencana (Statistik)** dilipat default dengan
  ringkasan di pemicu.
- **TonaseStrip (Bugar)** — `role="img"` → `role="group"` bernama karena
  berisi 7 tombol interaktif (pembaca layar mengenali tiap kolom sebagai
  kontrol); `aria-pressed` tiap tombol dipertahankan.
- **Grafik kalori 7-hari** — pembungkus batang mendapat `role="group"` +
  ringkasan sr-only.
- **TaskRow** — grup pil meta (streak/kategori, XP, chevron) menjadi satu
  unit `shrink-0` dengan `ml-auto`; judul `basis-36`. Di kartu sempit pil
  menurun ke baris kedua alih-alih menjepit judul (memperbaiki terpotong
  ±24px di kisi 2-kolom desktop).
- **Tile agenda** melebar `@[52rem]:col-span-12` saat tile samping (nudge/
  coach) tidak memiliki konten — kolom mati di desktop hilang.
- **Pemilih bahasa (Profil)** menjadi baris informasi statis
  "Indonesia · aktif" sampai multi-bahasa benar-benar tersedia.
- **Batas render progresif**: ledger Mutasi 60 transaksi (+60 per muat),
  daftar catatan Jurnal 30 kartu (+30), riwayat Bugar 15 sesi (+15).

### Dipulihkan / Diverifikasi
- Seluruh alur diverifikasi end-to-end di browser (agent-browser):
  navigasi Jurnal/Profil, persistensi tab Bugar lintas layar, dialog hapus
  sesi, pintasan & lipatan Statistik, tanpa overflow di 320/390/768/1440px,
  tanpa error konsol.
- `tsc --noEmit` bersih 0 error (dulu diabaikan oleh ignoreBuildErrors).

## [2.12] — Visualisasi Data

Duplikasi grafik dipangkas; grafik yang tersisa kini informatif (angka
jelas, label jujur). FinChart: batang min 7px + kolom 32px + gulir
horizontal untuk histori panjang. Tile streak & misi-pekan Beranda dihapus
(sudah terbaca di chip hero & widget insight). Label grafik memakai
`w-max` agar tak terjepit.

## [2.11] — Color System v2 + Tipografi System v1.1

Kontras WCAG AA dipulihkan di seluruh pasangan warna teks-latarnya;
token warna dipusatkan; tipografi diselaraskan (Geist + Playfair Display,
skala baku, hirarki h1 tiap tab).

## [2.10] — Tipografi System v1

Geist benar-benar terpasang (self-hosted), skala tipografi baku,
letter-spacing & line-height dinormalisasi, hirarki judul per tab.

## [2.9] — Ruang Kerja Adaptif

Bento sadar-kontainer (container queries), inspector Statistik di desktop,
gerak terpusat lewat motion tokens.

## [2.8] — Lima Ruang Kerja

Layout grammar & animasi khas tiap tab (daybook · performance studio ·
vault & ledger · botanical garden · observatory).

## [2.7] — Audit Gerak

Overlay perayaan tak lagi macet; hidrasi bebas mismatch; animasi makin halus.

## [2.6] — Gerak & Permukaan

CSS motion layer + anime.js kit + shadcn/ui penuh.

## [2.5] — Ruang Warna

Identitas visual berbeda tiap layar (matcha · eucalyptus · bronze ·
rose clay · mineral slate).

## [2.4] — Audit UI/UX Mobile

Nol teks terpotong di 390px & 360px (30+ temuan diperbaiki).

## [2.3] — Earth-Tone Editorial Bento

Color System 2.0 (empat warna domain), bento foundation, split-screen
Kebiasaan, ContextRail adaptif.

## [2.2] — Tab Kebiasaan, Impor Rutina 1.0, PWA

Tab Jurnal → Kebiasaan; impor data Rutina 1.0 dari Turso (batch, idempoten);
tarik-ulang paksa dari cloud; PWA install.

## [2.1] — Migrasi 27 Kapabilitas Rutina Lama

Habit Intelligence (streak freeze, habit stacking, versi 2 menit, nudge,
goldilocks, taman pertumbuhan), Fitness Intelligence (kesiapan 4-komponen,
double progression, plateau/deload, guard kardio, rest timer, alat barbel,
neraca kalori), Life Analytics (kalender aktivitas, laporan bulanan, peta
panas, temuan keuangan, arus kas harian, pembanding pekan).

## [2.0] — Fondasi

Next.js 16 App Router + TypeScript + Tailwind 4 + Zustand + Motion.dev;
sinkronisasi cloud Turso offline-first; Quick Action Hub; layar inti
Beranda/Bugar/Keuangan/Statistik/Jurnal/Profil.
