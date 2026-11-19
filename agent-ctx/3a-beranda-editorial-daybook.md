# Task 3-a — Beranda "Editorial Daybook" (Layout Grammar upgrade)

Agent: 3-a (Beranda Editorial Daybook)
Date: 2026-11-19
Scope: HANYA `src/components/rutina-mobile/screens/home.tsx` (1328 → 1372 lines). Tidak menyentuh globals.css, plant-garden.tsx, plant-glyph.tsx, store.ts, rutina-*.tsx foundation, atau screen lain. Tidak membuat file komponen baru (semua inline).

Status: DONE — `bun run lint` exit 0 (zero errors/warnings), `bunx tsc --noEmit` exit 0.

## Foundation APIs yang dikonsumsi (verifikasi terhadap globals.css)

- `[data-module='home']` → `--module-accent: matcha`, `--module-accent-soft: mist` (dipakai paper-surface/garden-surface/agenda-rail).
- `[data-layout='daybook']` → `--layout-gap: 1.75rem`, `--layout-hero-radius: 1.75rem`.
- `@utility paper-surface` (bg gradient + `border-inline-start: 2px solid var(--module-accent)`), `@utility garden-surface` (radial mist), `@utility agenda-rail` (rel vertikal + titik aksen via ::before/::after).

## Semua perubahan (line refs = file final)

### 1. Identitas & ritme tata letak (root)

| # | Lokasi | Perubahan |
|---|--------|-----------|
| 1 | Root div (557-566) | + `data-module="home"` + `data-layout="daybook"`; className + `[&>*+*]:mt-[var(--layout-gap)]` — tumpukan utama kini berjarak token daybook (1.75rem), BUKAN mt-* campuran per-seksi. |
| 2 | Doc comment layar (377-382) | "Pusat Kendali Harian" → "Editorial Daybook" + deskripsi karakter. |
| 3 | Grid-1 wrapper m.div (610-618) | `className="mt-4"` DIHAPUS (stack rule yang memberi jarak). |
| 4 | DateStrip root (287) | `mt-5` DIHAPUS (stack rule; DateStrip komponen lokal file ini). |
| 5 | Agenda section (773) | `className="mt-6"` DIHAPUS (flush di atas grid-2). |
| 6 | Bonus m.section (1175-1180) | `className="mt-6"` DIHAPUS. |
| 7 | PunchCard (1238-1239) | wrapper `div.mt-5` DIHAPUS → `<PunchCard />` jadi anak langsung stack; `mt-3` internalnya tertimpa aturan stack (spesifisitas (0,1,2) > (0,1,0)). |
| 8 | Koleksi section (1242) | `mt-8` DIHAPUS. |
| 9 | Quote m.section (1333) | `mt-8` DIHAPUS (kelas lain tetap). |

Mekanisme: `.\[\&\>\*\+\*\]\:mt-\[var\(--layout-gap\)\] { &>*+* { margin-top: var(--layout-gap) } }` — nested selector = spesifisitas (0,1,2), menimpa `.mt-8` HomeFinanceCard & `.mt-3` PunchCard secara deterministik TANPA mengedit file asing. Diverifikasi di CSS terkompilasi (bukti di bawah).

### 2. Timeline Agenda (signature change)

- **Kartu kertas** (781): seluruh konten agenda (pita konteks → rel → lipatan Selesai → tombol tambah → arsip) dibungkus `<div className="paper-surface mt-4 rounded-2xl border-y border-e p-4 shadow-soft sm:p-6">` — paper-surface memberi garis margin kiri 2px matcha + sapuan mist; `border-y border-e` menambal hairline tiga sisi lain TANPA konflik cascade (sisi berbeda; warna dari base `* { border-color: var(--border) }`). Audit lama salah duga agenda dibungkus RutinaCard — kenyataannya polos, jadi wrapper kertas ini baru. Header seksi ("Agenda hari ini") tetap DI ATAS kartu (pola header→card seperti HomeFinanceCard).
- **Rel per kelompok waktu** (825-881): tiap grup Pagi/Siang/Malam/Kapan saja dibungkus `<div className="agenda-rail">` berisi label (ikon Sunrise/Sun/Sunset/Clock + h3 uppercase + chip jumlah, tetap) + grid TaskRow `grid-cols-1 sm:grid-cols-2` (2 TaskRow berdampingan di sm+ tetap). Kontainer grup `mt-4 space-y-5` → `space-y-5`; `mt-4` pita konteks → hapus (jadi anak pertama kartu); wrapper `div.mt-4` empty-state → hapus.
- AnimatePresence lipatan "Selesai", semua prop TaskRow, tombol tambah (mt-5), arsip (mt-4) — tak tersentuh perilakunya; hanya re-indent +2 spasi.

