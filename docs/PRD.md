# PRD — Rutina: Halaman Preview Desain

## "Earth Tone × Split Screen × Bento Grid × Tipografi Editorial"

| | |
|---|---|
| **Produk** | Rutina — habit tracker & jurnal, mobile-first |
| **Dokumen** | Product Requirements Document — Konsistensi Desain |
| **Versi** | 2.0 |
| **Status** | Terimplementasi pada halaman preview (`/`) |
| **Tanggal** | 17 November 2026 |
| **Pemilik** | Tim Desain & Engineering Rutina |

> **Aturan pengiriman:** deliverable dipush ke repo **baru** [`anandategarch/rutina-2.0`](https://github.com/anandategarch/rutina-2.0) atas permintaan pemilik (17 Nov 2026). **Repo asli tetap tidak disentuh** — tidak ada `git push` maupun perubahan struktur pada repo rutina lama.

---

## 1. Ringkasan

Halaman preview Rutina adalah **etalase desain sekaligus aplikasi hidup**. Satu halaman memadukan empat pilar yang saling menguatkan:

1. **Earth Tone System** — palet 5 warna bumi dengan aturan 60–30–10 yang menenangkan.
2. **Split Screen** — komposisi dua panel setara: narasi merek di kiri, produk interaktif di kanan.
3. **Bento Grid** — dasbor modular dengan lebar kartu campuran (1 kolom / 2 kolom).
4. **Tipografi Editorial** — pasangan serif (Playfair Display) × sans (Geist) dengan skala tegas.

Pertanyaan kunci yang dijawab dokumen ini: *"Bisakah split screen, tipografi, dan bento grid diterapkan sekaligus di preview program ini?"* **Jawaban: bisa** — split screen menjadi komposisi macro (level halaman), bento grid menjadi struktur meso (level dasbor), dan tipografi menjadi karakter micro (level konten). Ketiganya tidak bertabrakan karena masing-masing bekerja pada lapisan berbeda.

---

## 2. Tujuan & Non-Tujuan

### 2.1 Tujuan

| # | Tujuan | Ukuran |
|---|---|---|
| G1 | Menyatukan 4 pilar desain dalam satu halaman yang konsisten | Review visual: nol anomali warna/spacing/radius |
| G2 | Preview interaktif penuh (bukan mockup statis) | Semua alur emas bisa dijalankan di browser |
| G3 | Mobile-first tetap utuh (390px) | Nol overflow horizontal, nol error console |
| G4 | Desain konsisten & terdokumentasi | Setiap keputusan visual bisa dilacak ke token di dokumen ini |

### 2.2 Non-Tujuan (Out of Scope)

- Backend / persistensi data (semua state bersifat demo di memori).
- Dark mode aplikasi (preview fokus light earth tone).
- Penulisan ke repo asli / deployment — **dilarang push** (pengecualian: repo preview baru `rutina-2.0` atas permintaan eksplisit pemilik).
- Pengujian otomatis (unit test) — verifikasi manual + browser.

---

## 3. Pengguna & Alur Emas

### 3.1 Persona

**Ananda (26)** — pekerja kreatif yang ingin membangun kebiasaan kecil tanpa merasa dihakimi. Butuh aplikasi yang *tenang dilihat, cepat dipakai*: centang kebiasaan, tulis catatan singkat, lihat progres mingguan.

### 3.2 Alur Emas (Golden Path)

| # | Alur | Hasil yang diharapkan |
|---|---|---|
| A1 | Membuka halaman | Split screen tampil; splash singkat lalu masuk Beranda |
| A2 | Mengetuk lingkaran centang tugas (atau geser kanan kartu) | Kartu berubah pistachio + strikethrough; persentase hero & progress bar ikut ter-animasi spring |
| A3 | Menyelesaikan semua tugas | Overlay confetti + toast "Semua tugas selesai" |
| A4 | Menekan "+ Catatan Baru" (hero), tombol + di kartu folder, atau tombol + di bottom nav | Sheet composer naik; catatan baru muncul di paling atas jurnal (masonry) |
| A5 | Menekan "Simpan ke Jurnal" pada kartu kutipan | Tombol berubah "Tersimpan", kutipan masuk jurnal |
| A6 | Menavigasi 4 tab (Beranda / Jurnal / Statistik / Profil) | Pil aktif meluncur (layout animation), konten crossfade |
| A7 | Menyematkan (pin) kartu jurnal, membaca catatan, menghapus | State tersinkron antar layar |
| A8 | Mengganti varian lewat sakelar pil (Bento / Gamified / Clean) | Pil aktif berwarna kanvas varian; konten ponsel crossfade; state tugas tetap tersinkron antar varian |
| A9 | Varian Gamified: menuntaskan misi & klaim bonus hingga XP ≥ 2.400 | Ring XP terisi penuh, level naik ke 8, konfeti + toast |

---

## 4. Empat Pilar Desain

### 4.1 Pilar 1 — Earth Tone System (rasa)

Palet bumi 5 token dengan aturan **60–30–10**:

| Token | Hex | Peran | Porsi |
|---|---|---|---|
| **Warm Sand** | `#F5F3EE` | Dasar aplikasi, latar netral | 60% |
| **Soft Pistachio** | `#E4EFE0` | Kartu sekunder, state selesai, info box | 30% |
| **Primary Matcha** | `#749B58` | CTA utama, state aktif, aksen data | 10% |
| **Espresso Brown** | `#4A3B32` | Ikon, kartu gelap, label uppercase | suportif |
| **Deep Espresso** | `#231F1E` | Teks utama | suportif |

Turunan yang diizinkan (opacity/blend dari token, bukan warna baru): `#EAE5D9` (sand gelap), `#FAF9F6` (off-white hangat), `#14100D` (bingkai ponsel), dan variasi `xx%` opacity untuk border (`#4A3B321F`) serta teks sekunder.

**Larangan:** tanpa indigo/biru; tanpa warna di luar token & turunannya; kontras teks utama minimal AA (≥ 4.5:1).

### 4.2 Pilar 2 — Split Screen (komposisi macro)

- **Desktop (≥ 1024px):** dua panel 50:50 dalam satu viewport tinggi (`h-dvh`), masing-masing scroll mandiri.
  - **Kiri — Panel Narasi:** kanvas putih untuk tipografi editorial; wordmark, tagline, bento prinsip, palet, spesimen.
  - **Kanan — Panel Produk:** kanvas sand dengan cahaya ambien; ponsel interaktif (bingkai `#14100D`, radius 3rem) + pill petunjuk.
- **Mobile (< 1024px):** panel kiri melipat (`display:none`), aplikasi mengisi layar penuh — perilaku native.
- **Split di dalam aplikasi:** kartu hero membagi diri secara implisit (sapaan di atas, angka besar + progress di bawah); widget insight berpasangan kiri-kanan.

### 4.3 Pilar 3 — Bento Grid (struktur meso)

Prinsip: **grid 2 kolom, kartu boleh melebar (span 2) atau setengah (span 1), tinggi mengikuti konten, rhythm vertikal konsisten (gap 12px, antar-seksi 32px).**

Peta bento — **Layar Beranda (mobile 390px):**

```
┌──────────────────────────────┐
│ 1  HERO SUMMARY       [span2]│  bg Matcha, radius 24
├──────────────────────────────┤
│ 2  FOKUS HARI INI     [span2]│  daftar TaskRow tipis
├───────────────┬──────────────┤
│ 3a Fokus Pekan│ 3b Streak    │  kartu 1+1 (putih / espresso)
│    14,5 jam   │  21 hari     │
├───────────────┴──────────────┤
│ 4  KOLEKSI            2×2    │  kartu folder persegi (span1×4)
├──────────────────────────────┤
│ 5  KUTIPAN            [span2]│  bg Espresso, serif italic
└──────────────────────────────┘
```

Peta bento — **Panel Kiri (desktop):**

```
┌─────────┬─────────┬─────────┐
│ 01 Split│ 02 Bento│ 03 Tipo │
├─────────┴─────────┼─────────┤
│ 04 Palet Warna [2] │ 05 Spec │
└───────────────────┴─────────┘   (lg: 2 kolom, xl: 3 kolom)
```

### 4.4 Pilar 4 — Tipografi Editorial (karakter micro)

| Peran | Font | Aturan |
|---|---|---|
| Wordmark, judul jurnal, kutipan, angka prinsip | **Playfair Display** (serif, italic untuk aksen) | Hanya untuk momen "editorial" — jangan untuk teks UI |
| Semua teks UI, angka statistik, label | **Geist** (sans) | Default `--font-sans` |
| Angka dinamis | Geist + `tabular-nums`, format `id-ID` (14,5) | Counter spring |

Skala (mobile):

| Level | Spesifikasi | Contoh |
|---|---|---|
| Display angka | 56px semibold, tracking -0.02em | persentase hero |
| Wordmark | 19px bold + titik matcha | "rutina." |
| Sapaan hero | 26px semibold | "Selamat pagi, Ananda" |
| H1 layar | 19px bold tracking-tight | "Statistik" |
| Eyebrow seksi | 13px bold uppercase tracking 0.16em espresso | "FOKUS HARI INI" |
| Label kartu | 10–11px bold uppercase tracking 0.14em | "FOKUS PEKAN" |
| Body | 13–15px medium | deskripsi tugas |
| Caption | 11–12px medium, espresso 70% | hint, meta |
| Serif konten | Playfair 17px italic | kutipan |
| Angka widget | 30–44px semibold tabular | "14,5", "21" |

---

## 5. Design Tokens Lengkap

### 5.1 Radius

| Token | Nilai | Pemakaian |
|---|---|---|
| Hero | 24px | kartu ringkasan utama |
| Kartu besar | 20px | folder, kutipan, kartu panel kiri |
| Kartu kecil | 16px | task row, widget, kartu jurnal |
| Kontrol | 12px / `rounded-xl` | tombol mood, elemen kecil |
| Pill | `rounded-full` | CTA, chip kategori, checkbox |

### 5.2 Spacing

- Padding kartu: 16px (kecil) / 20–24px (besar).
- Gap grid: 12px.
- Antar-seksi: 32px (`mt-8`).
- Padding layar: 16px kiri-kanan, `pb-28` bawah (ruang untuk nav).

### 5.3 Elevasi

| Level | Bayangan |
|---|---|
| Kartu idle | tanpa shadow, hanya border `#4A3B321F` |
| Hover kartu | `0 10px 24px rgba(74,59,50,0.10)` + angkat -3px |
| CTA hero | `0 8px 20px rgba(35,31,30,0.16)` |
| Bingkai ponsel | `0 60px 120px -40px rgba(35,31,30,0.5)` |

### 5.4 Motion

| Skenario | Spec |
|---|---|
| Entrance kartu | opacity 0→1, y +14–22 → 0; 450–550ms; ease `[0.22, 1, 0.36, 1]`; stagger 50ms |
| Progress bar / lebar | spring stiffness 130, damping 22 |
| Angka counter | spring stiffness 55, damping 16, format id-ID |
| Batang grafik (anime.js v4) | `scaleY 0→1`, `stagger(45–55ms)`, 700–850ms, ease `outBack(1.2–1.3)` |
| Pil navigasi | `layoutId`, spring 420/34 |
| Tekan (whileTap) | scale 0.97 (kartu) / 0.85 (checkbox) |
| Reduced motion | `MotionConfig reducedMotion="user"` — animasi transform dimatikan, perubahan state tetap instan |

---

## 6. Spesifikasi Komponen

### 6.1 Hero Summary (`home.tsx`)

- bg Matcha, radius 24, teks `#FAF9F6`, doodle dekoratif di latar.
- Anatomi: tanggal → sapaan serif-sans 26px → label → **angka 56px (Counter)** → meta → progress bar putih → CTA "+ Catatan Baru" (pill putih, teks deep espresso).
- State: persentase & bar bereaksi live terhadap centang tugas.

### 6.2 Task Row (`task-row.tsx`)

- Kartu tipis putih, radius 16; checkbox lingkaran 28px kiri; judul 15px; kanan: pill streak (Flame + "N hari", bg `#EAE5D9`) **atau** pill kategori (bg pistachio); chevron.
- Interaksi: geser kanan = selesai (isi pistachio terkuak), geser kiri = batal; ketuk = buka detail (deskripsi + riwayat 14 titik + aksi).
- State selesai: bg pistachio, judul strikethrough 45% opacity.

### 6.3 Focus Widget (`focus-widget.tsx`) — BARU

- Setengah kolom (span 1), putih, radius 16, border.
- Anatomi: label "FOKUS PEKAN" → angka **14,5** (Counter, 30px) + "jam" → 7 batang mini (maks 34px; hari ini Matcha, lainnya pistachio; label huruf pertama hari 9px).
- Motion: batang tumbuh via anime.js saat masuk viewport.

### 6.4 Streak Widget (`streak-widget.tsx`) — BARU

- Setengah kolom (span 1), **bg Espresso**, teks sand, radius 16.
- Anatomi: label "STREAK TERPANJANG" → angka dinamis (streak maksimum dari daftar tugas) + "hari" → judul kebiasaan → Flame dalam lingkaran Matcha.
- Kontras gelap memberi ritme bento bersama widget putih di sebelahnya.

### 6.5 Kartu Folder / Quick Capture (`home.tsx`)

- Persegi (aspect-square), bg pistachio, radius 20; ikon folder dalam lingkaran putih; tombol + kecil kanan-atas; nama + jumlah catatan di bawah.
- Ketuk = buka layar Jurnal ter-filter; tombol + = buka composer dengan folder aktif.

### 6.6 Kartu Kutipan / Reflection (`home.tsx`)

- bg Espresso, radius 20, teks sand; ikon Quote + eyebrow "REFLEKSI HARI INI"; kutipan **Playfair italic 17px**; atribusi; tombol outline "Simpan ke Jurnal" → state "Tersimpan" + note masuk jurnal.

### 6.7 Kartu Jurnal — masonry (`screens/journal.tsx`)

- 2 kolom masonry (CSS columns); judul **Playfair**; 2–3 baris ekserak sans; meta tanggal + tombol pin.
- Tiga varian bg deterministik (indeks, bukan `Math.random`); ketuk = baca (Reading Sheet).

### 6.8 Panel Kiri — BrandPanel (`src/components/showcase/brand-panel.tsx`) — BARU

- Hanya `lg:` ke atas; putih; konten max-w-xl; scroll mandiri.
- Anatomi: eyebrow "PRD — PRATINJAU DESAIN · V2.0" → wordmark **Playfair 64–72px** "rutina." (titik Matcha) → tagline Playfair italic → lead paragraph → grid bento 3 prinsip + palet + spesimen → hint mode satu layar → footer kecil.
- Kartu prinsip memuat **diagram mini** (split: dua panel kecil; bento: grid 2×2 berspan; tipografi: "Aa" serif × sans).

### 6.9 Pendukung

- **StatusBar**: jam live deterministik, indikator — kini menerima prop `tone` (`sand` / `espresso` / `matcha`) agar mengikuti kanvas varian; **BottomNav**: 4 tab + pil aktif layout animation; **ComposeSheet/ReadingSheet**: sheet bawah dengan drag handle; **Splash**: wordmark serif + reveal; **Celebration**: confeti saat semua tugas selesai — kini melepas diri sendiri (timeout 2,5 detik) sehingga diwarisi semua varian.

### 6.10 Penjelajah Varian Hero (Variant Explorer) — BARU

Sakelar pil di atas bingkai ponsel (alur normal `sm+`; mengambang & `fixed` di `max-sm:`) mengganti seluruh isi ponsel antar tiga varian desain. **Pil tab aktif sendiri mengambil warna kanvas varian** (Sand / Espresso / Matcha) — tab tidak selalu putih. Cahaya ambien panel kanan ikut bertransisi (`transition-colors` 700ms).

| # | Varian | Kanvas (pembalikan) | Anatomi | Interaksi kunci |
|---|---|---|---|---|
| 01 | **Bento Grid** (aplikasi penuh) | Warm Sand `#F5F3EE` | layar Beranda/Jurnal/Statistik/Profil + bottom nav (spesifikasi 6.1–6.8) | A1–A7 |
| 02 | **Gamified & Interactive Hero** | **Espresso `#4A3B32` jadi latar**; kartu Deep Espresso; aksen Matcha & `#A3C489` | header pemain (avatar, chip LV) → **ring XP SVG** (r 86, spring strokeDashoffset; Level + XP Counter) → daftar misi (chip +80 XP, pop "+80 XP" melayang) → kartu streak → 4 lencana (terbuka/terkunci) → bar bawah (XP live + Klaim +120) | centang misi → ring & XP bereaksi; semua misi + klaim → XP ≥ 2.400 → naik Level 8 + confeti; tap lencana → toast |
| 03 | **Clean Centered / Typography + Floating Widgets** | **Matcha `#749B58` jadi latar**; teks & serif `#FAF9F6`; kartu putih | wordmark → eyebrow tanggal → sapaan Playfair italic + nama → **angka persen serif 76px (Counter)** → 3 widget putih melayang (streak/fokus/jurnal; rotasi −5°…+4°, osilasi y 8px, spring masuk) → daftar tugas kartu putih → kutipan kartu garis transparan → CTA Espresso | centang tugas → persen bereaksi; widget melayang bisa diketuk (toast); Simpan ke Jurnal & Catatan Baru terhubung store |

Ketiga varian berbagi satu store Zustand (`useRutina`) — tugas yang dicentang di satu varian tetap tersinkron saat berpindah. Varian 02 & 03 adalah **konsep satu layar** (tanpa bottom nav) untuk eksplorasi arah desain; sheet composer, reader, dan overlay perayaan tetap tersedia di semua varian.

---

## 7. Aksesibilitas

- Semua kontrol ≥ 44px target sentuh (checkbox 28px visual dalam area kartu yang bisa ditekan lebih besar; tombol utama h-11).
- `role`/`aria-*`: checkbox (`aria-checked`), button + `aria-label` deskriptif, `aria-current` pada tab aktif, `aria-expanded` pada detail tugas, `role="img"` + `aria-label` pada grafik.
- Fokus keyboard: outline Matcha 2px offset 2px di semua interaksi.
- Grafik batang & ring membawa `aria-label` tekstual.
- `prefers-reduced-motion` dihormati via `MotionConfig`.

---

## 8. Tech Stack & Struktur File

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript strict |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Animasi | Motion (spring/layout) + anime.js v4 (bar chart) |
| State | Zustand (`useRutina`) |
| Toast | sonner |
| Font | next/font: Playfair Display + Geist |

```
src/
├─ app/
│  ├─ layout.tsx            # font, metadata, Toaster
│  └─ page.tsx              # split screen: BrandPanel + PreviewStage
├─ components/
│  ├─ showcase/
│  │  ├─ brand-panel.tsx    # panel kiri (tipografi + bento prinsip)
│  │  └─ preview-stage.tsx  # panel kanan: sakelar varian + panggung ponsel — BARU
│  └─ rutina-mobile/
│     ├─ rutina-app.tsx     # cangkang aplikasi (prop skipSplash)
│     ├─ status-bar.tsx     # prop tone: sand/espresso/matcha — DIPERLUAS
│     ├─ variants/          # — BARU
│     │  ├─ gamified-hero.tsx      # varian 02, kanvas Espresso
│     │  └─ clean-typography.tsx   # varian 03, kanvas Matcha
│     ├─ store.ts           # zustand + data demo deterministik
│     ├─ focus-widget.tsx   # widget bento fokus
│     ├─ streak-widget.tsx  # widget bento streak
│     ├─ screens/           # beranda, jurnal, statistik, profil
│     └─ ...                # task-row, bottom-nav, sheet, dsb.
docs/
└─ PRD.md                   # dokumen ini
```

---

## 9. Definition of Done

- [ ] `bun run lint` bersih tanpa peringatan baru.
- [ ] Desktop 1440px: split screen 50:50; kedua panel scroll mandiri; ponsel interaktif penuh.
- [ ] 390px: panel kiri hilang; aplikasi full-bleed; **nol** overflow horizontal; **nol** error console.
- [ ] Semua alur emas A1–A9 berjalan (centang → progress, catatan baru → jurnal, kutipan tersimpan, navigasi tab, pin, ganti varian, naik level di varian Gamified).
- [ ] Sakelar varian: pil aktif berwarna kanvas (Sand/Espresso/Matcha); transisi crossfade 280ms; splash hanya sekali; state tugas sinkron antar varian.
- [ ] Batang anime.js tumbuh saat terlihat; angka counter spring; confetti saat 100%.
- [ ] Kontras teks utama AA; semua interaksi ada focus ring.
- [ ] Data demo deterministik (tanpa `Math.random`), aman SSR/hydration.
- [ ] Tanpa emoji; ikon hanya dari lucide-react.
- [ ] Footer/nav bawah menempel bawah viewport saat konten pendek, terdorong alami saat panjang.
- [ ] Review visual VLM di 2 viewport: tidak ada inkonsistensi token.
- [ ] **Tidak ada `git push`.**

---

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Split screen memakan ruang di layar pendek | Panel scroll mandiri + ponsel `h-[min(840px,calc(100dvh-235px))]` (mengompensasi sakelar varian + caption) |
| Hydration mismatch (tanggal/jam) | `useSyncExternalStore` dengan snapshot server kosong |
| MotionValue sebagai child React (crash) | Selalu lewat `<Counter>` / state string |
| anime.js v4 API berbeda (ease, cleanup) | ease string id; `anim.revert()` di cleanup; tanpa `setDashoffset` |
| Kebiasaan lama: emoji & biru default | Checklist review; hanya lucide + 5 token earth tone |

---

## Lampiran A — Aturan Teknis Wajib

1. **MotionValue bukan child React** — render lewat komponen `<Counter>` atau `useMotionValueEvent` → state string.
2. **anime.js v4**: `ease` adalah string id (`'outBack(1.3)'`); tidak ada `utils.setDashoffset` (hitung `getTotalLength()` manual bila perlu); cleanup dengan `.revert()`.
3. **Dilarang `Math.random()`** dalam render (SSR hydration) — pakai formula indeks deterministik, mis. `((i * 17 + 3) % 3) + 1`.
4. **Tanpa emoji** — ikon hanya `lucide-react`.
5. **Tailwind v4**: border harus eksplisit warnanya (`border-[#4A3B321F]`), jangan andalkan default.
6. Target sentuh ≥ 44px; teks utama kontras AA.
7. Aplikasi hanya di route `/`; tidak menambah route lain.

## Lampiran B — Checklist Verifikasi Manual

1. Buka preview → splash → Beranda; periksa split screen & bento panel kiri.
2. Centang "Review laporan mingguan" → persentase hero naik (33% → 50%), bar memanjang spring.
3. Geser kiri kartu selesai → batal; kartu kembali putih.
4. Selesaikan semua 6 tugas → confetti + toast.
5. "+ Catatan Baru" → tulis judul & isi → Simpan → buka tab Jurnal → catatan di paling atas.
6. Kartu kutipan → "Simpan ke Jurnal" → tombol "Tersimpan".
7. Tab Statistik → batang fokus tumbuh stagger; mood bisa dipilih.
8. Kecilkan ke 390px → pastikan tanpa scroll horizontal & panel kiri hilang.
