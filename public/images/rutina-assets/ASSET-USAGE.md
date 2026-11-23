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
| 01 | `01-fitness-dumbbells.webp` | 📝 | Beranda — ubin bento Bugar | Identitas modul Bugar di ringkasan |
| 02 | `02-fitness-running-shoes.webp` | 📝 | Bugar — empty state riwayat latihan | Kardio/aktivitas |
| 03 | `03-wellness-hydration.webp` | ⬜ | — | Cadangan panel Tubuh (Hidrasi) |
| 04 | `04-wellness-balanced-meal.webp` | ⬜ | — | Cadangan panel Asupan |
| 05 | `05-fitness-yoga-mat.webp` | ⬜ | — | Belum ada konteks yang pas |
| 06 | `06-fitness-bicycle.webp` | ⬜ | — | Belum ada konteks yang pas |
| 07 | `07-productivity-stopwatch.webp` | ⬜ | — | Kartu durasi sudah padat data |
| 08 | `08-wellness-sleep.webp` | ⬜ | — | Cadangan pemulihan/kesiapan latihan |
| 09 | `09-wellness-stretching.webp` | ⬜ | — | Belum ada konteks yang pas |
| 10 | `10-wellness-heart-health.webp` | ⬜ | — | Belum ada konteks yang pas |
| 11 | `11-finance-savings-jar.webp` | 📝 | Keuangan — empty state tujuan tabungan | Toples tabungan = tujuan |
| 12 | `12-finance-coin-stacks.webp` | 📝 | Beranda — ubin bento Keuangan | Saldo/akumulasi |
| 13 | `13-finance-wallet.webp` | 📝 | Keuangan — empty state transaksi | Dompet = mutasi |
| 14 | `14-finance-budget-calculator.webp` | 📝 | Keuangan — empty state anggaran | Kalkulator anggaran |
| 15 | `15-finance-growth-chart.webp` | ⬜ | — | Grafik keuangan sudah pakai viz data |
| 16 | `16-finance-safe-vault.webp` | 📝 | Keuangan — SaldoCard "Rutina Vault" + empty dompet | Brankas = vault |
| 17 | `17-journal-leather-notebook.webp` | 📝 | Beranda desktop — ubin Jurnal | Padanan notebook mobile |
| 18 | `18-journal-open-notebook.webp` | ⬜ | — | Satu aset jurnal per permukaan |
| 19 | `19-journal-ink-and-pen.webp` | 📝 | Jurnal — empty state catatan | Tema menulis |
| 20 | `20-journal-memory-frame.webp` | ⬜ | — | Belum ada konteks yang pas |
| 21 | `21-habits-sprout.webp` | 📝 | Kebiasaan — empty state kebiasaan pertama | Tunas = mulai tumbuh |
| 22 | `22-botanical-monstera.webp` | 📝 | Kebiasaan — ornamen hero layar | Ornamen taman |
| 23 | `23-botanical-blossom-branch.webp` | ⬜ | — | Aksen dekoratif, belum perlu |
| 24 | `24-botanical-flowering-pot.webp` | 📝 | Kebiasaan — empty state kebun | Kebun menunggu ditanam |
| 25 | `25-botanical-wreath.webp` | 📝 | Statistik — empty state komposisi kebiasaan | Bingkai komposisi |
| 26 | `26-planner-calendar.webp` | 📝 | Beranda — empty state agenda | Agenda kosong |
| 27 | `27-planner-checklist.webp` | 📝 | Kebiasaan — empty state agenda harian | Misi harian |
| 28 | `28-planner-hourglass.webp` | ⬜ | — | Belum ada konteks yang pas |
| 29 | `29-planner-goal-target.webp` | 📝 | Beranda desktop — hero progres | Target = progres |
| 30 | `30-achievement-trophy.webp` | 📝 | Bugar — empty state Papan Rekor e1RM | Rekor/pencapaian |

## Pedoman

1. Jangan paksa seluruh 30 aset masuk UI — hanya yang kontekstual; sisanya jadi cadangan bertema.
2. Ilustrasi memberi konteks visual, bukan menggantikan data/interaksi.
3. Selalu dalam bingkai rounded + ring (inset terang) — aman untuk mode gelap.
4. `alt=""` (dekoratif) kecuali gambar informatif.
5. Perubahan status pemakaian dicatat di tabel ini pada commit yang sama dengan pemakaiannya.
