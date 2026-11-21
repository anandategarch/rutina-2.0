# Rutina 2.0 — Kebun Kebiasaan

Aplikasi pelacak kebiasaan, keuangan, kebugaran, dan jurnal dalam satu tempat.
Dibangun dengan Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Zustand,
Motion.dev, dan sinkronisasi cloud Turso (libSQL) dengan penyimpanan lokal
offline-first.

> **Penomoran versi**: nomor gelombang internal (v2.x) adalah acuan utama dan
> sejak v2.35 mengikuti `version` di package.json (2.44.0) — tidak ada lagi
> tiga penomoran berbeda. Riwayat lengkap ada di CHANGELOG.md.

## v2.44 — Review UI/UX: Fitness Intelligence, Laju Anggaran, dan Jalur Jurnal

Review eksternal atas v2.43.0 memvonis fondasi UI/UX sudah matang — bukan
redesign yang dibutuhkan, melainkan KEDALAMAN analisis per modul. Rilis ini
mengeksekusi seluruh Tahap 1 (P0) plus empat item Tahap 2. Bugar resmi jadi
fitness intelligence: lembar **Exercise Progress Detail** per gerakan (pola
Hevy — rekor e1RM, beban terakhir, grafik perkembangan yang bisa diketuk,
riwayat per sesi; dibuka dari Papan Rekor atau tombol baru "Riwayat & e1RM"
di Pustaka), kartu **Aktivitas Pekan Ini empat mode** (Semua / Lari & Jalan /
Badminton / Barbel — km, menit, dan kg tidak pernah berbagi satu sumbu), dan
**Neraca Kelompok Otot** (set per grup jendela 30/7 hari, otot utama saja).
Keuangan mendapat **Budget Pace Analysis** (pemakaian aktual vs laju ideal
hari ke-N bulan berjalan + jatah aman/hari). Beranda menampilkan **bar
konteks tanggal** saat membuka agenda lampau (chip Riwayat/Akan datang +
"Kembali ke hari ini"). Jurnal kini ada di **sidebar desktop** (shortcut 1-7).
Tahap 2: matriks perbandingan konsistensi 4 pekan, tren jumlah kata + filter
mood di Jurnal, dan "Wawasan Periode Ini" di Statistik.

| Prioritas | Rincian |
|---|---|
| **P0 — Fitness intelligence** | `ExerciseDetailSheet` (pola Hevy: ringkasan + grafik e1RM interaktif + tabel riwayat); WeekActivityCard 4 mode dengan KPI per satuan; `MuscleBalanceCard` (set per kelompok otot utama, 30/7 hari). |
| **P0 — Keputusan & konteks** | Budget Pace (tanda laju ideal di batang total & kategori, vonis tiga nada, lencana "laju ±X% vs ideal"); bar konteks tanggal di Beranda; sidebar 7 layar + shortcut 6=Jurnal, 7=Profil. |
| **P1 — Pendalaman analitik** | `HabitComparisonMatrix` (kebiasaan × 4 pekan, ketuk buka detail); mode "Jumlah Kata" + filter mood Jurnal; "Wawasan Periode Ini" Statistik (maks 3 temuan, butuh data pembanding). |
| **Larangan dijaga** | Tanpa grafik kembar Bugar↔Statistik, tanpa angka tanpa data (HR/GPS/VO2 max), satuan tak bercampur, visualisasi kuat lama dipertahankan. |

## v2.43 — Audit Profesional Tahap 1: Fokus Harian, Training Log, dan Navigasi

Audit eksternal tiga tahap tervalidasi terhadap kode nyata; seluruh Prioritas
Tahap 1 dieksekusi. Beranda makin jadi command center: Sorotan Hari Ini kini
punya kasus "Sedikit lagi — lanjutkan" (progres misi + misi berikutnya + target
menit, persis contoh audit), insight saldo berarti (surplus/defisit arus kas
7 hari), chip "Lanjutkan draft" jurnal, dan SATU peringatan anggaran terburuk
memimpin kartu keuangan. Bugar resmi jadi training log: Kalender Latihan
bulanan berindikator jenis (lari/jalan, badminton, barbel) dengan detail hari,
pustaka gerakan menghormati alat rumah (filter "Barbel rumah" default + chip
ketersediaan alat), dan Tren Kardio berjendela 30/90 hari/semua. Anggaran
kini menyebut jatah aman harian per kategori ("±Rp40 rb/hari · 10 hari");
Statistik naik ke header Beranda; Quick Hub mengingat 3 aksi terakhirmu.

| Prioritas | Rincian |
|---|---|
| **P0 — Command center + Training Log** | `nearly-done` di `pickDailyHighlight` (tanpa melanggar dedup Agenda); `TrainingCalendar` baru (pola Strava: titik per jenis, detail hari, ringkasan bulan); `EquipmentClass` + filter "Barbel rumah/Tanpa alat/Semua" + chip alat di pemilih & Pustaka. |
| **P1 — Keputusan & navigasi** | Insight kontekstual 7 hari; peringatan anggaran tunggal (ambang `BUDGET_WARN_PCT`); BudgetRow "±Rp/hari (N hari)"; CardioTrendCard periode 30/90/semua; tombol Statistik di header; Hub "Terakhir digunakan" (persist lokal). |
| **Validasi & tunda** | "Safe to Spend" = Jatah Hari Ini v2.22 (tidak dibangun ulang); impor CSV smartwatch & Tahap 2/3 mengikuti peta jalan audit. |
| **Pembuktian mutu** | lint & tsc hijau; uji logika nearly-done (3/4 → 75%, dedup aman); E2E 390/1280px: kalender "3 sesi · 1j 24m" + detail pace 6:40/km, filter alat bekerja dua arah, periode tren interaktif, laju anggaran akurat kalender, alur draf penuh (tulis → tombol → buka → hapus → hilang), chip recent Hub; nol error konsol. |

## v2.42 — Mencatat untuk Hari Kemarin: Tanggal Bisa Dipilih di Semua Pencatatan

Lupa mencatat transaksi hari kemarin bukan lagi masalah: lembar transaksi,
transfer, dan asupan kini punya pemilih tanggal (chip cepat Hari ini / Kemarin
+ input tanggal, maks. hari ini). Mode sunting bisa memindah tanggal transaksi
lama yang salah catat; grafik 7 hari Asupan menyalakan jurnal makan hari yang
diketuk (entri lampau bisa dilihat & dihapus); sesi gym lintas tengah malam
tercatat di tanggal mulainya; perayaan Level 8 tidak lagi replay tiap reload.

| Prioritas | Rincian |
|---|---|
| **P0 — Pemilih tanggal di tiga lembar** | AddTxSheet & TransferSheet: bagian "Tanggal" (chip + input native); FoodSheet: pemilih di kartu detail; `addTx`/`addTransfer` menerima `date`, `updateTx` menerima `ts` — transaksi kemarin masuk grup tanggal yang benar di Mutasi, grafik arus, dan Vault. |
| **P1 — Jurnal makan per hari terpilih** | Batang grafik 7 hari menyalakan jurnal hari itu + chip kembali ke hari ini; entri lampau bisa dihapus. Sesi latihan tercatat di tanggal MULAINYA; pagar `materializeRecurring` per-templat. |
| **Pembuktian mutu** | lint hijau; E2E: tx kemarin tergrup benar, sunting pindah 20→21 Nov, transfer & asupan ber-tanggal, mingguan backfill 14 & 21 Nov, input kustom 18 Nov, 390/1280px, nol error konsol; VLM konfirmasi. |

## v2.41 — Saran Coach Tanpa Repetisi: Satu Inti Saran, Satu Kartu

