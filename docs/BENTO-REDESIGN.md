# Unified Editorial Bento Grid — Audit & Rencana Redesign 7 Tab

> Tahap 1 (audit) dari master task. Prioritas: **CONSISTENCY > HIERARCHY > READABILITY > DECORATION**.
> Sumber layout utama: `RutinaBentoGrid` / `RutinaBentoItem` / `RutinaCard` (container-aware:
> <42rem → 2 kolom, ≥42rem → 6 kolom, ≥52rem → 12 kolom; jarak `--layout-grid-gap`).

## Matriks Audit (kondisi awal, v3.01)

| Tab | data-layout | Paradigma responsive saat ini | Bento saat ini | Kesenjangan |
|---|---|---|---|---|
| Beranda | `daybook` | **Viewport `lg:` 12-col** (sistem paralel — satu-satunya) | 1 grid (rekap+keuangan, raw className 7/5) | Migrasi ke container-query; hero+insight companion; vocabulary span; bento 2×2 mobile → RutinaBentoGrid |
| Kebiasaan | `garden` | Container `@[52rem]` + gate JS 832px | **NOL** | Ruang Konsistensi → bento; Perpustakaan split 7/5 → bento; coach = tile pendamping |
| Bugar | `performance` | Container | hero(8)+feature(4) ✓ | Workspace 7/5 → vocabulary; WeekActivity keluar dari hero jadi tile wide |
| Keuangan | `vault` | Container `@[52rem]` | 2 grid (hanya di Analisis) | Ringkasan: saldo hero + allowance feature; anggaran/tujuan medium+medium; KPI arus kas → stat tiles |
| Jurnal | `writing-room` | Kolom tunggal max 720px | **NOL** | Activity card → stat tiles + kalender medium + mood feature; ukuran baca daftar tetap nyaman |
| Statistik | `observatory` | Container + gate JS 832px | 3 grid, 6 item (paling bento) | Harmonisasi raw col-span (7/5, 4/8) ke vocabulary span |
| Profil | `control-room` | Viewport `lg:` split nav 168px | **NOL** | Stat akun → stat tiles; mood + sync → pairing medium/wide; form tetap list divide-y (bukan kartu per switch) |

## Keputusan desain global

1. **Container-query adalah sumber kebenaran** untuk sistem kisi di SEMUA tab (sesuai komentar
   rutina-bento.tsx: keputusan kisi diambil dari lebar ruang kerja nyata, bukan jendela).
   Ambang: `@[42rem]` (6 kolom) dan `@[52rem]` (12 kolom). Viewport `lg:` hanya tetap dipakai
   untuk pergantian komposisi ponsel↔desktop di Beranda (mengikuti chrome shell: BottomNav
   juga viewport-gated) dan nav kategori Profil.
   Efek samping diterima: pada jendela 1280–1407px (sidebar 240 + rail 288 + padding),
   kontainer ±688–815px → zona 6 kolom — sama seperti perilaku tab Keuangan/Statistik/Bugar
   hari ini. Konsistensi antar-tab lebih diprioritaskan.
2. **Vocabulary span** (`hero/feature/wide/medium/stat/compact/full`) dipakai via prop `span`;
   pengecualian proporsi khusus (mis. split 5/7 Beranda, 7/5 Perpustakaan) dinyatakan lewat
   `className` pada `RutinaBentoItem` dengan alasan tertulis di komentar.
3. **Bento bersarang memungkinkan** karena container-query selalu mengukur root `@container`
   (rutina-app). Grid bento di DALAM aside/tile sempit TIDAK boleh memakai span container-aware
   (kolomnya akan dihitung dari lebar root, bukan aside) — gunakan grid statis di dalam aside.
4. **70/20/10**: mayoritas tile `default`/`editorial`/`data` parchment + hairline; hierarki
   lewat UKURAN, aksen domain maks 1–2 tile per layar (`module`, `botanical`, `ledger`).
5. **Tidak ada tile seragam**: ritme asimetris hero+feature / wide+medium / stat×3–4.
6. Semua interaksi, sheet, dialog, filter, form, store, dan perhitungan DIPERTAHANKAN —
   ini murni redesign layout.

## Rencana per tab (komposisi target)

- **Beranda — Daily Almanac**: kepala penuh → bento [hero progres (hero/8) + Quick Insight (feature/4)]
  → split [rail modul sticky (5, custom) | lajur kerja DateStrip+agenda+Untuk Hari Ini (7, custom)]
  → bonus (full) → bento [rekap pekan (medium/6) + arus kas (medium/6)] → kebun (full) → refleksi (full).
  Ponsel: komposisi mockup tetap (hero foto, bento 2×2 via RutinaBentoGrid span stat, agenda, insight).
- **Kebiasaan — Growth Garden**: ruang Agenda tetap full (paper-surface planner) + Coach full.
  Ruang Konsistensi → bento [ringkasan konsistensi (hero/8) + metrik streak/progress (stat)] →
  viz utama (full) → matriks perbandingan (full). Perpustakaan → RutinaBentoGrid [ledger (7 custom)
  + panel detail sticky (5 custom)].