### 3. Dua tipe permukaan (garden-surface)

- **Hero progres** (631-639): RutinaCard className → `garden-surface h-full rounded-[var(--layout-hero-radius)] shadow-soft`. Konflik bg NOL: `bg-surface-primary` (variant) dan garden-surface sama-sama menulis warna `var(--surface-primary)`; gradien (background-image) selamat dari urutan cascade. Radius 2xl→28px via token, twMerge menimpa prop radius.
- **Insight hari ini** (717-722): companion card di baris hero ikut `rounded-[var(--layout-hero-radius)]` agar radius baris konsisten.
- **PlantGarden** (1316-1324): dibungkus `<div className="garden-surface rounded-2xl border border-border-default p-4 shadow-soft sm:p-6 [&>section]:mt-0">` — `[&>section]:mt-0` menetralkan `mt-8` internal PlantGarden (spesifisitas (0,1,1) > (0,1,0)); plant-garden.tsx TIDAK diedit. Wrapper hanya dirender `{hasActiveHabits && ...}` (426: `habits.some(h => !h.archived)`) supaya tidak ada kotak garden kosong saat PlantGarden null.

### 4. Kolom sempit grid-2 (nudge + coach)

- RutinaBentoItem feature (1038-1041): `className="mt-6 xl:mt-0 [&>section+section]:mt-6"`. `mt-6 xl:mt-0` = jarak dari agenda HANYA di bawah xl (ponsel/tablet 2.5rem seperti semula: gap-4 + mt-6); di xl tepi atas kolom sejajar agenda. `[&>section+section]:mt-6` = jarak antar-seksi kolom (nudge→coach 1.5rem, sama seperti semula) dan otomatis TIDAK memberi margin saat coach jadi seksi pertama (edge case coach-only kini rapi di xl & mobile).
- `className="mt-6"` pada m.section nudge (1050) & coach (1105) DIHAPUS.

### 5. Baris bento 5+7 desktop: Arus kas + Insight pekan

- Struktur baru (1149-1172): `RutinaBentoGrid` (pola sama: `grid-cols-1 gap-4 sm:grid-cols-6 xl:grid-cols-12`) sebagai anak langsung stack:
  - `RutinaBentoItem className="sm:col-span-6 xl:col-span-5 [&>section]:mt-0"` → `<HomeFinanceCard />` (`[&>section]:mt-0` menetralkan mt-8 internalnya agar tepi atas baris sejajar di xl & ritme mobile konsisten gap-4).
  - `RutinaBentoItem className="sm:col-span-6 xl:col-span-7"` → section "Insight pekan" (mt-8 dihapus; FocusWidget + StreakWidget dalam `sm:grid-cols-2` tetap).
- **Bonus harian dipindah SETELAH baris** (urutan mobile final: agenda → pengingat → coach → finance → insight pekan → bonus → punch). Alasan: hanya bonus yang bergeser satu slot; "coach → finance" & "finance → insight pekan" tetap bersebelahan persis seperti sebelumnya; bonus jadi pemisah halus antara zona bento dan zona lebar-penuh (punch/koleksi/garden/quote — keempatnya tetap setelah baris sesuai spec).

## Urutan seksi final (atas → bawah)

1. DemoBanner + header (scroll-shrink, useScroll — tetap)
2. Grid-1: [hero garden-surface 8] Progres · [feature 4] Insight hari ini
3. DateStrip (sticky)
4. Grid-2: [wide 8] Agenda paper timeline · [feature 4] pengingat + coach
5. Baris bento: [5] Arus kas hari ini · [7] Insight pekan
6. Bonus harian → 7. PunchCard → 8. Koleksi → 9. PlantGarden (garden-surface wrapper) → 10. Refleksi