Saran Coach tidak lagi muncul berkali-kali dengan judul identik — semua
kebiasaan yang perlu "diperkecil" bergabung dalam SATU kartu kompak (baris
ringkas: titik kategori + nama + capaian "selesai/terjadwal"), begitu pula
yang "pekan sempurna"; pemulihan "terlewat kemarin" menjadi satu kartu dengan
centang per baris. Kebiasaan yang sudah ditangani kartu pemulihan dikecualikan
dari grup lain — satu kebiasaan tak pernah muncul dua kali dalam satu seksi.

| Prioritas | Rincian |
|---|---|
| **P0 — Konsolidasi** | `goldilocksGroups()` menggantikan saran per-kebiasaan; kartu pemulihan tunggal menggantikan deretan kartu kembar; `MISSED_NUDGES` (rotasi kalimat penutup repetisi) dihapus — repetisinya yang dihilangkan. |
| **P1 — Satu komponen** | `CoachGroupCard` dipakai Beranda & Kebiasaan — bentuk identik, ukuran kompak (p-3, ikon h-8, baris py-1.5), aksen disatukan. |
| **Pembuktian mutu** | typecheck & lint hijau; E2E seed nyata: Beranda 2 kartu (dulu 4), Kebiasaan 3 kartu ber-inti berbeda, exclusion terbukti, centang pemulihan bekerja (completion tercatat, kartu lenyap); 320/1280px tanpa overflow; nol error konsol; VLM konfirmasi. |

## v2.40 — Serah Terima Pembuka yang Sempurna: Pra-Pasang di Balik Splash

Transisi pembuka yang tersendat kini permanen diperbaiki: cangkang aplikasi
dipasang LEBIH DAHULU di balik splash yang opak (1,8 dtk — semua aksi splash
sudah selesai), subtree `inert` sampai splash pergi (aman aksesibilitas),
lalu navigasi bawah naik satu blok + FAB pop pada momen reveal. Prefetch enam
layar pindah ke pascalayar `requestIdleCallback`; transisi tab `mode="wait"`
→ sinkron — dua kali lebih responsif.

| Prioritas | Rincian |
|---|---|
| **P0 — Pra-pasang + inert + koreografi reveal** | Nol lonjakan main thread pada frame transisi (pohon sudah dirender di balik splash); pohon a11y selama splash hanya berisi tombol lewati; nav naik spring.sheet, FAB pop spring.snappy, digerbang `revealed`. |
| **P1 — Prefetch & transisi tab** | Pemanasan chunk pascalayar idle (dulu 1,5 dtk, bertabrakan dengan ekor splash); pindah tab crossfade berarah 0,24 dtk (dulu 0,48 dtk berurutan). |
| **Pembuktian mutu** | lint hijau; E2E browser: splash→reveal, skip, hub, bolak-balik Profil, 390px & 1280px, pindah tab beruntun 100 ms — nol error konsol; VLM verifikasi visual mobile + desktop. |

## v2.39 — Data Everywhere: Audit Visual Angka & Model Progres Baru

Audit visual tiga agen paralel atas tujuh ruang untuk menemukan "data angka
yang punya potensi digambar" — lalu menggambarkannya. Semua visual baru
membaca data yang sudah ada; angka persis tetap dibawa teks.

| Prioritas | Rincian |
|---|---|
| **P0 — Beranda** | Cincin progres lama (menampak seperti roda gigi) diganti `MissionSteps` — petak linear satu-per-misi terjadwal, terisi reaktif per centang, pop elastis saat penuh; persen `Counter` tetap menonjol. `HomeFinanceCard`: strip bar pengeluaran 7 hari (hari ini disorot + rata²/hari) + bar laju mini di strip Jatah (terpakai vs penanda ideal bulan). |
| **P1 — Kebiasaan · Jurnal · Profil** | `RutinaMetric` prop `progress` (bar tipis reaktif): "Selesai pekan ini", "Target pekan ini" Konsistensi, bar tumbuh "Tahap tanaman". Jurnal: bar segmen distribusi mood (pola Ruang Suasana). Profil: bar rasio kebiasaan berpengingat. |
| **P1 — Bugar** | Riwayat Tubuh 14 hari kini lima baris — "Nyeri otot" & "Stres" (titik 1–5 bernada semantik) menyusul tidur/energi/hidrasi. "Tonase 6 pekan": bar per pekan, pekan berjalan disorot + rata²/pekan. Hero: petak sesi melengkapi bar menit. |
| **P1 — Keuangan & Statistik** | Kartu Vault: sparkline saldo 30 hari (konsisten `totalSaldo`, tak digambar bila datar). Langganan: bar proporsi per baris. Tujuan Tabungan: bar agregat bertumpuk + persen. Statistik: sparkline mini berat di "Berat terakhir" (dari 3 catatan, warna netral). |
| **Pembuktian mutu** | lint & typecheck hijau; E2E browser dataset seed penuh — 13 titik visual terverifikasi DOM (petak misi 2/6, 7 bar mingguan, sesi 4/4, 6 bar tonase 2.275→4.720 kg, 5 baris tubuh, sparkline saldo, proporsi langganan 65/23/12%, agregat tujuan, berat 5 titik, mood, pengingat 6/6); 390px & 1280px tanpa overflow; nol error konsol; VLM konfirmasi visual. |

## v2.38 — UX Density, Duplication Control & Activity-to-Habit Automation

Implementasi audit UX density v2.37: gulir lebih ringkas, informasi dan
tindakan tidak lagi berulang, dan aktivitas Bugar dapat menyelesaikan
kebiasaan yang secara eksplisit dihubungkan. Tidak ada redesain, tidak ada
fitur yang dihapus — semua data tetap bisa diakses lengkap.

| Prioritas | Rincian |
|---|---|
| **P0 — Beranda** | `homeAttention()` — satu derivasi pusat untuk Agenda, pemulihan, dan Sorotan (dedup `Set<habit.id>`). Agenda berpagar 4 tugas prioritas + penghitung "4 dari N tugas" + CTA "Lihat semua kebiasaan". `TaskRow` varian compact (centang + nama + jam + badge). "Jangan Bolong Dua Kali" hanya untuk kebiasaan tak terjadwal hari ini (maks 2); Sorotan tidak pernah membuat tombol centang kedua (`excludeHabitIds`). |
| **P0 — Kebiasaan** | Agenda maks 5 awal + badge "Terlewat kemarin"; kartu Coach dedup vs Agenda. Perpustakaan murni inventaris: status non-interaktif (bukan jalur centang kedua), pencarian, grup collapsible (pratinjau 3 + hitungan). Detail ponsel pindah ke bottom sheet; desktop tetap kolom sticky (gerbang JS selaras sheet). |
| **P0 — Otomatisasi Bugar** | `Habit.linkedActivity` (pilihan eksplisit, default null untuk kebiasaan lama). Satu jalur pusat di `addWorkout()`: jadwal/rest-day/createdAt dicek; target menit → durasi, target km → jarak, satuan tak cocok → dibiarkan; idempoten; centang manual tak pernah tertimpa. Provenance `habitAuto` (base + id workout) membuat `deleteWorkout()` mengembalikan nilai manual tanpa merusak histori. Persistensi penuh: persist v3, Prisma (linkedActivity + autoBase/autoWo), db-migrate Turso, Zod wire, sync-server/engine, backup JSON. |
| **P1 — Bugar** | "Aktivitas Pekan Ini" (gabungan Tonase + Campuran Aktivitas, satu sumbu hari); "Tren Kardio" (Jarak \| Pace — dua unit tak pernah satu sumbu); riwayat 5 awal + "Lihat semua riwayat" tanpa nested scroll ponsel; pustaka gerakan grup otot collapsible; asupan 3 entri per kelompok makan. |
| **P1 — Keuangan & Jurnal** | Ringkasan cepat: 3 transaksi + accordion "Analisis Pengeluaran" (donut+langganan+heatmap+temuan) default tertutup. Jurnal: pagar global 10 catatan awal (pinned 3, draft 3, muat bertahap; pencarian = tanpa pagar) + WritingActivityCard collapsible. |
| **P1/P2 — Statistik & Profil** | "Kinerja & Konsistensi" satu ruang (Grafik \| Peta Panas); "Pekan Ini vs Pekan Lalu" dilipat; "Bugar & Tubuh" jadi ringkasan 4 metrik + CTA; "Ruang Suasana" (input + riwayat mood 14 hari) terpusat di Statistik; Profil kembali Control Room murni (mood jadi satu baris ringkas + tautan). |
| **Pembuktian mutu** | `bun run verify` hijau (typecheck + lint + 156 test). E2E browser: siklus auto-complete penuh (tambah sesi → selesai otomatis + chip status → hapus sesi → kembali manual), pagar agenda 13 kebiasaan (4→13→ringkas), pagar Perpustakaan + pencarian, accordion tertutup default, 320px & 1440px tanpa overflow, nol error konsol. |