- **Bugar — Performance Studio**: bento [ringkasan pekan (hero/8) + coach (feature/4)] ✓ dipertahankan;
  WeekActivityCard + pintasan catat keluar dari hero → baris bento [aktivitas pekan (wide/8) +
  pintasan/CTA (feature/4)]; workspace → [program (wide/8) + papan rekor (feature/4)] +
  [pustaka (full)] + [neraca otot (full)].
- **Keuangan — Vault & Ledger**: Ringkasan → [saldo (hero/8) + allowance (feature/4)] →
  aktivitas terbaru (full/wide) → arus kas (full, KPI strip → stat tiles) →
  [anggaran (medium/6) + tujuan tabungan (medium/6)] → analisis (bento existing).
  Tab Mutasi/Anggaran/Dompet tetap.
- **Jurnal — Quiet Atelier**: ukuran baca 720px DIPERTAHANKAN (karakter atelier);
  kartu aktivitas menulis → dalam Collapsible: stat tiles (tulisan/kata/mood) +
  bento [kalender (medium) + mood wheel (feature)]; daftar catatan tetap full kolom.
- **Statistik — Life Observatory**: hero ringkasan pemain tetap; kalender+inspector 7/5 →
  vocabulary; fokus periode + grafik misi 4/8 → span feature+wide; Bugar & Tubuh → stat tiles.
- **Profil — Personal Control Room**: hero identitas tetap; [mood (medium) + sync (medium)]
  berdampingan di kontainer lega; preferensi/data/zona/bantuan tetap list divide-y dalam kartu
  full (bukan kartu per switch); statistik akun ringkas sebagai stat tiles bila datanya ada.

## Aturan QA

- Viewport: 320 / 360 / 390 / 768 / 1024 / 1280 / 1440; light + dark (reload dengan
  `localStorage.setItem('theme','dark')`).
- Cek: horizontal overflow, text clipping, tile overlap, nested scroll, focus ring,
  konsol bersih, interaksi inti per modul tetap berfungsi.
- Validasi: `bun run typecheck`, `bun run lint`, `bun test`, `bun run build`.

---

# LAPORAN IMPLEMENTASI — Unified Editorial Bento Grid (v3.02)

## 1. File dibuat
- `docs/BENTO-REDESIGN.md` — audit, keputusan desain, laporan ini.
- `docs/screenshots/bento-v3.02/` — 14 screenshot (7 tab × desktop-1440 + mobile-390).

## 2. File diubah (7 commit bertahap)
| Commit | File | Inti perubahan |
|---|---|---|
| `c6294ae` | docs/BENTO-REDESIGN.md | Audit + rencana (tahap 1) |
| `bf688b2` | home-mobile.tsx, screens/home.tsx | Beranda: kisi container-aware + hero bento 8+4 |
| `afa0a39` | screens/kebiasaan.tsx | Perpustakaan split → RutinaBentoGrid 7/5 |
| `c87a43d` | screens/bugar.tsx | Baris-2 medium+medium; workspace pita full |
| `a19f735` | screens/keuangan.tsx | Ringkasan: hero/feature/wide/medium/full penuh |
| `076a1ef` | screens/journal.tsx | Stat tiles 4 + pasangan viz/mood; hapus impor mati |
| `864e440` | screens/stats.tsx | Harmonisasi vocabulary span + kolom-yatim fix |
| `e40b788` | screens/profile.tsx | Stat tiles akun + relokasi & gating kartu sync |

## 3. Komposisi bento per tab — SEBELUM → SESUDAH
- **Beranda**: viewport lg: 12-col paralel; rekap 7 + keuangan 5 (raw) → **kisi container @[52rem]** (satu bahasa dgn 6 tab lain): hero progres **hero/8** + Quick Insight **feature/4** (pendamping baru desktop, komponen sama dgn ponsel) → split rail modul 5 / lajur kerja 7 (proporsi dipertahankan, ambang kini kontainer) → bonus **full** → rekap **medium** + arus kas **medium** (6+6 — nominal keuangan ruang setara) → kebun & refleksi **full**. Mobile: bento 2×2 kini `RutinaBentoGrid` span `stat` (dulu grid tangan gap-3; ≥52rem jadi 1 baris 4).
- **Kebiasaan**: nol bento → Perpustakaan split (kisi tangan v2.38) → **RutinaBentoGrid** [ledger full→7 + panel detail 5]; ruang Agenda/Konsistensi dipertahankan (sudah diaudit v2.57/v2.78: strip metrik editorial + pemilih viz — tidak dibongkar).
- **Bugar**: hero(8)+coach(4) ✓ dipertahankan; WeekActivityCard **keluar dari dalam hero** → pasangan **medium 6+6** [aktivitas pekan + papan rekor e1RM] (dulu hero ±900px mengangkangi coach ±400px); workspace Program/Pustaka/Neraca → pita **full** (pustaka mudah dicari).
- **Keuangan**: bento hanya di Analisis → seluruh tab Ringkasan: [**hero/8** saldo + **feature/4** aktivitas terbaru] → [**wide/8** arus kas + **feature/4** jatah harian] → [**medium/6** anggaran + **medium/6** tujuan] → **full/12** analisis (bento internal existing).
- **Jurnal**: nol bento, kartu aktivitas datar → dalam Collapsible: strip **4 stat tiles** (Tulisan/Kata/Streak/Suasana — RutinaMetric) + pasangan [viz kalender/kata **medium/6** + ringkasan folder-mood **feature/4**]; max-width baca 720px DIPERTAHANKAN.
- **Statistik**: raw col-span 7/5 & 4/8 → vocabulary: kalender **wide/8** + inspector **feature/4** (kondisional `full` tanpa inspector — kolom yatim dihapus), fokus periode **feature** + grafik misi **wide**; HabitFlower/lintas-domain medium ✓.
- **Profil**: nol bento → baris **4 stat tiles akun** (Kebiasaan/Catatan/Transaksi/XP) di bawah hero identitas; kartu sync direlokasi ke samping suasana & kini `lg:hidden` (desktop selalu punya sync di chrome: sidebar lg+ / rail xl+).

