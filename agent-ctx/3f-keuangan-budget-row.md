# Task 3-f — Keuangan: Target Anggaran Lebih Informatif (BudgetRow daily allowance)

Agent: 3-f (Keuangan Budget Row). Status: DONE — `bunx eslint src/components/rutina-mobile/screens/keuangan.tsx` exit 0 (nol output), `bunx tsc --noEmit -p tsconfig.json` nol error (nol output), `git status` hanya 1 file termodifikasi, dev.log bersih (server tetap jalan, tidak direstart, tidak ada error).

Scope: HANYA fungsi `BudgetRow` di `src/components/rutina-mobile/screens/keuangan.tsx` (2 hunk, +14/−2 baris). Tidak ada bagian lain file (3.475 baris) yang tersentuh — diverifikasi via `git diff`.

---

## Latar audit

Pola YNAB: target per kategori harus membantu keputusan. Baris eyebrow lama `Sisa X bulan ini` pasif — pengguna tidak tahu berapa jatah aman PER HARI sampai akhir bulan.

## Perubahan

### Hunk 1 — derivasi hari & jatah harian (setelah `playEntrance`, sekarang baris 1477–1485)

Baru di badan komponen:

```tsx
const now = fromISO(todayISO())
const daysLeft =
  new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
  now.getDate() +
  1
const remaining = limit - used
const daily = Math.max(0, Math.round(remaining / daysLeft))
```

Catatan implementasi:
- Memakai pola tanggal lokal file (`todayISO()` + `fromISO` dari `../store`) — identik hasilnya dengan `new Date()` untuk keperluan year/month/date (sudah dicek definisi helper di store.ts:560–574; `isoOf` memakai `getFullYear/getMonth/getDate` lokal, `fromISO` membangun `Date` lokal).
- `daysLeft` = sisa hari bulan berjalan TERMASUK hari ini: `tglAkhirBulan - tanggalHariIni + 1`. Contoh: tgl 15 di bulan 30 hari → 16 hari. Selalu >= 1 (tidak ada divisi nol).
- `daily` dibulatkan `Math.round`, di-clamp `Math.max(0, ...)` sesuai spesifikasi task.

### Hunk 2 — baris eyebrow (sekarang baris 1538–1548)

Teks lama (cabang tidak over):
- `Sisa ${formatIDRShort(limit - used)} bulan ini`

Teks baru:
- Tidak over DAN `remaining > 0`: `Sisa {formatIDRShort(remaining)} bulan ini · ±{formatIDRShort(daily)}/hari ({daysLeft} hari)`
- Tidak over DAN `remaining <= 0` (tepat sama): teks lama tanpa bagian harian
- Cabang over TIDAK berubah: `Lewat ${formatIDRShort(used - limit)} dari batas`

Kelas styling dipertahankan (`mt-1 text-eyebrow`, `font-semibold text-content-danger` untuk over, `text-content-muted` untuk tidak over); ditambah `leading-snug` agar baris yang kini lebih panjang wrap rapi di dalam kolom `min-w-0 flex-1` (pemisah `·` konsisten dengan konvensi file, mis. "Pekan n · ..." dan TxRow).

## Verifikasi

1. Baca ulang seluruh `BudgetRow` (baris 1448–1623): JSX seimbang, semua variabel baru (`now`, `daysLeft`, `remaining`, `daily`) terpakai, tidak ada variabel tak terpakai.
2. `bunx eslint src/components/rutina-mobile/screens/keuangan.tsx` → exit 0, nol output.
3. `bunx tsc --noEmit -p tsconfig.json 2>&1 | head -20` → nol output (nol error type di seluruh proyek).
4. `git diff --stat` → hanya `keuangan.tsx`, 14 insertions / 2 deletions, kedua hunk di dalam `BudgetRow`.

## Catatan untuk agent berikutnya

- Jangan refactor `BudgetRow` tanpa membaca komentar blok sunting batas (RutinaDialog, bukan AlertDialog — sengaja, alasan a11y ada di komentar baris 1551–1552).
- `daysLeft` dihitung ulang tiap render (murah, tanpa memori). Jika kelak dipakai lintas banyak row, pertimbangkan hoist ke level list — tapi jangan diubah sekarang tanpa kebutuhan.
- Tidak ada perubahan API/state; murni presentasi client-side.
