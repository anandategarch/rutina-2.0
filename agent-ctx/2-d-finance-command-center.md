# Task 2-d — Finance Command Center (Layar Keuangan / Rutina 2.0)

Agent: finance-command-center
Tanggal: 2026-11-18
File yang diubah: `src/components/rutina-mobile/screens/keuangan.tsx` (penuh, 1769 baris), `src/components/rutina-mobile/finance/fin-chart.tsx` (penuh)
File yang TIDAK disentuh: store.ts, sync-engine.ts, utils.ts, cats.ts, semua sheet (add-tx-sheet / transfer-sheet / goal-sheets), globals.css, layar lain.

## Struktur akhir layar (atas ke bawah)

Subtab (RutinaTabs, Radix): **Ringkasan | Mutasi | Anggaran | Dompet** (struktur 4 tab lama dipertahankan).

### Tab Ringkasan — "command center" 4 lapisan + aktivitas
1. **Lapisan 1 — Saldo**: kartu Rutina Vault (visual lama dipertahankan: ShineBorder, tilt 3D, glow emas, Counter, anime.js ka-ching) + FAB tambah. BARU: baris perubahan periode di bawah angka saldo — `+8,4 jt vs bulan lalu` (TrendingUp/pistachio, TrendingDown/clay, Minus/muted bila 0). Delta = net periode ini − net periode sebelumnya (transfer dikecualikan). Disembunyikan saat mode "Semua".
2. **Lapisan 2 — Arus Kas** (kartu penuh, `md:max-w-none` untuk grafik):
   - Kontrol periode segmented: **Minggu ini | Bulan ini | Semua** (RutinaTabs Radix, keyboard-navigable). "Semua" = tampilan lokal (deret bulan dari arus kas pertama s.d. bulan berjalan, termasuk bulan kosong); `minggu`/`bulan` tetap tersinkron ke `store.finPeriod`. "Tahun" lama tidak lagi ditawarkan di UI (FinPeriod store tak diubah; nilai persist 'tahun' dipetakan ke 'bulan' saat init).
   - Chip ringkasan: Masuk (success) / Keluar (danger) / **Net** (dinamis) — 3 kolom, bg-surface-sunken.
   - Grafik: remount per ganti periode (AnimatePresence mode="wait" keyed by period) → batang tumbuh berantai dari nol; ketuk batang memilih titik.
   - Baris ringkasan titik terpilih di bawah grafik (aria-live="polite"): label panjang (mis. "Rab, 18 Nov" / "Pekan 2 · 8–14 Nov" / "November" / "November 2026") + Masuk/Keluar/Net titik itu.
3. **Lapisan 3 — Anggaran (ringkasan)**: kartu dengan Badge "Terpakai X%", bar total gradient, **3 kategori paling terbebani** (sort rasio pakai/limit) memakai BudgetRow (tetap bisa disunting), tombol "+N kategori lagi" → pindah tab Anggaran. Kosong → RutinaEmptyState.
4. **Lapisan 4 — Tujuan**: header + "+ Tujuan"; baris total "Terkumpul X dari Y"; kartu tujuan (cincin SVG, %, nama, tersimpan/dari target, **"Sisa X lagi"** BARU, tombol **"Setor"** (dulu "Tambah", tetap membuka ContributeGoalSheet), badge Tercapai) + kartu putus-putus Tujuan Baru. Mobile: carousel snap; **≥sm: grid 2 kolom** (fade tepi disembunyikan).
5. **Aktivitas Terbaru** (BARU): 4 transaksi terakhir sebagai TxRow (bisa diekspansi) + "Lihat Semua" → tab Mutasi. Kosong → RutinaEmptyState + "Catat Transaksi".

Responsif: Lapisan 3 & 4 dalam `grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start` (grid-cols-1 eksplisit penting — tanpa itu kolom implisit auto melebar mengikuti max-content dan terpotong di ponsel; bug ini ditemukan & diperbaiki lewat pengukuran DOM). Saldo + Arus Kas tetap lebar penuh.