## 4. Komponen digunakan ulang
`RutinaBentoGrid`/`RutinaBentoItem` (semua tab), `RutinaMetric` (Jurnal & Profil — stat tiles), `RutinaCard` varian surface, `HomeQuickInsight` (ponsel + pendamping hero desktop), `WeekActivityCard`/`PapanRekor` (dipindah, bukan ditulis ulang), `HomeBentoSummary` (satu sumber 2 varian).

## 5. Perubahan visual & spacing
- Ambang kisi 12-kolom kini **container `@[52rem]`** di Beranda (dulu viewport lg) — konsisten dengan 6 tab lain; efek: zona 6-kolom pada jendela 1024–1119 & 1280–1407 (rail runtuh) — disengaja, terdokumentasi.
- Jarak antar-tile selalu token `--layout-grid-gap` (tidak lagi gap tangan).
- Ritme asimetris per tab: hero+feature → wide+feature / medium+medium → stat×n → full; tidak ada tile seragam.
- Proporsi 70/20/10 dijaga: mayoritas parchment hairline; aksen domain maks 1–2 tile (hero bugar teal, saldo espresso, fokus periode espresso, keuangan gold pill).

## 6. Fitur yang dipertahankan (semua)
Navigasi 7 tab + FAB; semua sheet/dialog/form/filter (tx, transfer, dompet, kategori, anggaran, goal, habit, workout, check-in, barbel, exercise detail); keep-alive subtab (bugar/keuangan/statistik/kebiasaan); DateStrip + planner + Untuk Hari Ini + mission trail + bonus + draft jurnal + quick insight + agenda; heatmap/viz picker; MutasiWorkspace resizable; backup/restore/force-pull; semua animasi fungsional; dark mode.

## 7. Dihapus (beserta alasan)
- Footer ringkasan kata mode 'kata' Jurnal (total/hari-aktif/rata²) — diserap stat tiles (anti-duplikasi).
- Duplikasi kartu sync inline Profil pada 1024–1279px — chrome sidebar sudah selalu menampilkannya.
- Impor `WordReveal` mati di journal.tsx.
- **Tidak ada fitur/aksi/data yang dihapus.**

## 8. Hasil validasi
- `bun run typecheck` ✓ · `bun run lint` ✓ · `bun test` **155/156** (1 gagal = kegagalan lama tergantung-tanggal `buildSeries minggu`, terverifikasi pra-ada pada baseline bersih v2.93; tidak menyentuh algoritma) · `bun run build` ✓ (4 rute, static prerender OK).
- Overflow horizontal: **0** pada 320/360/390/768/1024/1280/1440 × semua tab (dengan verifikasi layar aktif per langkah).
- Dark mode: 3 tab diperiksa VLM — terbaca; 2 catatan minor pre-existing (ring Bugar & tanggal-masa-depan kalender Statistik agak redup — warna internal komponen, di luar lingkup layout).
- Interaksi nyata diuji: buat kebiasaan ✓, toggle fokus + toast ✓, subtab keuangan ×4 ✓, sheet transaksi ✓, picker aktivitas bugar ✓, view statistik ×4 ✓, kanvas jurnal tulis+simpan ✓.

## 9. Screenshot
`docs/screenshots/bento-v3.02/` — `desktop-{tab}-1440.png` & `mobile-{tab}-390.png` (7 tab lengkap; mobile-profil memperlihatkan stat tiles 2×2).

## 10. Masalah belum terselesaikan
1. Uji tanggal-dependent `buildSeries minggu` (pre-existing, gagal pada tanggal tertentu).
2. Kontras minor dark mode: ring progres tile Bugar mobile & tanggal masa-depan MonthCalendar (pre-existing, warna internal).
3. Dev server sandbox sesekali mati sendiri (lingkungan, bukan aplikasi).
4. Kebiasaan ruang Konsistensi belum memakai kisi bento — keputusan sadar: komposisi v2.57/v2.78 sudah teraudit; bento paksaan akan menambah kotak tanpa nilai informasi.
