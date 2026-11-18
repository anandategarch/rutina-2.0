# Task 3-b — Layar Kebiasaan: Split-Screen Detail Panel (Desktop xl+)

Agent: kebiasaan-split-screen (Task ID 3-b)
Scope: menambah tata letak split-screen (daftar + panel detail) pada seksi **"Semua kebiasaan"** di layar Kebiasaan, bagian dari upgrade Earth-Tone Editorial Bento. Hanya SATU file yang disentuh.

## File yang diubah

- `src/components/rutina-mobile/screens/kebiasaan.tsx` — satu-satunya file. Tidak ada file lain (bento/module/card/metric/section-header/task-row/store hanya dibaca untuk API).

## Yang dibangun

### 1. Split-screen "Semua kebiasaan" (xl+)

Cabang non-kosong dari seksi (dulu `m.div` daftar terkelompok langsung) kini dibungkus:

```
<div className="xl:grid xl:grid-cols-12 xl:gap-5">
  <div className="min-w-0 xl:col-span-7">   → m.div daftar terkelompok LAMA, konten tak berubah
  <aside ... xl:col-span-5>                 → Panel Detail Kebiasaan (BARU)
</div>
```

- Kelas `xl:*` saja → di bawah xl susunan tetap satu kolom dan panel **tersembunyi total** (`hidden ... xl:block`) — perilaku ponsel/tablet sepenuhnya sama dengan sebelumnya (verifikasi: pembungkus tanpa kelas grid di bawah xl, `m.div` lama + kelas `mt-4 space-y-5` dipertahankan persis).
- `RutinaBentoGrid`/`RutinaBentoItem` TIDAK dipakai di sini (spesifikasi task meminta kelas mentah `xl:grid-cols-12` 7/5; RutinaBentoGrid memasang `sm:grid-cols-6` yang akan mengubah tata letak rentang sm–lg — diluar mandat "unchanged").
- Lipatan Arsip tetap DI LUAR pembungkus (lebar penuh, persis seperti dulu) — panel menempel hanya sepanjang tinggi kisi daftar.

### 2. Panel Detail Kebiasaan (komponen lokal baru `HabitDetailPanel`)

`<aside aria-label="Detail kebiasaan terpilih">` (role complementary implisit) sticky:
`hidden self-start xl:sticky xl:top-0 xl:col-span-5 xl:mt-4 xl:block xl:max-h-[calc(100dvh-12rem)] xl:overflow-y-auto no-scrollbar`
(`xl:mt-4` menyamakan tepi atas panel dengan daftar kiri; self-start mencegah peregangan item grid sehingga sticky bekerja).

Isi (`RutinaCard variant="elevated" density="spacious" radius="2xl"`):
1. `RutinaSectionHeader title={habit.title} eyebrow="Detail kebiasaan" accent` — aksen matcha via token `module-accent` default (Kebiasaan tanpa `data-module`, `--module-accent` = matcha di globals.css).
2. Baris identitas: titik `HABIT_CAT_COLORS[habit.cat]` + label kategori uppercase.
3. `RutinaMetric size="sm"` berikon:
   - **Streak saat ini** — `habitStreak(...)` + unit "hari", trend up saat > 0 (Flame, tint matcha `bg-primary/15 text-success`).
   - **Selesai pekan ini** — `weekDoneCount(...)` (helper lokal sudah ada), caption "dari {weeklyTarget} target pekanan" (Check).
   - **Versi 2 menit** — teks `habit.mini`, truncate `max-w-[240px]` (Timer) — hanya bila ada.
   - **Setelah** — judul kebiasaan pemicu dari `afterId`, di-resolve dari daftar `habits` (Link2, tint espresso — konsisten ikon stacking TaskRow) — hanya bila ada & pemicu ditemukan.
   - **Hari jeda** — jumlah `restDays.length`, unit "hari", caption "jeda runtun aman terjadwal" (Snowflake) — hanya bila > 0.
4. Riwayat 30 hari: label kecil "30 hari terakhir" + baris 30 titik `h-2.5 w-2.5 rounded-full` (`bg-primary` bila `isDoneOn` hari itu, `bg-surface-sunken` bila tidak; tanggal via `addDaysISO(today, -i)`, i = 29..0), `flex-wrap gap-1`, pembungkus `aria-label="Riwayat 30 hari terakhir"`, titik aria-hidden.
5. Aksi: tombol penuh h-11 "Sunting kebiasaan" (Pencil) → `openHabitEdit(habit.id)` — handler yang SAMA dengan tombol Edit TaskRow (dipass sebagai prop `onEdit={openHabitEdit}`).

Animasi masuk: `m.div` opacity 0→1, y 14→0, `motionTokens.duration.enter`, easing standard, delay 0.1. `key={selectedHabit.id}` pada komponen → pergantian pilihan memutar ulang entrance.

## Bidang Habit yang ditemukan & dipakai (interface di store.ts)

| Bidang | Tipe | Dipakai |
| --- | --- | --- |
| `mini` | `string` | ya — metrik "Versi 2 menit" |
| `afterId` | `string \| null` | ya — metrik "Setelah" (judul di-resolve dari `habits`) |
| `restDays` | `string[]` (tanggal ISO jeda terjadwal) | ya — metrik "Hari jeda" (jumlah) |
| `weeklyTarget`, `cat`, `schedule`, `reminder`, `desc`, `createdAt`, `archived` | — | sudah dipakai bagian lain layar |

