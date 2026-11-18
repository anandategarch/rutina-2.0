# Task 3-c — Bugar + Keuangan: Module Identity & Desktop Bento

Subagent: 3-c (Bugar + Keuangan Module Identity & Bento). Status: DONE — `bun run lint` exit 0, `bunx tsc --noEmit` exit 0 (baseline sebelum edit juga 0; tidak ada error baru).

Scope: HANYA `src/components/rutina-mobile/screens/bugar.tsx` dan `src/components/rutina-mobile/screens/keuangan.tsx`. Tidak menyentuh globals.css, rutina-*.tsx, store.ts, workout-session, sheets, atau komponen lain.

---

## 1. BUGAR (bugar.tsx)

### Identitas modul (data-module="bugar" → utilitas kontekstual eucalyptus)

| # | Lokasi | Sebelum | Sesudah |
|---|--------|---------|---------|
| 1 | Akar layar (div terluar) | — | `data-module="bugar"` (className tetap) |
| 2 | Eyebrow header "Gerak & kekuatan" | `text-success` | `text-module-accent-strong` |
| 3 | Pil AKTIF sub-tab "Bagian Bugar" (Latihan/Asupan/Tubuh) | netral `data-[state=active]:bg-surface-primary text-content-primary` (default rutina-tabs) | `data-[state=active]:bg-module-accent/15 data-[state=active]:text-module-accent-strong` via className trigger (twMerge menimpa; `shadow-soft` tetap) |
| 4 | Hero "Ringkasan latihan pekan ini" — latar | `bg-primary text-primary-foreground` (matcha = identitas default, salah modul) | `bg-module-accent text-module-accent-fg` (eucalyptus; otomatis terbalik di dark: teal muda + teks espresso) |
| 5 | Label dalam hero (8 kemunculan) | `text-primary-foreground/80` ×3, `/75` ×4, `/70` ×1 | `text-module-accent-fg/80 · /75 · /70` |
| 6 | Header seksi "Coach Bugar" | tanpa `accent` | `accent` → eyebrow "Saran latihan" + titik kini eucalyptus (`text-module-accent-strong` / `bg-module-accent`) |
| 7 | Chip ikon "Kesiapan latihan" (Sparkles) | `bg-secondary text-success` | `bg-module-accent/15 text-module-accent-strong` |
| 8 | Chip ikon "Alat Barbel" (Calculator) | `bg-secondary text-success` | `bg-module-accent/15 text-module-accent-strong` |

Total: ~17 perubahan kelas mentah / 8 grup logis (mayoritas rename mekanis fg di dalam hero — satu perubahan konseptual). Justifikasi #3: sub-tab bar DALAM layar adalah navigasi lingkup modul (governance menyebut "active tab states" sebagai spot identitas), bukan bottom-nav global — bottom-nav & pola netral layar non-modul tidak berubah.

**Sengaja TIDAK diubah (semantik/identitas lain):** kartu deload/plateau/guard (warning/gold), chip "Langkah"/"Progresi"/badge set `text-success`, chip beban-vs-kardio di WorkoutRow (`bg-secondary text-success` / `bg-destructive/10`), chip Dumbbell ProgramCard (h-11, generik), Papan Rekor (gold peringkat), chip PR dalam hero (`bg-espresso/35` + trofi `text-pistachio` — scrim translusen bekerja di atas teal; highlight rekor dipertahankan), tombol aksi `bg-primary`/`bg-surface-inverse` (interaksi utama), `shadow-leaf` hero.

### Bento desktop (xl+)

Struktur baru (urutan DOM DIPERTAHANKAN: hero → CTA → Coach):

```
m.div (entrance: opacity 0→1, y 14→0, duration.enter, delay 0.05, easing standard, mt-4)
└ RutinaBentoGrid
  ├ RutinaBentoItem span="hero"    → m.section hero "Ringkasan latihan pekan ini"
  │                                   + tombol "Mulai Sesi Latihan" + "Catat manual"
  └ RutinaBentoItem span="feature" → section "Coach Bugar" (mt-7 dihapus, gap grid)
```

- Coach Bugar TIDAK langsung setelah hero (blok CTA "Mulai Sesi Latihan"/"Catat manual" di antaranya) → CTA dimasukkan ke item hero sehingga hero(8)+CTA berdampingan Coach(4) di xl TANPA mengubah urutan DOM; di bawah xl tetap bertumpuk persis urutan lama. `mt-4` hero dipindah ke wrapper grid.
- Semua animasi m.* anak (hero y22, tombol, kartu coach) dipertahankan; wrapper baru dapat entrance halus sesuai spesifikasi (delay 0.05).
- Seksi setelahnya (Program Latihan, Riwayat, Papan Rekor, Pustaka Gerakan) dibiarkan full-width bertumpuk.
- WorkoutSessionOverlay / SessionPickerSheet / BarbellToolsSheet TIDAK disentuh.

---

## 2. KEUANGAN (keuangan.tsx)

### Identitas modul (data-module="finance" → utilitas kontekstual antique bronze)