## v2.37 — Deep Audit Sweep: Gelombang Audit Paralel & Perbaikan Menyeluruh

Audit menyeluruh lima agen paralel (motion governance · sistem CSS · a11y ·
integritas data CRUD · responsif+perf) atas seluruh basis kode v2.36, lalu
perbaikan terkurasi dalam batch paralel tanpa saling bertabrakan file.
Tidak ada redesain, tidak ada dependensi baru.

| Prioritas | Rincian |
|---|---|
| **P0 — Palet donat** | 4 var `--palette-*` yang direferensikan DONUT_COLORS Keuangan namun tak pernah didefinisikan (slice 4+ ter render hitam) kini didefinisikan & diverifikasi di browser. |
| **P1 — Integritas data** | "Mulai dari awal" kini menghapus SEMUA kunci domain (sebelumnya 14 kunci sintas — termasuk berat badan & dompet); negosiasi sync tahan selisih jam server; flush pada tab-hide + retry saat fokus; pemicu kebiasaan & mood catatan dipangkas bersih saat induknya dihapus. |
| **P1 — Anti-replay & morph** | Grafik Arus Kas memorf per ganti periode (bukan tumbuh ulang); 11 BlurFade + 5 daftar Kebiasaan + gelombang Statistik + heatmap digerbang kunjungan-pertama (`visitKey` baru); 6 kunci `bugar-studio` kembar dipecah per-blok. |
| **P1 — A11y alur utama** | Hit-slop ≥44px untuk checkbox kebiasaan & stepper; sel heatmap 24px; Escape 2-langkah (dialog dulu, sheet kemudian) di 4 sheet dengan AlertDialog — diverifikasi dengan instrumentasi event-order. |
| **P2 — Konsistensi & perf** | `text-white` di destructive → token fg (dark-mode AA); shadow-sheet & radius kartu seksi diseragamkan; default RutinaCard `2xl`; derivasi berat Statistik/Profil masuk useMemo; kunci id stabil untuk blok latihan (animasi keluar di kartu yang benar). |
| **Kebijakan gerak & CSS** | Animasi berulang dikodifikasi (ambient identitas + indikator fungsional; glow FAB dihapus); CSS mati dibersihkan (6 var, grain, 9 utility+keyframes, ShineBorder, 6 pemetaan @theme); api streak hero kini benar-benar bernafas via `ambientPulse`. |
| **Pembuktian mutu** | lint & tsc nol error; E2E browser: 7 layar, autosave Jurnal utuh, CRUD hapus bersih, donat resolve, 320/390/768/1440px tanpa overflow, nol error konsol. |

## v2.36 — Full Data Visualization Expansion

Ekspansi visualisasi data menyeluruh di atas baseline v2.35: **setiap data
penting terbaca sebagai cara baca yang lebih cepat** — angka tetap untuk
presisi, visual untuk pola, perbandingan, komposisi, progres, dan anomali.
Tujuh karakter halaman dipertahankan; tidak ada redesain; tidak ada
dependensi chart baru (Recharts/SVG/Motion/anime.js yang ada).

| Tahap | Rincian |
|---|---|
| **1 · Integritas data** | Tanggal catatan jurnal distandarisasi ISO yyyy-mm-dd (`addNote`/`saveQuote`/kanvas) — selaras skema `JournalNote`; catatan lama "Hari ini" dimigrasi aman lewat tanggal-dibuat dari id epoch (`noteDateISO`), tak-dikenal = "Tanpa tanggal" (tidak dikarang jadi hari ini). Metrik kebiasaan sadar-jadwal: `daySchedules` (kepatuhan selesai/terjadwal, hari jeda diampuni, hormati createdAt & arsip), `habitStatusOn` (done/missed/rest/unscheduled/future), `habitWeeklyRates` (4 pekan). 23 unit test baru (tests/data-integrity.test.ts). |
| **2 · Bugar & Kebiasaan** | Bugar: kartu Riwayat Tubuh 14 hari (small multiples tidur+zona 7-8 jam / energi dot 1-5 / hidrasi vs target; hari tanpa catatan = soket hollow, bukan nol), bullet bar makro vs target + cakupan makro %, Campuran Aktivitas 7 hari (ikon per jenis — satuan tidak dicampur), Tren Pace menit/km terpisah dari grafik jarak. Kebiasaan: heatmap dua mode Jumlah/Kepatuhan (hari tanpa jadwal = sel outline; Garden default kepatuhan — membedakannya dari heatmap Statistik), riwayat 30 hari lima status + legenda, tren 4 pekan per kebiasaan. |
| **3 · Statistik & Beranda** | Statistik Bugar & Tubuh: Sesi/Tonase per pekan (P1-P4), kalori 7 hari kalender + garis target + X/7 hari tercatat, small multiples Tidur/Energi/Hidrasi; Wawasan lintas domain kini punya visual pembanding bar hari berlatih vs tanpa latihan (+ jumlah sampel, disclaimer observasional). Beranda: DateStrip bar intensitas selesai/terjadwal (caption sadar-jadwal), WeeklyRecap bar proporsi capaian vs target per hari + detail X/Y jadwal (Z%), DayDetailSheet + persentase kepatuhan. |
| **4 · Penyempurnaan** | Keuangan: baris anggaran diurut persentase penggunaan tertinggi. Jurnal: kartu Aktivitas Menulis (kalender mini intensitas catatan/bulan + navigasi bulan, ketuk tanggal = filter daftar + chip hapus), distribusi folder segmented bar, ringkasan mood yang tercatat. Profil: bar distribusi mood 14 hari netral dengan penyebut jujur "dari N hari tercatat". |
| **Pembuktian mutu** | `bun run verify` hijau (typecheck + lint + 156 test). Browser E2E dengan data uji nyata (seed server): 36 kombinasi lebar (320–1440px) × 6 layar + Jurnal tanpa overflow; nol error konsol & halaman; CRUD terverifikasi (centang kebiasaan on/off, buat+hapus catatan lewat kanvas, dialog hapus kebiasaan); sinkronisasi PUT /api/state tetap menyala di tiap aksi; dark mode mini-chart terbaca. |

## v2.35 — Final Design Engineering Polish

Gelombang penyelesaian setelah redesain tujuh ruang (v2.27–v2.34) disetujui
arahnya: **satu produk, tujuh ruang berbeda, satu identitas Rutina**. Tidak
ada layar yang didesain ulang dan tidak ada dependensi baru — yang dipoles
adalah kematangan motion, konsistensi design system, presisi interaksi,
dan pembuktian mutu.