## Outline DOM timeline agenda (final)

```
section[aria-label="Agenda hari ini"]
├─ RutinaSectionHeader ("Agenda hari ini" | "Agenda")
└─ div.paper-surface.mt-4.rounded-2xl.border-y.border-e.p-4.shadow-soft.sm:p-6
   ├─ (kondisional) div pita konteks tanggal lampau/masa depan (mb-3)
   ├─ [dayHabits kosong] RutinaEmptyState + tombol "Tambah kebiasaan"
   └─ [ada misi]
      ├─ div.space-y-5
      │  └─ m.div (entrance fade per grup, delay gi*0.06)
      │     └─ div.agenda-rail                ← ::before hairline vertikal + ::after titik matcha
      │        ├─ div label: g.icon + h3 uppercase "Pagi|Siang|Malam|Kapan saja" + chip jumlah
      │        └─ div.grid.grid-cols-1.gap-2.5.sm:grid-cols-2 → TaskRow×N
      ├─ (doneHabits>0) lipatan "Selesai" button + AnimatePresence → m.div#agenda-done-panel → grid TaskRow done
      ├─ button dashed "Tambah kebiasaan" (mt-5)
      └─ (arsip>0) lipatan Arsip + daftar pulihkan/sunting (mt-4)
```

## Verifikasi cascade (compile Tailwind mandiri via @tailwindcss/postcss, 240KB CSS)

- `.\[\&\>\*\+\*\]\:mt-\[var\(--layout-gap\)\] { &>*+* { margin-top: var(--layout-gap) } }` ✓ (bukan :where — spesifisitas (0,1,2), menimpa .mt-8/.mt-3 anak langsung).
- `.\[\&\>section\]\:mt-0 { &>section { margin-top: 0 } }` ✓ dan `.\[\&\>section\+section\]\:mt-6` ✓.
- `.paper-surface { background: linear-gradient(90deg,...), var(--surface-primary); border-inline-start: 2px solid var(--module-accent) }` ✓ — tidak bertabrakan dengan `.border-y`/`.border-e` (border-block-width / border-inline-end-width — sisi properti berbeda).
- `.garden-surface`, `.agenda-rail` (dengan ::before/::after), `.rounded-\[var\(--layout-hero-radius\)\]` ✓ tergenerate.
- `@layer base` kedua berisi `* { border-color: var(--border) }` → hairline border-y/border-e berwarna token default; utilities-layer paper-surface menang untuk warna sisi kiri (layer base < utilities).
- Preflight `border: 0 solid` → border-y/border-e tampil solid.

## Lint / typecheck / dev server

- `bun run lint` → exit 0, zero errors/warnings.
- `bunx tsc --noEmit` → exit 0.
- dev.log: hanya baris `✓ Compiled` + `GET / 200` (termasuk render sukses SETELAH edit, compile 213ms) — tidak ada error. Catatan: proses dev server (dikelola sistem eksternal, port 3000) sedang tidak aktif saat verifikasi akhir (connection refused); TIDAK saya jalankan ulang sesuai instruksi — verifikasi CSS dilakukan lewat kompilasi Tailwind mandiri di atas, bukan lewat server.

## Catatan untuk agen lain

- Beranda = konsumen pertama `paper-surface` + `agenda-rail` + `[&>*+*]:mt-[var(--layout-gap)]` + `[&>section]:mt-0` (pola netralisasi mt-* komponen asing tanpa mengedit filenya — spesifisitas arbitrary child-variant selalu (0,1,1)/(0,1,2) > utility tunggal (0,1,0)).
- Token `--layout-hero-radius` kini benar-benar dikonsumsi (hero + companion row-1); agen layar lain bisa meniru: `rounded-[var(--layout-hero-radius)]` di className RutinaCard (twMerge menimpa prop radius).
- Bonus harian kini SETELAH baris finance+insight pekan (bergeser satu slot dari posisi lama) — jika ada agen yang mengubah urutan mobile Beranda, ikuti urutan final di atas.
