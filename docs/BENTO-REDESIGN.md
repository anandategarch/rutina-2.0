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
