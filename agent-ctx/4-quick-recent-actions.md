# Task 4 — Quick Action Hub: Aksi Terakhir Digunakan (Rutina 2.0)

Agent: Z.ai Code (quick-recent-actions agent)
Status: COMPLETE — scoped ESLint 0 error/warning, tsc hanya menyisakan 1 error pre-existing di file agen lain (detail di bawah), dev server compile + GET / 200 bersih.

## File yang diubah (HANYA ini)

`src/components/rutina-mobile/quick-action-hub.tsx` — tidak ada file lain disentuh.

## 1. State terakhir digunakan (useQuickHub)

- `QuickHubState` ditambah `recent: string[]` (key aksi, terbaru di depan) dan `pushRecent(key)`.
- `pushRecent`: `set((s) => ({ recent: [key, ...s.recent.filter((k) => k !== key)].slice(0, 3) }))` — pindah ke depan bila sudah ada (duplikat disaring), pangkas ke 3.
- Store dibungkus `persist` dari `zustand/middleware` (zustand 5.0.10):
  - `name: 'rutina-2.0-quick-recent'`, `version: 1`, `storage: createJSONStorage(() => localStorage)` (pola persis journal-ui.ts/store.ts), `skipHydration: true`, `partialize: (s) => ({ recent: s.recent })`.
  - HANYA `recent` yang dipersist — `open`/`openHub`/`closeHub`/`toggleHub` tetap segar tiap sesi (partialize menangani).
- Rehidrasi pasca-mount sekali, DI DALAM komponen `QuickActionHub` (selalu terpasang di rutina-app.tsx, jadi jalan sekali per muat aplikasi):
  `useEffect(() => { void useQuickHub.persist.rehydrate() }, [])` — pola sama dengan journal.tsx line 412.
- Komponen berlangganan `const recent = useQuickHub((s) => s.recent)`.

## 2. Perekaman (runAction)

Helper (di dalam komponen, tepat setelah helper `run`):

```ts
const runAction = (a: HubAction) => {
  a.run()                                        // dulu — membuka sheet target
  useQuickHub.getState().pushRecent(a.key)       // menyusul — hanya aksi yang terpicu tercatat
}
```

Dua titik eksekusi PRIMARY_ACTIONS yang ditemukan & dibungkus `run(() => runAction(a))`:
1. KARTU KISI (sebelumnya `onClick={() => run(a.run)}`, grid 3 kolom saat kueri kosong).
2. GRUP "Aksi" HASIL PENCARIAN cmdk (sebelumnya `onSelect={() => run(a.run)}`).

URUTAN PENUTUPAN TIDAK DIUBAH: helper `run` (closeHub dulu → fn sesudahnya, konvensi v2-c "closeHub-then-run") dibiarkan apa adanya; `runAction` hanya menggantikan `fn` yang dipass sehingga urutan efektif = closeHub → a.run() → pushRecent. Karena ketiganya setState sinkron yang di-batch React, hasil akhir identik dan perilaku open/close lama 100% terjaga.

Titik eksekusi LAIN TIDAK dicatat (sesuai lingkup tugas — hanya PRIMARY_ACTIONS): NAV_ITEMS, EXPLORE_ITEMS ("Jelajahi"), kebiasaan/catatan/transaksi hasil pencarian tetap `run(...)` lama.

## 3. UI "Terakhir digunakan"

Dirender saat `q === ''` DAN `recentActions.length > 0`, sebagai anak PERTAMA m.div `key="action-grid"` (ikut animasi height collapse saat mulai mengetik), DI ATAS kisi 6 aksi:

- Container: `<section role="group" aria-label="Aksi terakhir digunakan" className="px-5 pt-4">`.
- Label eyebrow: `Terakhir digunakan` — `text-meta font-bold uppercase tracking-[0.08em] text-content-muted` (pola "Terakhir dilatih" gerakan-picker-sheet.tsx line 212).
- Deret chip `mt-2 flex flex-wrap gap-2`; tiap chip `m.button`:
  - Kelas: `flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-sunken px-3.5 text-meta font-bold text-content-secondary transition-colors hover:border-primary/40 hover:text-content-primary` + ring focus-visible (pola chip Jelajahi).
  - Ikon aksi POLOS `h-3.5 w-3.5 strokeWidth={2}` (tanpa lingkaran tint) + label pendek `a.label`.
  - `aria-label={`Jalankan lagi: ${a.listLabel}`}`, `whileTap scale 0.94 + pressSnappy` (identik chip Jelajahi), onClick `run(() => runAction(a))`.
- Data: `recentActions = Array.from(new Set(recent)).map((k) => PRIMARY_ACTIONS.find((a) => a.key === k)).filter((a): a is HubAction => a !== undefined)` — key tak dikenal dibuang (jaga data lama), dedup jaga React key.
- RINGKAS: satu baris label + satu baris chip; kisi utama (`px-5 pb-2 pt-4`) tidak diubah sama sekali.
- Chip juga memakai runAction → memakai chip memindahkan aksi itu ke depan recent.

## Verifikasi

1. `bunx eslint src/components/rutina-mobile/quick-action-hub.tsx` → 0 error, 0 warning.
2. `bunx tsc --noEmit -p tsconfig.json 2>&1 | head -20` → satu-satunya error: `fitness/training-calendar.tsx(278,33) TS2345` — file UNTRACKED (`??` di git status) milik pekerjaan agen lain, TIDAK mengimpor quick-action-hub/useQuickHub (sudah digrep), bukan error baru dari perubahan ini. quick-action-hub.tsx sendiri: 0 error type.
3. `grep useQuickHub src/components/rutina-mobile/` → konsumen lain hanya bottom-nav.tsx (`s.open`, `s.toggleHub`) dan checkin-sheet.tsx (komentar saja) — penambahan field tidak mengubah perilaku open/close mereka; FAB di file yang sama tetap `s.open`/`s.toggleHub`.
4. dev.log: `GET / 200` (compile Turbopack bersih, tanpa error runtime); warning di log (next.config eslint key, middleware→proxy) pre-existing dan tidak berhubungan.

## Catatan untuk agen berikutnya

- Key aksi yang valid saat ini: `habit`, `note`, `tx`, `workout`, `food`, `checkin` — jika menambah/mengganti aksi di PRIMARY_ACTIONS, recent lama di localStorage otomatis aman (key tak dikenal tersaring saat render).
- Persist key: `rutina-2.0-quick-recent` (hanya `{ recent: string[] }`, version 1).
- Jangan mengubah urutan `run` (closeHub dulu) — konvensi lintas semua aksi hub.