| Prioritas | Rincian |
|---|---|
| **Motion governance penuh** | Seluruh literal duration/easing/spring/delay di tujuh layar + modul bersama masuk token semantik (`pageEntrance`, `panelReveal`, `cardReveal`, `chipReveal`, `gardenMilestone`, `screenSwap`, spring `progressArc`/`rowEnter`/`letter`, skala delay `tight→sweep`). Audit pasca-migrasi: nol literal tersisa. Karakter gerak tiap ruang tetap berbeda — yang disatukan sumber angkanya, bukan rasanya. |
| **first-visit lifecycle-safe** | `useFirstVisit(key)` menggantikan fungsi yang memutasi state global saat render — penandaan kini terjadi pasca-commit lewat useEffect. |
| **Anti-replay seragam 7 ruang** | Animasi pembuka hanya pada kunjungan pertama seumur sesi; perpindahan halaman berikutnya fokus pada transisi ringan (screenSwap 0.24 dtk) dan micro-interaction. Perubahan data/periode tetap bermorf lewat animate — tidak memicu entrance ulang. |
| **Audit dua-engine (nol pelanggaran)** | Motion.dev = state UI; anime.js = orkestrasi momen. Keduanya tidak pernah menganimasi properti transform yang sama pada elemen yang sama; seluruh listener & instansi anime bersih di unmount. Kontrak didokumentasikan di `anime-kit.ts`. |
| **Premium CSS** | Token komposisi `--layout-content-max` (measure kanvas menulis 720px) dengan konsumen nyata; radius & type floor literal → token; layout grammar tujuh ruang dipertahankan (Jurnal tetap datar, ledger tetap ledger, garden tetap organik). |
| **Interaksi & a11y** | Skala tekan centang kebiasaan 0.92 (aksi tersering); audit a11y: dialog semantics, focus trap, focus-visible, disabled states, reduced-motion tiga lapis — fondasi sudah benar. |
| **Pembuktian mutu** | `bun run verify` hijau (typecheck + lint + 133 test). Browser E2E: 42/42 kombinasi lebar (320–1440px) × 7 layar tanpa overflow horizontal; CRUD kebiasaan & autosave Jurnal terverifikasi utuh; nol error halaman. |

## v2.27–v2.34 — Tujuh Ruang Kerja (disetujui, tidak diubah lagi)

Redesain per-halaman yang menjadi dasar v2.35 — lihat CHANGELOG.md untuk
ringkasan per gelombang: Daybook (Beranda), Performance Studio (Bugar),
The Vault (Keuangan), The Garden (Kebiasaan), The Observatory (Statistik),
Writing Room (Jurnal), Control Room (Profil).

## v2.18 — Pemulihan Histori Rutina 1.0, Tanpa Subkategori & Pintasan Template

Histori keuangan & kebiasaan Rutina 1.0 "tidak pernah terbaca" padahal sudah
tersimpan di Turso — akar masalahnya drift skema: v2.17 memakai kolom/tabel
baru di kode tetapi DDL-nya tidak pernah di-push ke Turso produksi, sehingga
endpoint transaksi/workout/state produksi 500. Kini dipulihkan lewat
auto-migrasi, subkategori dihapus (kategori saja cukup), dan template
lari/jalan dibuka sekali ketuk dari hero Bugar.

| Fitur | Rincian |
|---|---|
| **Auto-migrasi skema (`db-migrate.ts`)** | `ensureSchema()` — DDL idempoten (CREATE TABLE IF NOT EXISTS `rutina_fin_categories` + ALTER `distance`/`kcal` pada `rutina_workout_sessions`, dijaga PRAGMA) berjalan sekali per proses server pada `/api/state`, `/api/transactions`, `/api/workouts`. Deploy tanpa token `db:push-turso` tidak lagi merusak produksi — histori Rutina 1.0 (19 kebiasaan, 281 transaksi, 4 dompet) langsung terbaca lagi. |
| **Subkategori dihapus** | Kolom `subcat`/`parentKey` dihapus dari skema & seluruh UI (lembar transaksi, pemilih kategori, detail transaksi, lembar hari, anggaran). Pemilih kategori kini daftar flat: cari → sering dipakai → semua kategori → tambah baru. Rincian ("Sarapan", "Ojek Online") cukup di catatan transaksi. Klien lama yang masih mengirim `subcat` di-strip Zod di server. |
| **Pintasan template aktivitas** | Chip "Catat Lari / Jalan / Lari + Jalan / Badminton / Barbel" langsung di kartu Ringkasan Aktivitas — `openWorkoutSheet(seed?, hint?)` membuka lembar pada template yang dimaksud. Seed program barbel kini membuka mode Barbel otomatis. |
| **135 pengujian otomatis** | Registry kategori diuji ulang tanpa subkategori; skema wire menguji strip `subcat` & customCats flat; verifikasi E2E browser (chip lari → template lari terpilih, dropdown kategori → Kopi Rutina 1.0 terpilih, tanpa error konsol). |

## v2.17 — Bugar: Pusat Catatan Aktivitas & Keuangan: Satu Sistem Kategori

Bugar dikembangkan menjadi pusat catatan aktivitas & progres — bukan aplikasi
pelacak yang menyaingi smartwatch: hasil lari/jalan, badminton, dan barbel 5 kg
digabung dalam satu tempat. Keuangan menyatukan seluruh kategori (bawaan 2.0 +
impor 1.0 + buatan) tanpa penanda asal.

| Fitur | Rincian |
|---|---|
| **Empat jenis aktivitas** | Kind baru `lari-jalan` (kombinasi tetap SATU catatan, pace dari total waktu & jarak) dan `badminton` (durasi + kalori + chip kondisi Santai/Sedang/Intens — tanpa jarak/pace yang dipaksakan). Lembar "Catat Aktivitas" tiga mode dengan pace otomatis & kalori smartwatch opsional. |
| **Kalori dari smartwatch** | `WorkoutSession.kcal` opsional — angka jam tangan pengguna menang mutlak; tanpa itu estimasi MET dilabeli "taksiran". Rutina tidak mengklaim mengukur kalori sendiri. |
| **Ringkasan Aktivitas** | Hero pekan baru: lari & jalan (km), badminton (jam), latihan barbel (sesi), hari aktif — ditambah grafik Perkembangan Jarak (8 sesi kardio terakhir) dan detail lari berjangkar jarak (hero "Jarak tempuh" + durasi + pace + kalori). |
| **Riwayat Olahraga terfilter** | Filter jenis (Semua/Lari & Jalan/Badminton/Barbel) + rentang tanggal (30/90 hari/semua), bertahan saat berpindah layar; baris barbel menampilkan total repetisi + volume — kemajuan 5 kg terlihat dari repetisi/set, bukan hanya beban. |
| **Nama gerakan Indonesia** | 31 gerakan EX_LIB kini tampil "Angkat barbel ke arah dada (Barbell Curl)" — bahasa Indonesia utama, istilah Inggris keterangan kecil; pencarian pustaka mengenal keduanya. |
| **Satu sistem kategori** | Label "Dari Rutina 1.0" dihapus — kategori bawaan + impor 1.0 + buatan pengguna dalam SATU daftar. Kategori buatan (model `FinCategory`) bisa ditambah dari pemilih dengan validasi anti-duplikat, ikut sinkron cloud & anggaran. |
| **Dropdown kategori & subkategori** | Form transaksi kini menampilkan hanya kategori terpilih; pemilih (bottom sheet) berisi pencarian, kategori sering dipakai (frekuensi nyata), daftar bisa diluas, subkategori setelah induk dipilih, dan tombol tambah kategori. Subkategori tampil di mutasi, detail, dan lembar hari. |
| **138 pengujian otomatis** | +35 tes: invarian kategori terpadu & subkategori anti-tabrakan, `catMetaOf` fallback aman, jenis aktivitas + ringkasan + kalori smartwatch + filter riwayat + idName Indonesia, validasi wire v2.17. Terverifikasi E2E di browser (catat 3 jenis aktivitas, filter, dropdown, tambah kategori, sinkron cloud, responsif 390/1280px). |

## v2.16 — Deep Audit Menyeluruh (5 Agent Paralel) & Perbaikan Prioritas

