# Changelog — Rutina 2.0

Semua perubahan penting per versi. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/);
versi mengikuti gelombang pengembangan internal (bukan semver).

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
