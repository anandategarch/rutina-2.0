# Panduan Deploy — Rutina 2.0 (Vercel + Turso)

Dokumen ini merangkum semua yang perlu disiapkan agar Rutina 2.0 berjalan
di Vercel dengan database Turso (libSQL), termasuk arsitektur
sinkronisasi data, gerbang mutu build, dan daftar lengkap API routes.

## 0. Gerbang mutu sebelum deploy (sejak v2.13)

Build kini **menggagalkan diri sendiri** bila ada error tipe atau lint —
`next.config.ts` memakai `typescript.ignoreBuildErrors: false` dan
`eslint.ignoreDuringBuilds: false`. Jalankan verifikasi lengkap sebelum push:

```bash
bun run verify
# = tsc --noEmit → eslint . → bun test (75 tes / 4 suite)
```

| Perintah | Fungsi |
| --- | --- |
| `bun run typecheck` | `tsc --noEmit` — error tipe tertangkap tanpa build |
| `bun run lint` | ESLint seluruh proyek |
| `bun run test` | 75 pengujian otomatis: perhitungan keuangan/kebugaran/XP-streak + skema sinkronisasi (lihat `tests/`) |
| `bun run verify` | Ketiganya berurutan — gerbang pra-push/pre-deploy |

> **Pengujian sinkronisasi:** `tests/sync-schema.test.ts` memvalidasi kontrak
> wire klien ↔ `/api/state` (snapshot valid + default Zod, penolakan muatan
> sampah, pulang-pergi JSON). Uji koneksi database nyata tetap memakai
> `bun run db:smoke-turso` (butuh kredensial).

## 1. Arsitektur

| Lapisan | Teknologi | Keterangan |
| --- | --- | --- |
| Frontend + API | Next.js 16 (App Router) | Deploy ke Vercel |
| Database | Turso (libSQL) | `libsql://habit-tracker-v2-anandategarch.aws-ap-northeast-1.turso.io` |
| ORM | Prisma 6 + `@prisma/adapter-libsql` | Driver adapter — lihat `src/lib/db.ts` |
| Sinkronisasi | Sync engine client → `/api/state` | Offline-first; lihat bagian 6 |

### Alur data (sejak v2 sinkronisasi cloud)

1. Aplikasi tetap **offline-first**: state domain hidup di localStorage
   (Zustand persist) sehingga tetap berfungsi tanpa internet.
2. Saat boot, `useSyncEngine()` (di `RutinaApp`) menarik `GET /api/state`:
   - server belum ter-inisialisasi → data lokal diunggah (perangkat
     pertama yang membuka aplikasi menetapkan dataset cloud);
   - server ter-inisialisasi → bandingkan stempel waktu: suntingan lokal
     yang belum terkirim diunggahkan; selain itu state server ditarik
     (server-menang). Data lokal yang ada selalu menang atas server yang
     kosong (melindungi histori pengguna lama).
3. Setiap perubahan slice domain (centang misi, catat transaksi, dst.)
   dikirim ter-debounce ±0,9 dtk lewat `PUT /api/state` — snapshot penuh
   dalam SATU transaksi database (atomik).
4. Kegagalan jaringan tidak menghilangkan data (tetap di localStorage)
   dan dicoba ulang pada perubahan berikutnya / boot berikutnya.

### Resolusi koneksi database (`src/lib/db.ts`)

Urutan variabel (yang pertama ada menang):

1. `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — kredensial terverifikasi
   (dipakai `db:push-turso` & `db:smoke-turso`); di sandbox ini juga
   menimpa `DATABASE_URL` warisan shell platform.
2. `DATABASE_URL` / `DATABASE_AUTH_TOKEN` — konvensi Vercel.
3. Default `file:./db/custom.db` — dev lokal segar.

## 2. Variabel lingkungan di Vercel

Set di **Project → Settings → Environment Variables**:

| Nama | Nilai |
| --- | --- |
| `DATABASE_URL` | `libsql://habit-tracker-v2-anandategarch.aws-ap-northeast-1.turso.io` |
| `DATABASE_AUTH_TOKEN` | token akses database Turso (read-write) |