Lima auditor paralel memeriksa seluruh basis kode (kualitas, keamanan,
performa & pertumbuhan data, a11y, integritas sinkronisasi); temuan
critical/major langsung diperbaiki dan diverifikasi ulang.

| Perbaikan | Rincian |
|---|---|
| **Data tak lagi bisa hilang diam-diam** | Demo seed tidak bisa menimpa dataset nyata di cloud; reset "Mulai bersih" dari perangkat lain tidak dihidupkan ulang perangkat lama; salinan transaksi berulang yang dihapus tidak lahir kembali (`materializeRecurring` kini memajukan ts templat); `exStatOf` mengambil set terakhir dari sesi TERBARU (bukan terlama). |
| **Keamanan** | `db/custom.db` (berisi data pribadi) di-untrack dari git; shared secret opsional `/api/*` (`x-sync-token`, `src/middleware.ts`); batas kunci `moodLogs`/`budgets`; header keamanan + CSP Report-Only; pesan error generik. |
| **Aksesibilitas** | Focus trap di Quick Action Hub (satu-satunya dialog tanpa pengurungan Tab — terverifikasi 5× Tab di browser); nominal transaksi & caption heatmap `aria-live`; input cari makanan ber-label; seksi lembar transaksi jadi `role="group"`. |
| **Performa** | Daftar Mutasi ponsel kini bertahap: 14 hari + "Muat lagi" (selaras ledger desktop); `bestStreak`/`netSaldo` Beranda memoized. |
| **114 pengujian otomatis** | +5 tes: anti-resurreksi berulang, urutan produksi `exStatOf`, batas kunci record. Strict TypeScript penuh (`noImplicitAny` dihapus) + seluruh `scripts/` ikut typecheck. |

Peta jalan besar hasil audit (pecah file raksasa, sinkronisasi incremental
per-slice, version counter lintas perangkat, code-split) terdokumentasi di
CHANGELOG v2.16.

## v2.15 — Logo “r Tunas” & Impor Kategori Keuangan dari Turso

Identitas visual baru yang sepenuhnya berbeda dari versi lama, dan kategori
keuangan asli Rutina 1.0 diimpor apa adanya — tidak lagi dilipat menjadi
kategori umum.

| Fitur | Rincian |
|---|---|
| **Logo baru “r tunas”** | Huruf **r** lowercase digambar satu goresan menerus (batang + bahu, tutup bundar jam-12) dengan satu **daun yang sengaja melayang** ±3px di ujung bahu — rutinitas (goresan) + pertumbuhan (tunas). Semua aset lahir dari satu sumber geometri `scripts/gen-icons.ts` (sharp): `logo.svg` (marka matcha transparan), `icon.svg` + PNG 512/192/180 (kotak sudut-bulat matcha, marka parchment), `maskable-512.png` (marka 46%, zona aman 80%). Palet flat earth tone — berbeda total dari logo lama (kotak gelap huruf-Z) dan ikon lama (gradien emerald + kecambah). Splash pembuka ikut memakai marka baru (digambar garis demi garis). |
| **Impor kategori keuangan dari Turso** | 24 kategori asli Rutina 1.0 kini jadi warga kelas satu di 2.0 — label & ejaan asli dipertahankan (“Cathering”, “Loundry”). Keluar (22): Kopi, Makanan Berat, Jajan, Cathering, Bensin, Parkir, Pajak Motor, Servis Motor, Loundry, Dating, Badminton, Tagihan & Utilitas, Tagihan Air, Tagihan Listrik, Pulsa & Paket Data, Skin Care, Potong Rambut, Hutang, Iuran Kas, Tak Terduga, Pendidikan, Lifestyle. Masuk (2): Investasi, Penghasilan. |
| **Pemilih dua tingkat** | Lembar transaksi: kisi ikon bawaan 2.0 seperti biasa, lalu seksi **“Dari Rutina 1.0”** dengan chip ringkas ikon+label — himpunan tetap berganti mengikuti Pengeluaran/Pemasukan. `scripts/import-rutina1.ts` kini memetakan kategori lama ke slug-nya sendiri (“Kopi”→kopi, bukan→“makan”), sehingga menjalankan ulang impor memulihkan nama asli transaksi lama. |
| **Anggaran impor 1.0** | `BUDGETABLE_CATS` +9 subkategori asli: Kopi, Makanan Berat, Jajan, Bensin, Parkir, Loundry, Tagihan Air, Tagihan Listrik, Pulsa & Paket Data — siap diatur dari chip “tambah anggaran” tab Anggaran. |
| **109 pengujian otomatis** | Suite baru `tests/cat-registry.test.ts` (11 tes): meta lengkap + label unik, daftar bebas duplikat, gabungan bawaan+impor, default tetap bawaan, BUDGETABLE ⊆ keluar, 24 slug impor terdaftar. Ikon lolos tiga putaran kritik visual VLM hingga vonis SHIP. |

## v2.14 — Sorotan Harian, Rekap Pekan & Navigasi Plus Tengah

Beranda kini selalu menunjukkan SATU hal paling relevan untuk hari itu, rekap
perjalanan pekan yang membuat pengguna ingin melihat perkembangan dirinya,
dan navigasi bawah dirancang ulang: tombol plus besar di tengah dengan empat
tab utama mengapit di kiri-kanan.

| Fitur | Rincian |
|---|---|
| **Sorotan Hari Ini** | Kartu pertama di Beranda — logika prioritas murni (`daily-highlight.ts`, teruji): streak ≥3 hari yang belum selesai hari ini → anggaran kategori terpakai ≥85% bulan ini → ≥3 hari tanpa latihan → tujuan tabungan terdanai ≥80% → bonus harian → rayakan hari sempurna → jadwal kosong → sambutan pengguna baru. Tiap sorotan membawa aksen warna modul asal, suar bernapas untuk yang mendesak, mini-visual (chip runtun, batang anggaran/tujuan, chip hari-tanpa-latihan), dan satu CTA langsung ke aksinya. |
| **Rekap Pekan** | Kartu perjalanan (`weekly-recap-card.tsx`) menggantikan "Insight pekan" (FocusWidget + StreakWidget) dan menyerap kartu stempel: strip perjalanan 7 hari Senin–Minggu bertema taman (kecambah menetas di hari beraktivitas, **mekar penuh** saat target harian tercapai, titik di hari kosong, lingkar putus untuk hari mendatang, hari ini disorot outline), headline "N misi selesai" + perbandingan jujur vs pekan lalu **pada rentang hari yang sama**, chip visual lintas modul (streak, latihan, XP, arus kas bersih), kalimat penutup naratif, dan pintu "Statistik". |
| **Navigasi plus di tengah** | Tab bawah dirancang ulang: **Beranda · Bugar · [＋] · Keuangan · Kebiasaan** — tombol plus besar (dock menonjol, halo bernapas, berputar 45° jadi silang saat terbuka) membuka Quick Action Hub: tambah kebiasaan, catatan, transaksi, latihan, asupan, check-in. FAB lama kini khusus desktop (lg+). Statistik turun dari deret tab — pintunya: tombol "Statistik" di Rekap Pekan + baris **Jelajahi** di hub. |
| **Jelajahi di Quick Action Hub** | Baris chip di bawah kisi enam aksi: Statistik · Jurnal · Profil — layar non-tab terjangkau satu ketuk tanpa mengetik; pencarian tetap menjangkau semua layar. |
| **Refleksi bisa diganti-ganti** | Tombol "Ganti" pada kartu Refleksi (`cycleQuote`) — kutipan bergilir (bank diperluas 10 → 16) dengan transisi lembut; offset hanya berlaku pada hari penggantian, hari baru kembali ke kutipan harian deterministik. "Simpan ke Jurnal" menyimpan kutipan yang sedang tampil (bukan selalu kutipan default). |
| **Visual, bukan sekadar angka** | Sorotan & rekap dirancang ikon-dulu: chip berwarna, batang progres, strip kecambah, panah tren — angka tetap ada sebagai tabular-nums kecil, bukan satu-satunya bahasa. |
| **97 pengujian otomatis** | Suite baru `tests/calc-highlight.test.ts` (22 tes): prioritas & ambang sorotan harian (termasuk keputusan onboarding: pengguna tanpa kebiasaan disambut dulu, bukan disuruh klaim bonus), rekap pekan (strip 7 hari, pembanding rentang-sama, transfer netral, pekan kosong), dan matematika kutipan bergilir (modulo, reset harian). |