### Tab Mutasi
Pengelompokan per hari + TxRow. Detail ekspansi diperluas: **Kategori | Tanggal | Dompet (BARU: nama dompet / A → B) | Arus** (grid 2 kolom, sm:4) + blok **Catatan** (BARU) bila ada note. Tombol Hapus (AlertDialog konfirmasi) + Tutup dipertahankan. Empty state → RutinaEmptyState + aksi.

### Tab Anggaran
Kartu ShineBorder + total bar + seluruh BudgetRow (dapat disunting: set limit, hapus, toast) + chip tambah kategori. Polish sesuai spesifikasi: **ambang warning 85% → 80%**; badge **"Hampir batas"** (bg-gold/25, text-warning) di ≥80% dan **"Melebihi"** (bg-clay/20, text-content-danger) di >100%; track bar berwarna sesuai status (bg-border / bg-gold/25 / bg-clay/20); ikon kategori ikut berwarna status. Kosong → RutinaEmptyState.

### Tab Dompet
Tidak berubah: daftar dompet (saldo per dompet), tombol Transfer (disabled <2 dompet), + Dompet, catatan transfer, Riwayat Transfer (5). Empty state → RutinaEmptyState + tombol "Buat Dompet".

## fin-chart.tsx (peningkatan)
- Sorotan kolom titik aktif `layoutId="fin-active-col"` (bg-primary/10) yang meluncur antar titik, selain underline emas lama.
- Batang non-aktif: hover feedback (group-hover:opacity-80) + hover bg kolom — "others pressable".
- Lebar batang adaptif terhadap jumlah titik (9/7/5/4px + gap) dan label sumbu-x melangkah (tiap 1/2/3) agar mode "Semua" padat tidak bertumpuk.
- Stagger delay dibatasi (min 0.5s) untuk deret panjang.
- Props tidak berubah: `{ points, active, onPick }`.

## Fitur & aksi lama — semua dipertahankan
openTxSheet (FAB + kartu Vault + Mutasi + empty states), openGoalDialog (+ Tujuan ×2), openGoalSheet → ContributeGoalSheet (Setor), openTransferSheet, openWalletDialog + WalletDialog (utuh), setBudget/removeBudget + dialog sunting, deleteTx + konfirmasi, toggleExpandedTx, setFinPeriod (sinkron untuk minggu/bulan), Counter + anime.js ka-ching, tilt/ShineBorder/Spotlight/BlurFade, pengelompokan mutasi per hari, riwayat transfer, badge jumlah transaksi, periodScope, semua formatter (formatIDR/formatIDRShort). Tidak ada fitur lama yang dihapus.

Perubahan label/nilai semantik (disengaja): "Tambah" → "Setor" (tujuan); ambang warning 85%→80%; tab periode "Minggu/Bulan/Tahun" → "Minggu ini/Bulan ini/Semua"; chip Masuk/Keluar pindah ke dalam kartu Arus Kas + chip Net baru.

## Catatan teknis
- lazy motion: hanya `m.*` + `motionTokens` (easing.standard); tidak ada `motion.div`.
- Tanpa setState-dalam-effect untuk titik grafik aktif (aturan react-hooks/set-state-in-effect): seleksi pengguna disimpan `{ period, i }`, fallback "hari ini" diderivasi murni (defaultActive / titik terakhir untuk Semua), di-clamp ke panjang deret.
- TypeScript ketat, tanpa `any`; seluruh angka via useMemo/derivasi.
- Terverifikasi di browser (agent-browser): struktur a11y 4 tab + 5 bagian, ketuk batang P2 → "Pekan 2 · 8–14 Nov", mode Semua (Okt+Nov, delta hero disembunyikan), ekspansi baris (Dompet "Tunai", Catatan "Es kopi sore"), tab Anggaran/Dompet, tanpa error console/page. VLM QA visual: PASS (mobile & desktop) setelah perbaikan grid-cols-1.

## Hasil validasi
`bunx eslint src/components/rutina-mobile/screens/keuangan.tsx src/components/rutina-mobile/finance/fin-chart.tsx` → exit 0 (bersih). `bunx tsc --noEmit` → tidak ada error pada kedua file.