| # | Lokasi | Sebelum | Sesudah |
|---|--------|---------|---------|
| 1 | Akar layar | — | `data-module="finance"` |
| 2 | Pil AKTIF sub-tab "Bagian Keuangan" (Ringkasan/Mutasi/Anggaran/Dompet) | netral `data-[state=active]:bg-surface-primary text-content-primary` | `data-[state=active]:bg-module-accent/15 data-[state=active]:text-module-accent-strong` via className trigger — `../rutina-tabs.tsx` TIDAK dimodifikasi; override lewat cn/twMerge (diverifikasi skrip node: bg/text lama terhapus, `shadow-soft` bertahan) |
| 3 | Badge "Berulang" di TxRow | `bg-primary/15 text-success` | `bg-module-accent/15 text-module-accent-strong` (chip fitur keuangan — bukan warna pemasukan/status) |
| 4 | Chip ikon dompet (tab Dompet) | `bg-gold/20 text-warning` | `bg-module-accent/15 text-module-accent-strong` (chip identitas; emas=transfer dipertahankan di tempat lain) |

**Sengaja TIDAK diubah:** hero Rutina Vault espresso+gold (identitas brand — PERSIS seperti sebelumnya, termasuk ShineBorder & FAB gold), chip masuk/pistachio–keluar/clay–transfer/gold di TxRow, bar & badge anggaran (success/warning/danger), `barColor` var(--primary) batas sehat, semua empty state ("Belum ada anggaran" dll.), ring GoalCard (success/warning), tombol & pill (bg-primary / surface-inverse), focus ring gold, tab periode Arus Kas (kontrol utilitas grafik — tetap netral), tab Mutasi/Anggaran/Dompet konten lain.

### Bento desktop (xl+) — tab Ringkasan

**Diterapkan:** "Peta Panas Pengeluaran" (span `wide`=8) + "Temuan & Rekomendasi" (span `feature`=4) — keduanya BERSEBELAHAN dalam DOM. Dua BlurFade terpisah (delay 0.14 & 0.18) digabung jadi satu BlurFade (0.14) yang membungkus m.div entrance baru (opacity 0→1, y 14→0, `motionTokens.duration.enter`, delay 0.13, EASE) + RutinaBentoGrid. Di bawah xl tetap bertumpuk; urutan DOM dipertahankan.

**Dilewati (aturan: urutan DOM mengalahkan pasangan):**
- Hero Vault(8) + "Tujuan Tabungan"(4) → TIDAK bersebelahan (kartu Arus Kas di antaranya; Tujuan juga berada dalam grid lapisan-3 setelah Anggaran). Vault tetap full-width — memang identitas brand hero.
- "Anggaran"(6) + "Aktivitas Terbaru"(6) → TIDAK bersebelahan ("Tujuan Tabungan" di antaranya). Catatan: Anggaran+Tujuan SUDAH berpasangan 2-up sejak dulu via `grid md:grid-cols-2 md:items-start` (ekuivalen medium+medium di xl); grid itu dibiarkan apa adanya agar breakpoint sm/md dan asumsi `sm:grid-cols-2` internal GoalCard (kolom Tujuan baru 2-up mulai md) tidak rusak.
- Tab Mutasi: dibiarkan apa adanya (sesuai spesifikasi round ini).

---

## 3. Verifikasi

- `bunx tsc --noEmit` → exit 0 (0 error; baseline sebelum edit juga 0).
- `bun run lint` (`eslint .`) → exit 0, tanpa output error/warning.
- Override pil aktif diverifikasi terprogram lewat `cn()` proyek: `data-[state=active]:bg-module-accent/15` menimpa `data-[state=active]:bg-surface-primary`, teks lama terhapus, `shadow-soft` bertahan.
- Tidak ada perubahan file lain (`git status` bersih di luar dua layar + laporan ini).
- Semua interaksi (tab, periode grafik, sunting anggaran, dialog dompet, sheets Bugar, sesi latihan imersif) tidak berubah — hanya kelas identitas & pembungkus tata letak.

## 4. Catatan untuk agen berikutnya

- Kedua layar kini memakai utilitas kontekstual (`*-module-accent*`) — jangan hardcode `module-bugar-*` / `module-finance-*` di dalam layar ini; cukup kelas kontekstual yang sama.
- Pola pil aktif module-accent di sub-tab layar modul kini ada preseden di Bugar & Keuangan (bg-module-accent/15 + text-module-accent-strong, shadow-soft dipertahankan) — bisa diikuti Jurnal (mauve) & Statistik (slate) oleh pemilik layar masing-masing.
- Hero Bugar = `bg-module-accent` + `text-module-accent-fg` (terbalik otomatis dark). Hero Keuangan = espresso+gold brand (JANGAN diubah jadi bronze).
- Jika nanti Anggaran+Aktivitas ingin dipasangkan di xl, harus merestrukturisasi lapisan-3 (pisahkan Tujuan dari Anggaran) — itu perubahan urutan DOM, putuskan secara sadar.
