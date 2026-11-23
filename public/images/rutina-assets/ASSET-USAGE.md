# Manifest Aset Visual Rutina — 30 Ilustrasi

Sumber: paket `rutina-30-visual-assets.zip` (warm editorial / botanical / wellness — matcha, parchment, espresso, gold, terracotta).

- **Format di repo**: WebP saja (`webp/`, ±870 KB total) — format utama aplikasi. PNG asli (±8,8 MB) tetap tersimpan di paket sumber dan tidak dimasukkan ke repo agar tidak membebani bundle `public/`.
- **Kanvas**: lebar 720 px, tinggi bervariasi (±605–864 px). Saat dirender, gunakan kotak seragam + `object-cover` agar rapi.
- **Latar gambar**: parchment baked-in (bukan transparan). Selalu tampilkan di dalam bingkai (rounded + ring) sebagai "inset terang" agar tetap harmonis di mode gelap.
- Katalog deskriptif lengkap: lihat `ASSET-CATALOG.csv`.

## Status Pemakaian

Legenda: ✅ terpakai · 📝 direncanakan · ⬜ belum terpakai (belum ada rumah yang tepat)

| # | Aset | Status | Lokasi Pemakaian | Catatan |
|---|------|--------|------------------|---------|
| 01 | `01-fitness-dumbbells.webp` | ✅ | Beranda — ubin bento Bugar (slot ring, hanya saat tanpa target mingguan) | Dekorasi mengalah saat data (cincin progres) hadir |
| 02 | `02-fitness-running-shoes.webp` | ✅ | Bugar — empty state "Belum ada aktivitas tercatat" (riwayat, mode Daftar) | |
| 03 | `03-wellness-hydration.webp` | ⬜ | — | Kartu hidrasi padat kontrol; tidak dipaksa |
| 04 | `04-wellness-balanced-meal.webp` | ⬜ | — | Panel Asupan padat data; tidak dipaksa |
| 05 | `05-fitness-yoga-mat.webp` | ⬜ | — | Belum ada konteks yang pas |
| 06 | `06-fitness-bicycle.webp` | ⬜ | — | Belum ada konteks yang pas |
| 07 | `07-productivity-stopwatch.webp` | ⬜ | — | Kartu durasi sudah padat data |
| 08 | `08-wellness-sleep.webp` | ⬜ | — | Cadangan pemulihan/kesiapan latihan |
| 09 | `09-wellness-stretching.webp` | ⬜ | — | Belum ada konteks yang pas |
| 10 | `10-wellness-heart-health.webp` | ⬜ | — | Belum ada konteks yang pas |
| 11 | `11-finance-savings-jar.webp` | ✅ | Keuangan — empty state tujuan tabungan | Toples = tujuan |
| 12 | `12-finance-coin-stacks.webp` | ✅ | Beranda — ubin bento Keuangan (stempel pita tengah) | Aman ≥320px (QA DOM) |
| 13 | `13-finance-wallet.webp` | ✅ | Keuangan — empty state transaksi (Ringkasan + Mutasi) | |
| 14 | `14-finance-budget-calculator.webp` | ✅ | Keuangan — empty state anggaran (Ringkasan + tab Anggaran) | |
| 15 | `15-finance-growth-chart.webp` | ⬜ | — | Grafik keuangan sudah pakai viz data |
| 16 | `16-finance-safe-vault.webp` | ✅ | Keuangan — SaldoCard "Rutina Vault" (samping saldo) + empty state dompet | |
| 17 | `17-journal-leather-notebook.webp` | 📝 | Beranda desktop — ubin Jurnal (Tahap 3) | Padanan notebook mobile |
| 18 | `18-journal-open-notebook.webp` | ⬜ | — | Satu aset jurnal per permukaan |
| 19 | `19-journal-ink-and-pen.webp` | ✅ | Jurnal — empty state "Belum ada catatan" | |
| 20 | `20-journal-memory-frame.webp` | ⬜ | — | Belum ada konteks yang pas |
| 21 | `21-habits-sprout.webp` | ✅ | Kebiasaan — empty state "Kebiasaan pertamamu menunggu ditanam" | |
| 22 | `22-botanical-monstera.webp` | 📝 | Beranda desktop — ubin Kebiasaan/Taman (Tahap 3) | Ornamen taman |
| 23 | `23-botanical-blossom-branch.webp` | ⬜ | — | Aksen dekoratif, belum perlu |
| 24 | `24-botanical-flowering-pot.webp` | ✅ | Kebiasaan — empty state "Kebun menunggu ditanam kembali" (Konsistensi) | |
| 25 | `25-botanical-wreath.webp` | ✅ | Statistik — empty state "Belum ada kebiasaan aktif" (Wawasan › Komposisi) | |
| 26 | `26-planner-calendar.webp` | ✅ | Beranda — empty state Agenda Hari Ini (mobile & desktop) | |
| 27 | `27-planner-checklist.webp` | ✅ | Kebiasaan — empty state "Tidak ada agenda terjadwal" (tab Agenda) | |
| 28 | `28-planner-hourglass.webp` | ⬜ | — | Belum ada konteks yang pas |
| 29 | `29-planner-goal-target.webp` | 📝 | Beranda desktop — hero progres (Tahap 3) | Target = progres |
| 30 | `30-achievement-trophy.webp` | ✅ | Bugar — empty state "Rekor lahir setelah set beban pertama" (Papan Rekor e1RM) | |

## Ringkasan

- **Terpakai**: 14 aset (01, 02, 11, 12, 13, 14, 16, 19, 21, 24, 25, 26, 27, 30)
- **Direncanakan (Tahap 3 — Beranda desktop split-screen + bento)**: 17, 22, 29
- **Belum terpakai**: 13 aset — kartu targetnya padat data atau belum ada konteks yang pas; disimpan sebagai cadangan bertema (prinsip paket: "sebagian aset boleh tidak dipakai").

## Pedoman

1. Jangan paksa seluruh 30 aset masuk UI — hanya yang kontekstual; sisanya jadi cadangan bertema.
2. Ilustrasi memberi konteks visual, bukan menggantikan data/interaksi.
3. Selalu dalam bingkai rounded + ring (inset terang) — aman untuk mode gelap.
4. `alt=""` (dekoratif) kecuali gambar informatif.
5. Perubahan status pemakaian dicatat di tabel ini pada commit yang sama dengan pemakaiannya.