Verifikasi browser (agent-browser): sorotan hari ini muncul & CTA berfungsi,
rekap pekan menampilkan strip perjalanan + chip, tombol plus tengah membuka
hub & enam aksi + Jelajahi berpindah layar, refleksi berganti dengan animasi,
navigasi 4-tab tetap menampilkan pil aksen — tanpa error konsol.

## v2.13 — Hardening & Review Frontend: Konfirmasi Hapus, UIPrefs, Beranda 3 Tingkat

Iterasi pengerasan kualitas dari review frontend eksternal + audit rekayasa:
aksi destruktif kini selalu berkonfirmasi, pemeriksaan tipe aktif saat build,
75 pengujian otomatis untuk perhitungan & sinkronisasi, dan Beranda
direorganisasi ke tiga tingkat informasi.

| Perbaikan | Rincian |
|---|---|
| **Konfirmasi hapus menyeluruh** | Sisa dua jalur hapus tanpa konfirmasi ditutup: entri jurnal makan (`FoodRow`) dan sesi latihan (`WorkoutRow`) kini memakai AlertDialog (pola sama dengan transaksi/catatan/kebiasaan) — mencegah salah ketuk pada data yang tidak dapat dikembalikan. |
| **TypeScript & ESLint aktif saat build** | `ignoreBuildErrors: false` + `ignoreDuringBuilds: false` di `next.config.ts` — error tipe/lint kini menggagalkan build (guardrail deploy). Skrip baru: `bun run typecheck`, `bun run test`, `bun run verify` (typecheck + lint + test berurutan). |
| **75 pengujian otomatis** | `tests/` — 4 suite bun-test: `calc-finance` (format Rupiah, arus kas bulanan, saldo dompet, transfer netral, deret grafik), `calc-fitness` (e1RM Epley, tonase, double progression, plateau/deload, pemuat piring IWF, kesiapan), `calc-store` (XP/level, streak sadar-jeda & grace, kartu stempel, util tanggal), `sync-schema` (snapshot valid + default, penolakan muatan sampah, pulang-pergi JSON, batas pertahanan). |
| **Beranda 3 tingkat informasi** | **(1) Hari ini:** hero progres + kalender + agenda. **(2) Perlu perhatian:** bonus harian dipindah tepat setelah agenda. **(3) Aktivitas tambahan:** arus kas & insight pekan, kartu stempel **terlipat** (ringkasan "X dari 7" di pemicu), pintu **Jurnal & Catatan** ringkas menggantikan kisi folder penuh, taman, refleksi. |
| **Navigasi: Profil & Jurnal selalu terjangkau** | Header Beranda kini punya tombol Jurnal (di samping avatar); Quick Action Hub menambah "Buka Profil & Pengaturan" — dari layar mana pun, tanpa menambah tab keenam. |
| **uiPrefs — preferensi lintas layar** | Tab Bugar, tab & periode grafik Keuangan, filter mutasi, dan periode Statistik disimpan di store (`uiPrefs`, dipersist lokal, TIDAK disinkronkan) — tidak lagi ter-reset saat berpindah tab karena AnimatePresence melepas komponen layar. |
| **Aksesibilitas grafik** | TonaseStrip `role="img"` → `role="group"` bernama (berisi 7 tombol interaktif); grafik kalori 7-hari mendapat grup + ringkasan sr-only (rata-rata vs target); FinChart mendapat ringkasan nonvisual total masuk/keluar/selisih. |
| **Statistik: pintasan & lipatan** | Chip navigasi seksi (Tren · Kalender · Laporan · Bugar · Piala) di kepala halaman; Laporan Bulanan & Piala dan Lencana kini dilipat default dengan ringkasan di pemicu — beban visual halaman pertama berkurang tanpa menghilangkan konten. |
| **Perbaikan responsif desktop** | Bug nyata dari audit visual: judul kebiasaan TaskRow terpotong ±24px di kisi 2-kolom desktop (chip shrink-0 menjepit). Kini grup pil menurun ke baris kedua saat kartu sempit (judul basis-36); kartu agenda melebar 12-kolom saat tile samping (nudge/coach) kosong — kolom mati hilang. Terverifikasi 320/390/768/1440px tanpa overflow. |
| **Performa data besar** | Mutasi merender 60 transaksi terbaru (muat bertahap +60), Jurnal 30 kartu (+30), Riwayat Bugar 15 sesi (+15) — daftar ribuan baris tidak lagi dirender sekaligus; derivasi berat tetap ter-memoisasi. |
| **Bahasa jujur** | Pemilih bahasa interaktif (English "segera") diganti info statis "Indonesia · aktif" — tidak ada kesan pengaturan yang belum benar-benar berfungsi. |

Verifikasi browser menyeluruh (agent-browser): navigasi Jurnal/Profil, persistensi
tab lintas layar, dialog hapus, pintasan seksi, lipatan, dan responsivitas
320–1440px — tanpa error konsol.

## v2.4 — Audit UI/UX Mobile: Nol Teks Terpotong

Sapuan audit menyeluruh di viewport ponsel **390px & 360px** (semua tab, layar
Jurnal/Profil, 6 sheet overlay, sesi latihan imersif, alat barbel, day-detail)
memakai deteksi DOM presisi (elemen terpotong = `scrollWidth > clientWidth`,
lulus-layar, dan overflow halaman) + verifikasi visual. 30+ temuan teks
terpotong diperbaiki hingga **0 tersisa** di kedua lebar layar.

| Perbaikan | Rincian |
|---|---|
| **Taman Pertumbuhan** | Kartu dilebarkan 136→156px (padding 3.5→3) dan judul kebiasaan kini `line-clamp-2` + `break-words` — "Review laporan mingguan" utuh 2 baris, subteks tahap ("Berbunga · Tahap akhir") tak lagi terpotong. |
| **Baris kebiasaan (TaskRow)** | Judul bebas melipat hingga 2 baris (sebelumnya `truncate` terjepit ±106px oleh pil streak + XP + chevron). Pil streak dipadatkan (ikon api + angka; satuan "hari" pindah ke `title` + `sr-only` demi aksesibilitas) sehingga judul mendapat ruang ±150px di 390px. |
| **Kartu Arus Kas (Beranda)** | Label metrik harian disingkat konsisten: Keluar / Masuk / Saldo (sebelumnya "Uang keluar"/"Pemasukan"/"Saldo bersih" terpotong di 360px). Catatan transaksi `line-clamp-2`, meta kategori `break-words`. |
| **Baris transaksi (Keuangan)** | Catatan (`line-clamp-2` + `min-w-0`) dan meta "Kategori · Dompet · Tanggal" kini melipat, bukan terpotong — "Makan & Minum · Tunai · 18 Nov" utuh di 360px. |
| **Baris anggaran (Keuangan)** | Restrukturisasi: label kategori mendapat baris penuh (badge Melebihi/Hampir batas di baris yang sama), nominal `terpakai / batas` pindah ke baris progres — "Makan & Minum" tak lagi terpotong di antara nominal. |
| **Grafik arus kas & peta panas** | Label bulan axis (fin-chart) dan penanda bulan heatmap pengeluaran memakai lebar konten (`w-max`) — "Agu"/"Nov" tidak terjepit kolom 18px. |
| **Bugar** | Baris rekor "Rekor e1RM: Back Squat ≈ 34,8 kg" dan meta program ("Pemula → Menengah · 3×/pekan · ±45 mnt") melipat 2 baris, bukan terpotong. |
| **Statistik** | "Runtun terbaik — {kebiasaan}" dan label metrik pekanan + "pekan lalu: …" kini `break-words` utuh. |
| **Kebiasaan** | Label kartu ringkasan "Runtun terpanjang" → "Runtun terbaik" (kata "TERPANJANG" 82px tak muat sel 77px pada grid-3 di 360px; konsisten dengan istilah di Statistik). |