Ketiga bidang opsional itu ADA di interface — tidak ada baris yang dilewati.

## Pendekatan pengkabelan pemilihan (selection wiring)

`TaskRow` tidak punya prop `onSelect` (hanya habit/done/streak/recent/weekDone/xp/expanded/readOnly/onToggle/onExpand/onEdit) → dipakai JALUR GANDA tanpa merusak perilaku lama:

1. **Pembungkus div per TaskRow** dengan `onClick={() => setSelectedId(h.id)}` (pola yang direkomendasikan task). Tombol centang TaskRow memanggil `stopPropagation` sehingga menandai selesai TIDAK mengubah pilihan; klik badan kartu (expand) dan tombol Edit (bubble) memilih kebiasaan.
2. **`onExpand` ditambah** `setSelectedId(h.id)` setelah `toggleExpandedTask(h.id)` — menutup pintasan keyboard TaskRow (Enter/Spasi memanggil onExpand langsung tanpa event click) sehingga pengguna keyboard juga bisa mengganti panel. `onToggle`/`onEdit` tidak disentuh.

Umpan balik visual: pembungkus diberi `xl:ring-2` + `transition-shadow` — `xl:ring-primary/60` pada baris terpilih, `xl:ring-transparent` pada lainnya (hanya muncul di xl+; di bawah xl tidak ada perubahan visual sama sekali). Perbandingan memakai kebiasaan EFEKTIF (`selectedHabit?.id === h.id`, bukan `selectedId`) agar baris dan panel selalu sehati, termasuk saat fallback bawaan.

## Kebiasaan efektif (fallback)

`const selectedId = useState<string | null>(null)`; kebiasaan efektif dihitung SAAT RENDER (tanpa useMemo — React Compiler yang memoize):
`activeHabits.find(h => h.id === selectedId) ?? catGroups[0]?.items[0] ?? null`.
- Terpilih tapi terarsipkan/hilang → jatuh ke baris pertama daftar (urutan tampilan kategori, agar cocok dengan baris teratas yang diberi cincin).
- Bila tidak ada kebiasaan aktif sama sekali → cabang ini tak dirender (empty state seksi); panel juga diguard `{selectedHabit && ...}`.

## Catatan teknis penting (React Compiler)

- `selectedHabit` (turunan state `selectedId` + memo `activeHabits`/`catGroups`) HANYA dipakai di JSX — tidak pernah di dalam callback, sesuai pelajaran Task 2 (`addDaysISO(today, -1)` di level render → error `react-hooks/preserve-manual-memoization`).
- Callback panel memakai prop murni: panel dijadikan komponen terpisah `HabitDetailPanel` yang menerima `habit`/`habits`/`completions`/`today`/`onEdit` sebagai prop — closure hanya menangkap prop (pola yang sama dengan TaskRow), bebas jebakan compiler. Handler tanggal (`addDaysISO`) dihitung inline saat render panel untuk array JSX, bukan di-pass ke callback.
- `onExpand` baru menangkap `h` (variabel map dari memo `catGroups`) + setter — pola yang sudah terbukti aman (`toggleHabit(h.id, today)`).
- Catatan: plugin ESLint react-compiler tidak terpasang di `node_modules` dan rule dimatikan di eslint.config.mjs — verifikasi compiler lewat kepatuhan pola, bukan linter.
- Animasi `m.*` lama (header, journalList/journalCard stagger, lipatan AnimatePresence) tidak diubah; pembungkus div polos tidak memutus propagasi variants (m.div journalList tetap orang tua variant bagi anak-anaknya).

## Strip ringkasan

Sudah `grid grid-cols-3 gap-2.5` sejak Task 2 — tiga tile stat berdampingan di SEMUA lebar (termasuk sm+). Sesuai instruksi "only adjust if it's currently 1-col" → TIDAK diubah.

## Verifikasi

- `bun run lint` → PASS, exit 0, tanpa error/warning.
- `bunx tsc --noEmit` → exit 0, tanpa error (tidak ada error baru).
- Tidak menjalankan dev server / build (sesuai instruksi).
- `git status`: satu-satunya file yang disentuh task ini `src/components/rutina-mobile/screens/kebiasaan.tsx` (file lain yang tampak modified adalah kotoran task-task sebelumnya).

## Cara memverifikasi manual

Buka preview di lebar xl (≥1280px) → tab "Kebiasaan" → gulir ke "Semua kebiasaan": daftar di kiri (7/12), panel detail menempel di kanan (5/12). Klik sembarang kartu kebiasaan → panel berganti (entrance halus) + cincin matcha pindah ke baris itu; gulir → panel ikut menempel di atas. Klik tombol centang → status selesai berubah, pilihan panel TIDAK berubah. Klik "Sunting kebiasaan" → sheet sunting kebiasaan terbuka (sama dengan Edit di baris). Kecilkan di bawah xl → panel hilang, daftar kembali satu kolom persis seperti sebelumnya. Keyboard: Tab ke baris TaskRow + Enter → panel ikut terpilih.