> **PENTING — token terverifikasi 18 Nov:** token terbaru (read-write)
> terpasang di `.env` lokal sandbox dan **terverifikasi end-to-end**
> (`SELECT 1` OK via `/v2/pipeline`, migrasi skema v2.1 sukses — 12 tabel
> `rutina_*` terbaca). Catatan: token mentah yang dikirim sempat terpotong
> 1 karakter pada header JWT (`Q` hilang di `...RERTQSIs...`) — versi di
> `.env` sudah diperbaiki dan **tidak memiliki klaim kedaluwarsa** (tahan
> lama). Pastikan `DATABASE_AUTH_TOKEN` di dashboard Vercel memakai token
> yang sama persis dengan isi `TURSO_AUTH_TOKEN` di `.env` (header dimulai
> `eyJhbGciOiJFZERTQSIs...` — perhatikan huruf **Q**).

> **STATUS 18 Nov (gelombang v2.1):** skema v2.1 SUDAH diterapkan ke Turso
> (kolom `restDays`/`afterId`/`mini` di `rutina_habits`, `soreness`/
> `stress` di `rutina_body_logs`, tabel baru `rutina_mood_logs`) lewat
> `scripts/migrate-turso-incremental.ts` — data lama tidak tersentuh.
> Token 1-hari yang dulu dipasang via API **kedaluwarsa 19 Nov 03:35 UTC**
> — WAJIB diganti di dashboard Vercel dengan token tahan lama di atas
> sebelum tanggal itu, jika tidak sinkronisasi produksi akan gagal.

## 3. Sinkronisasi skema ke Turso (sekali per perubahan skema)

Prisma CLI tidak bisa terhubung langsung ke URL `libsql://`, maka DDL
dihasilkan lewat `migrate diff` lalu dieksekusi lewat `@libsql/client`:

```bash
bun install
bun run db:generate      # generate Prisma Client (driverAdapters)
bun run db:push-turso    # buat DDL dari prisma/schema.prisma → terapkan ke Turso
bun run db:smoke-turso   # verifikasi: Prisma + adapter dapat mengakses Turso
```

Skrip yang sama bekerja dari mesin lokal maupun CI — hanya butuh
`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` di `.env`.

> **Catatan tabel lama:** database ini sebelumnya dipakai aplikasi lain dan
> sudah berisi tabel `habits`, `transactions`, `budgets`, dll. Skema Rutina
> 2.0 memakai prefix `rutina_` (mis. `rutina_habits`) sehingga tabel lama
> **tidak tersentuh** — aman bagi data yang sudah ada.

## 4. Deploy ke Vercel

1. Push repositori ke GitHub (`rutina-2.0`) — pastikan `bun run verify`
   lulus lebih dulu (lihat bagian 0; Vercel menjalankan `next build` yang
   kini aktif memeriksa TypeScript & ESLint).
2. Di Vercel: **Add New → Project → Import** repositori `rutina-2.0`.
   - Framework Preset: **Next.js** (terdeteksi otomatis)
   - Build Command: `next build` (bawaan; `package.json` → `build`)
   - Tidak perlu konfigurasi lain — `next.config.ts` sudah kompatibel.
3. Tambahkan variabel lingkungan (bagian 2) untuk lingkungan *Production*
   dan *Preview*.
4. Deploy. Setelah selesai, cek kesehatan database:

```bash
curl https://rutina-2-0.vercel.app/api/health
# {"status":"ok","database":{"connected":true,"backend":"turso",...}}
```

> **URL produksi:** `https://rutina-2-0.vercel.app` (publik).
> URL bervariasi seperti `rutina-2-0-anandategarch1.vercel.app` berada di
> balik Vercel Authentication (perilaku normal Vercel) — gunakan selalu
> domain proyek di atas.

## 5. API Routes (baca/tulis Turso)

| Route | Metode | Fungsi |
| --- | --- | --- |
| `/api/state` | GET, PUT | Snapshot penuh — inti sync engine (satu-satunya jalur data domain) |
| `/api/health` | GET | Health check database + status konfigurasi token (`syncToken`) |

