# Task 3-c — Keuangan: Private Vault & Ledger (Mutasi Workspace + Saving Rate)

Agent: 3-c (Keuangan Vault & Ledger). Status: DONE — `bun run lint` exit 0 (no output), `bunx tsc --noEmit` exit 0, dev.log clean (page served 200 with fresh compile after edits; no error lines in the whole log).

Scope: HANYA `src/components/rutina-mobile/screens/keuangan.tsx` (1 file; tidak ada file finance/* yang diubah). File lain (store.ts, globals.css, fin-chart, add-tx-sheet, SaldoCard hero, ka-ching anime) hanya DIBACA untuk API.

---

## Daftar perubahan (dengan baris akhir di keuangan.tsx, total 2.545 baris)

| # | Lokasi (baris) | Perubahan |
|---|---|---|
| 1 | 22–31 | Import lucide baru: `ScrollText` (24), `Search` (25), `X` (30) |
| 2 | 48–53 | Import shadcn baru: `Input` (48), `ResizableHandle/ResizablePanel/ResizablePanelGroup` (49–53) |
| 3 | 69–72 | Import store: `type TxType` (69), `type Wallet as FinWallet` (70 — alias wajib karena bentrok ikon lucide `Wallet`); `import { playfair } from '../serif'` (72) |
| 4 | 596–1093 | BLOK BARU "Workspace Mutasi (desktop lg+)": `MutasiFilter`+`TYPE_FILTERS` (604–611), helper `amountTone`/`amountText`/`walletLabelOf` (615–635), `LedgerRow` (640–697), `TxInspectorDetail` (702–864), `TxInspector` (869–912), `MutasiWorkspace` (916–1093) |
| 5 | 1568–1587 | Derivasi `savingRate`/`savingRateTone`/`savingRateLabel` — (masuk − keluar) / masuk × 100%, null → "—" bila masuk = 0 |
| 6 | 1807 | Akar layar: tambah `data-layout="vault"` (di samping `data-module="finance"`) → `--layout-gap: 1.25rem; --layout-hero-radius: 1.75rem` |
| 7 | 1831 | Stack seksi utama: `gap-5` → `gap-[var(--layout-gap)]` (nilai sama 1.25rem, kini token-driven) |
| 8 | 1890–1959 | Kartu Arus Kas: blok chip di-restrukturisasi — `m.div` (key=period, crossfade) kini membungkus `div.grid.grid-cols-3` (3 chip Masuk/Keluar/Net TIDAK berubah) + BARIS BARU "Rasio Tabungan" full-width (1940–1957): ikon PiggyBank `text-module-accent-strong`, caption "Sisa pemasukan yang berhasil disimpan", angka % `tabular-nums text-[17px]`, tone success/danger/netral, ikut crossfade per ganti periode |
| 9 | 2304–2353 | Tab Mutasi: cabang non-kosong kini `<>` berisi (a) `<MutasiWorkspace className="mt-3 hidden lg:block" />` (2320) dan (b) daftar mobile LAMA dibungkus `div.mt-3.space-y-5.lg:hidden` (2324) — isi persis sama (TxRow per hari). Empty state global (txs=0) TIDAK berubah. SectionTitle "Mutasi" + Badge jumlah + pil "+ Tambah" tetap dipakai bersama |

TIDAK disentuh: SaldoCard hero + FAB + ka-ching, FinChart + layoutId (fin-active-col/fin-underline), add-tx-sheet, TxRow (mobile), tab Anggaran/Dompet, bento heatmap/temuan, globals.css, store.ts.

---

## Struktur DOM workspace Mutasi (lg+)

```
div.h-[calc(100dvh-18rem)].min-h-[460px].max-h-[840px].mt-3.hidden.lg:block   ← MutasiWorkspace
└ ResizablePanelGroup (direction=horizontal, autoSaveId="mutasi-workspace")
  ├ ResizablePanel id="mutasi-ledger" defaultSize=60 minSize=38 .min-w-0
  │ └ section[aria-label="Buku mutasi"].card.rounded-24.flex-col.overflow-hidden
  │   ├ header (shrink-0, border-b, p-4)
  │   │  ├ div.relative → Search icon + Input(h-11, bg-surface-sunken, pl-10) + tombol X clear
  │   │  └ div.flex-wrap → 4 chip filter (Semua/Masuk/Keluar/Transfer, h-8 rounded-full,
  │   │     aria-pressed; aktif = bg-module-accent/15 text-module-accent-strong) + counter "N transaksi"
  │   └ div.flex-1.overflow-y-auto.overscroll-contain.no-scrollbar   ← gulir mandiri kiri
  │     └ div.px-4.pb-4
  │       └ section per hari → sticky day header (-mx-4 px-4, bg-surface-primary/95
  │         backdrop-blur, border-b, tanggal uppercase + ringkasan +masuk/−keluar tabular-nums)
  │         └ LedgerRow × n  (button.ledger-row: min-h-11, ikon kategori h-8 tinted,
  │            title truncate + sub "kategori · dompet", tanggal fmtDate, nominal w-28
  │            text-right font-bold tabular-nums — masuk text-success "+", keluar
  │            text-content-danger "−", transfer text-content-muted tanpa tanda;
  │            terpilih → bg-module-accent-soft/50 + inset 2px bar var(--module-accent);
  │            hairline bawah dari utilitas ledger-row, last-child tanpa border)
  ├ ResizableHandle (withHandle, hairline bg-border, hover/drag → gold, after:w-2 hit area)
  └ ResizablePanel id="mutasi-inspector" defaultSize=40 minSize=26 .min-w-0
    └ aside[aria-label="Detail transaksi terpilih"].card.rounded-24.overflow-hidden
      └ TxInspector
        └ AnimatePresence(mode="wait") → TxInspectorDetail (key=tx.id) | empty (key="kosong")
          ├ scroll: eyebrow "DETAIL TRANSAKSI" + Badge tipe (pistachio/clay/gold),
          │ judul playfair 17px, nominal besar 30px font-bold tabular-nums (tone per arus,
          │ transfer = content-primary), dl.ledger-row (Kategori+ikon, Dompet, Tanggal
          │ format panjang id-ID, Jadwal bila rekursif), kotak Catatan bila ada note
          └ footer border-t: [Hapus → AlertDialog persis alur TxRow (deleteTx + toast)] [Tutup → onClear]
```

Empty inspector: ikon ScrollText + "Pilih transaksi untuk melihat detail" + caption. Empty ledger (filter tidak cocok): "Tidak ada mutasi yang cocok".

## Cara kerja state search/filter/inspector

- Semua state LOKAL di `MutasiWorkspace` (unmount saat pindah tab — reset wajar): `query` (string), `filter` (`'semua'|'masuk'|'keluar'|'transfer'`), `selectedTxId` (`string | null`).
- `q = query.trim().toLowerCase()` → `filtered = txs.filter(type match && (note.includes(q) || CAT_META[cat].label.includes(q)))` → `ledgerGroups = groupByDay(filtered)` (groupByDay lama dari finance/utils, terbaru dulu).
- `selectedTx = txs.find(id === selectedTxId)` — dicari di **txs penuh**, bukan hasil filter → inspektor tetap stabil saat filter berubah; tx dihapus → otomatis null → keadaan kosong.
- Klik LedgerRow → `setSelectedTxId(tx.id)`; tombol "Tutup" → null. Inspektor crossfade `AnimatePresence mode="wait"`, opacity 0.15 dtk (key = tx.id / "kosong") — TANPA layoutId baru (tidak bentrok fin-active-col / fin-underline / tx-type-pill).
- Saving rate memakai state `period` yang SAMA dengan kartu Arus Kas (lokal KeuanganScreen, sudah ada) — `totals` = jumlah seluruh deret periode terpilih; periode "Semua" = seluruh waktu.

## Keputusan & catatan untuk agen berikutnya

- **Tombol Edit TIDAK dibuat**: spec bilang "opens existing edit flow if one exists" — sudah diverifikasi store.ts TIDAK punya `updateTx`/`editTx` dan TxRow hanya punya Hapus+Tutup; add-tx-sheet tidak punya mode edit. Membuat alur edit = menyentuh store.ts + add-tx-sheet (dilarang). Inspektor hanya Hapus (alur AlertDialog yang sama persis dengan TxRow) + Tutup.
- **"date+time"**: `Tx.ts` hanya menyimpan tanggal ISO (yyyy-mm-dd), tanpa jam. Inspektor menampilkan tanggal lengkap ("18 Juni 2025", Intl id-ID + fromISO).
- Mobile (<lg) 100% tidak berubah — hanya pembungkus `lg:hidden` ditambahkan; keadaan kosong global tetap dipakai semua lebar saat txs = 0.
- Semua angka uang baru `tabular-nums`; tanda minus memakai U+2212 (konsisten TxRow). Tanpa animasi infinite; animasi baru hanya opacity (crossfade inspektor) + `transition-[background-color,box-shadow]` 150 ms pada baris ledger — otomatis patuh reduced-motion via AppMotionProvider (MotionConfig reducedMotion="user").
- `autoSaveId="mutasi-workspace"` + id panel → lebar panel dipertahankan di localStorage (react-resizable-panels v3; props diverifikasi dari d.ts).
- Tinggi workspace `calc(100dvh-18rem)` dihitung dari padding main (lg:p-6/xl:p-8) + pt layar + tabs h-12 + mt-4 + SectionTitle + mt-3 + pb-28 — muat tanpa scroll halaman di lg/xl; min 460px / max 840px.
- `Wallet` (tipe store) diimpor sebagai `FinWallet` agar tidak bentrok dengan ikon lucide `Wallet`.

## Verifikasi

- `bun run lint` → exit 0, tanpa error/warning (ESLint next core-web-vitals + typescript; config sangat longgar — exhaustive-deps off).
- `bunx tsc --noEmit` → exit 0.
- dev.log: tidak ada baris error; `GET / 200` dengan compile ulang (213 ms) SETELAH edit — SSR halaman sehat. Dev server dikelola sistem (tidak dijalankan manual).
- `git status`: hanya `src/components/rutina-mobile/screens/keuangan.tsx` + laporan ini yang ditambah task ini.