Audit juga memastikan: navigasi bawah tetap 5 tab (Beranda, Bugar, Keuangan,
Kebiasaan, Statistik — tanpa Jurnal), layar Jurnal tetap terjangkau via
Quick Action Hub, container scroll tiap layar ber-`pb-28` sehingga konten akhir
tak tertutup FAB, tanpa error console, dan tanpa pergeseran tata letak.

## Gelombang migrasi Rutina lama → 2.0 (v2.1)

Audit menemukan 27 kelompok kapabilitas Rutina lama yang belum ada di 2.0.
Gelombang ini memulihkannya sesuai prioritas P0–P2, menyelaraskan tema
Premium Calm Productivity (matcha · warm sand · espresso) di frontend dan
backend.

### A. Habit Intelligence (P0)

| # | Fitur | Status |
|---|---|---|
| 1 | **Jeda Runtun Aman (Streak Freeze)** — maks. satu hari jeda per pekan, ditetapkan sebelum tanggalnya tiba, tidak bisa memulai streak baru; hari jeda transparan terhadap hitungan streak (`restDays`, `restDayError`, `habitStreak` sadar-jeda) | ✅ |
| 2 | **Susun Kebiasaan (Habit Stacking)** — pemicu `afterId` ("Setelah X, saya akan Y") + pemilih pemicu di editor + pil pemicu di baris tugas | ✅ |
| 3 | **Versi 2 Menit** — properti `mini` per kebiasaan + aksi "versi 2 menit" di baris tugas + editor | ✅ |
| 4 | **Nudge Jangan Bolong Dua Kali** — kartu pengingat hangat untuk kebiasaan yang terlewat kemarin (`missedYesterday`) | ✅ |
| 5 | **Goldilocks Nudge** — saran adaptif hasil pekanan: pekan sempurna → naikkan tantangan; capaian < 50% → perkecil target (`goldilocksOf`) | ✅ |
| 6 | **Taman Pertumbuhan** — lima tahap tanaman per kebiasaan (Benih → Tunas → Pohon Muda → Pohon Dewasa → Berbunga) dari total penyelesaian nyata; strip Taman di Beranda + tahap di detail kebiasaan (`plantStageOf`) | ✅ |
| 23/24 | **Suara Identitas & Semangat Hari Ini** — editor identitas personal di Profil + kutipan harian bergilir deterministik (`dailyQuote`, `identityText`) | ✅ |
| 25 | **Riwayat mood per tanggal** — `moodLogs` per ISO (menggantikan mood tunggal), strip 14 hari di Profil + tabel `rutina_mood_logs` | ✅ |

### B. Fitness Intelligence (P0–P1)

| # | Fitur | Status |
|---|---|---|
| 13 | **Kesiapan 4 komponen** — Tidur 30% · DOMS 30% · Stres 20% · Energi 20% (`readinessOf` v2 + rincian per komponen + ajakan melengkapi) | ✅ |
| 14 | **Double Progression otomatis** — semua set capai target → +2,5 kg; repetisi jauh tertinggal → −10%; saran Coach di dalam sesi latihan dengan tombol Terapkan | ✅ |
| 15 | **Deteksi Plateau & Deload** — stagnasi e1RM 3 sesi terakhir → rekomendasi deload 7 hari; target beban otomatis 50% selama deload; aksi akhiri deload | ✅ |
| 16 | **Guard latihan silang** — kardio ≥ 5 sesi/7 hari → saran variasi beban/mobilitas (`cardioGuard`) | ✅ |
| 17 | **Rest timer bersuara** — beep 3-2-1, chime, dan instruksi suara "Ayo, set berikutnya!" (WebAudio + SpeechSynthesis id-ID, dengan tombol bisu) | ✅ |
| 18–20 | **Alat Barbel** — Kalkulator Pemuat Piring (warna IWF), Kalkulator 1RM Epley + tabel 95–65%, Tangga Pemanasan bar–40–60–80% | ✅ |
| 21–22 | **Neraca kalori + coaching adaptif** — Sisa = Target + Terbakar − Masuk; kalori aktivitas mengikat jatah energi; pesan menyesuaikan defisit/surplus (termasuk peringatan defisit terlalu dalam) | ✅ |

### C. Life Analytics (P1–P2)

| # | Fitur | Status |
|---|---|---|
| 7 | **Kalender aktivitas lengkap** — grid bulanan + titik harian (kebiasaan/transaksi/latihan) + Detail Harian drill-down (kebiasaan, catatan, keuangan, aktivitas, tubuh & mood) | ✅ |
| 8 | **Laporan Bulanan** — konsistensi kebiasaan, 3 kategori pengeluaran teratas, penggunaan anggaran, refleksi identitas | ✅ |
| 9 | **Peta panas pengeluaran** — grid 12 pekan intensitas matcha→amber per tanggal | ✅ |
| 10 | **Temuan & Rekomendasi keuangan** — over-anggaran, kategori dominan, tren bulan-ke-bulan, transaksi berulang, surplus (bahasa observasi, tanpa klaim kausal) | ✅ |
| 11 | **Arus Kas Hari Ini di Beranda** — keluar/masuk/saldo bersih, top 3 kategori, transaksi hari ini dengan drill-down ke Keuangan | ✅ |
| 12 | **Pembanding pekan lengkap** — hari aktif, kebiasaan selesai, catatan, pengeluaran, latihan vs pekan lalu | ✅ |

### D. Alat pendukung (P2)

| # | Fitur | Status |
|---|---|---|
| 26 | **CSS Lab** — 17 efek CSS hidup dalam 6 kategori, pratinjau interaktif, pencarian, salin CSS (dari Papan Desain) | ✅ |
| 27 | **Offline shell PWA** — service worker `sw.js`: precache shell, network-first navigasi, stale-while-revalidate aset statis, API tidak pernah di-cache | ✅ |

### Pertahankan (lebih maju dari versi lama)

Quick Action Hub & pencarian universal · Global Check-in Sheet · Workout Session
imersif · Journal Writing Canvas · Finance Command Center · Desktop Sidebar &
Context Rail · komponen Rutina UI (shadcn) · motion tokens · sinkronisasi
cloud Turso + penyimpanan lokal.

## Perbaikan penting

- `punch-card.tsx`: animasi stempel 3-keyframe kini tween (Motion.dev hanya
  mendukung 2 keyframe untuk spring) — menghilangkan crash saat penyelesaian.
- Logika streak freeze: hari jeda transparan penuh terhadap hitungan (aturan
  "tidak memulai streak baru" dijaga di lapisan validasi penjadwalan).
- Migrasi persist v1 → v2: field baru kebiasaan/identitas/deload/moodLogs
  terisi otomatis untuk data lama pengguna.

## Arsitektur singkat

```
src/components/rutina-mobile/
  store.ts            — state domain Zustand (persist v2, skipHydration)
  habit-coach.ts      — habit intelligence murni (freeze, nudge, goldilocks, tanaman)
  sync-engine.ts      — offline-first ↔ /api/state (debounce push, server-menang)
  fitness/fit-utils.ts— coach kebugaran murni (kesiapan, progresi, plateau, alat barbel)
  finance/utils.ts    — helper keuangan murni (bulan, arus kas, peta panas)
src/lib/
  sync-schema.ts      — skema wire Zod (validasi PUT publik)
  sync-server.ts      — baca/tulis snapshot Turso (transaksi tunggal)
prisma/schema.prisma  — SQLite/Turso: Habit(+restDays/afterId/mini), BodyLog(+soreness/stress), MoodLog
public/sw.js          — service worker offline shell
```