> v2.45 memensiunkan 17 endpoint per-domain lama (`/api/habits`,
> `/api/notes`, `/api/transactions`, dst.) — seluruh mutasi kini mengalir
> lewat snapshot `/api/state` yang atomik. Muatan tulis divalidasi Zod
> (`src/lib/sync-schema.ts`) dengan batas wajar (panjang string, jumlah
> item); respons seragam `{ ok: true, … }` / `{ ok: false, error, code? }`.

## 6. Perintah database

| Perintah | Fungsi |
| --- | --- |
| `bun run db:generate` | Generate Prisma Client |
| `bun run db:push` | Terapkan skema ke SQLite lokal (sandbox) |
| `bun run db:sql` | Buat berkas DDL `db/turso-schema.sql` |
| `bun run db:push-turso` | Buat DDL + terapkan ke Turso + verifikasi tabel |
| `bun run db:smoke-turso` | Verifikasi jalur produksi Prisma↔Turso |

## 7. Catatan keamanan

- **`db/custom.db` di-untrack sejak v2.16 (audit T5-b #1)** — berkas
  database lokal berisi data pribadi pengguna (transaksi, jurnal, mood)
  dan sebelumnya ikut ter-commit. Sekarang hanya hidup lokal
  (`.gitignore: db/*.db` berlaku). Catatan jujur: commit-commit lama
  di riwayat git masih memuat snapshot lamanya — bila repo pernah
  publik, bersihkan riwayat dengan `git filter-repo --path db/custom.db
  --invert-paths` + force push, atau jadikan repo private.
- **Shared secret API (v2.16, audit T5-b #2; WAJIB sejak v2.45):** produksi
  wajib memasang token — tanpa itu, seluruh `/api/*` (kecuali `/api/health`)
  ditolak 401 (fail-closed) dan aplikasi hanya hidup dari localStorage
  (gejala: toast "Sinkronisasi ditolak server" tiap buka aplikasi).
  **Sejak v2.62 cukup SATU variabel** — `NEXT_PUBLIC_SYNC_TOKEN` saja sudah
  sah: server menerimanya sebagai token efektif bila `SYNC_TOKEN` tidak
  terpasang (di Vercel, bundle klien & env server lahir dari deployment
  yang sama). Bila `SYNC_TOKEN` terpasang, hanya nilai itu yang diterima.
  Nilai kedua sisi di-trim otomatis (spasi tersembunyi hasil salin-tempel
  tidak lagi merusak kecocokan). Verifikasi pasca-deploy:
  `curl https://rutina-2-0.vercel.app/api/health` → `"syncToken":"configured"`.
  Token DB Turso sebaiknya dibuat dengan kedaluwarsa (mis. 90 hari) lalu
  dirotasi — jangan lagi "tahan lama".
- **Header keamanan dasar (v2.16, audit T5-b #4):** `next.config.ts`
  mengirim `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`
  + CSP mode laporan (`Content-Security-Policy-Report-Only`).
- `.env` tidak pernah di-commit (tetap `.gitignore`).
- `postinstall: prisma generate` sudah ada di `package.json` agar build
  Vercel selalu memiliki Prisma Client yang ter-generate.

## 8. Checklist pasca-deploy

- [ ] `bun run verify` lulus lokal (typecheck + lint + seluruh tes).
- [ ] `DATABASE_AUTH_TOKEN` di Vercel = token baru (bukan token 1 hari).
- [ ] **Token sinkronisasi terpasang di Vercel** — paling sederhana:
      `NEXT_PUBLIC_SYNC_TOKEN=<nilai apa pun>` (Production & Preview) →
      redeploy. Cek: `GET /api/health` → `"syncToken":"configured"`;
      `GET /api/state` tanpa header → 401 dengan body ber-
      `"code":"sync_token_mismatch"`.
- [ ] `GET /api/health` → `connected: true, backend: turso`.
- [ ] Buka aplikasi di ponsel → tab Profil → chip waktu sinkron terisi.
- [ ] Centang satu misi → muat ulang di perangkat lain → tetap tercentang
      (verifikasi sinkronisasi lintas perangkat).
- [ ] (Performa data besar) Buka tab Mutasi dengan histori panjang —
      daftar dirender bertahap (desktop 60 awal; ponsel 14 hari +
      "Muat lagi"), tanpa jank gulir.