Sinkronisasi skema ke Turso: `bun run db:push-turso` · Uji koneksi:
`bun run db:smoke-turso`.

## v2.2 — Tab Kebiasaan, Impor Data Rutina 1.0, PWA Install

| Perubahan | Rincian |
|---|---|
| **Tab Kebiasaan** | Tab Jurnal diganti Kebiasaan (ikon Sprout) di navigasi bawah & bilah sisi desktop. Layar baru `screens/kebiasaan.tsx`: ringkasan (runtun terpanjang, selesai pekan ini, tanaman dewasa), Saran Coach (nudge "jangan bolong dua kali" + Goldilocks), Agenda hari ini, Taman Pertumbuhan, semua kebiasaan per kategori + arsip, CTA "Kebiasaan baru". Layar Jurnal tetap hidup via Quick Action Hub (Cmd/Ctrl+K → "Buka Jurnal"). |
| **Impor data Rutina 1.0 dari Turso** | Akar masalah "data kebiasaan/keuangan tidak pernah ter-import": Rutina 2.0 hanya membaca tabel `rutina_*`, sementara data lama tersimpan di tabel lawas (`habits`, `habit_checkins`, `transactions`, `workspace_modules`) di database Turso yang sama. Skrip baru `bun run db:import-rutina1` (batch + retry, idempoten): 19 kebiasaan (Personal→Pribadi, Learning→Belajar, Health→Kesehatan; jadwal dari metadata), 73 check-in, 281 transaksi (kategori lama dipetakan ke FinCat 2.0 — `CAT_META` dipakai tanpa fallback), 4 dompet nyata + 279 transaksi ter-taut dompet, 3 tujuan tabungan, 2 templat transaksi berulang (bulanan), 21 mood + 21 body log (tidur/energi dari check-in; air ml→gelas & berat dari wellness). |
| **Tarik ulang dari cloud** | Tombol baru di Profil → Data & Penyimpanan: `forcePull()` di sync-engine menarik snapshot server secara paksa (server-menang, lewati negosiasi stempel waktu) — alat pemulihan setelah impor di sisi server. |
| **PWA Install** | Kartu "Aplikasi" baru di Profil: tombol Pasang (beforeinstallprompt — Chrome/Edge/Android), deteksi sudah-terpasang (display-mode standalone), dan panduan iOS (Bagikan → Tambahkan ke Layar Utama). Manifest + service worker offline shell sudah ada (`app/manifest.ts`, `public/sw.js`). |
| **Ketahanan env sandbox** | Kredensial Turso kini juga di `.env.local` (prioritas lebih tinggi dari `.env` yang bisa ditimpa ulang platform) — dev server selalu tersambung ke cloud yang benar. |

Menjalankan impor (sekali saja, aman diulang):

```bash
bun run db:import-rutina1   # baca tabel lawas → tulis rutina_* + re-stamp lastPushAt
```

## v2.3 — Earth-Tone Editorial Bento (Color System 2.0)

Sistem visual baru di atas fondasi yang ada (tanpa membongkar ulang): matcha tetap
identitas global, tiap modul mendapat warna domain sendiri, dan komposisi desktop
berubah dari tumpukan kartu menjadi bento grid + split-screen.

| Perubahan | Rincian |
|---|---|
| **Color System 2.0** | Empat warna domain di `globals.css` (lapisan semantic, lengkap dark mode): **Eucalyptus Teal** `#5F8A82` untuk Bugar, **Antique Bronze** `#AC8148` untuk Keuangan, **Dusty Mauve** `#8C7A91` untuk Jurnal, **Mineral Slate** `#71899A` untuk Statistik — masing-masing base/strong/soft/fg. Kontras strong-vs-soft 4,68–5,42:1 (WCAG AA). Token baru `--module-*` + utilitas `bg-module-*`; shadcn semantic (`--primary` dsb.) tidak tersentuh. |
| **Aksen kontekstual `module-accent`** | Cukup satu atribut `data-module="bugar\|finance\|journal\|stats"` pada akar layar — seluruh utilitas `bg-module-accent/15`, `text-module-accent-strong`, `bg-module-accent-soft` di dalamnya otomatis mengikuti warna domain layar itu (default matcha), terang & gelap. Warna status (success/warning/danger) tetap semantic — bronze tidak pernah berarti "pemasukan", eucalyptus tidak pernah menggantikan hijau berhasil. |
| **Bento Foundation** | Komponen baru: `rutina-bento.tsx` (`RutinaBentoGrid` 12-kolom xl / 6-kolom sm / 1-kolom ponsel + `RutinaBentoItem` span hero/feature/wide/medium/stat/compact/full), `rutina-hero.tsx` (`RutinaHero` — eyebrow/headline/visual/aksi/info-sekunder, gradasi per modul + `heroActionClass` tombol kaca), `rutina-module.tsx` (tipe + shell + peta kelas eksplisit). `RutinaCard` kini punya varian `hero`/`module`/`flat`; `RutinaMetric` punya slot ikon + ukuran `sm` (tile stat); `RutinaSectionHeader` punya `accent`. |
| **Beranda bento** | Desktop: hero progres (8 kolom) bersebelahan dengan kartu baru **"Insight hari ini"** (4 kolom — streak, misi pekan, saldo bersih); Agenda (8) + Pengingat & Saran Coach (4). Urutan ponsel dipertahankan. |
| **Kebiasaan split-screen** | Desktop: daftar "Semua kebiasaan" (7 kolom) + **Panel Detail Kebiasaan** sticky (5 kolom): identitas & kategori, streak, selesai pekan ini, versi 2 menit, habit stacking ("Setelah"), hari jeda, riwayat 30 hari (titik), tombol sunting. Klik baris atau buka lewat keyboard memilih kebiasaan; ponsel tetap satu kolom. |
| **Bugar & Keuangan** | `data-module` + aksen domain (tab aktif, chip ikon, eyebrow); bento hero latihan (8) + Coach Bugar (4); Peta Panas (8) + Temuan (4). Rutina Vault tetap hero espresso+emas (identitas merek); anggaran/saldo masuk-keluar tetap warna status. |
| **Statistik & Jurnal** | Statistik: aksen slate (titik seksi, tab periode, chip mood terpilih) + 4 pasangan bento (Ringkasan+Wawasan, Kalender+Laporan, Pembanding+Bugar&Tubuh, Piala+Streak). Jurnal: sentuhan mauve pada eyebrow, chip folder aktif, empty state — kanvas menulis tetap parchment terang. |
| **ContextRail adaptif** | Panel kanan desktop (xl+) kini berganti isi mengikuti layar aktif: Beranda/Profil/Jurnal = ringkasan pekan + berikutnya + tips; **Bugar** = kesiapan tubuh + rekor pribadi + hidrasi; **Keuangan** = ringkasan periode + anggaran + aktivitas terakhir; **Kebiasaan** = konsistensi + agenda + taman; **Statistik** = insight pekan + fokus. Ikon chip rail memakai peta eksplisit agar warna domain tetap benar di luar layarnya. |
| **Pintasan 1–6** | Pintasan keyboard desktop mengikuti urutan tab baru (4 = Kebiasaan, 5 = Statistik, 6 = Profil). |

Prinsip komposisi: ~70% permukaan netral parchment, 20% matcha, 10% aksen modul &
status; hero berwarna maksimal satu per layar; gradien hanya di hero; variasi
hierarki lewat ukuran tile, bukan warna kartu.

