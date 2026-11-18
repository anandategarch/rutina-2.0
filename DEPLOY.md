# Panduan Deploy — Rutina 2.0 (Vercel + Turso)

Dokumen ini merangkum semua yang perlu disiapkan agar Rutina 2.0 berjalan
di Vercel dengan database Turso (libSQL), termasuk arsitektur
sinkronisasi data dan daftar lengkap API routes.

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

> **PENTING — rotasi token 18 Nov 2026:** token lama berumur 1 hari dan
> **kedaluwarsa 19 Nov 2026 03:35 UTC**. Token baru (read-write, tanpa
> kedaluwarsa) sudah dipasang di `.env` lokal dan sandbox. **Perbarui
> `DATABASE_AUTH_TOKEN` di dashboard Vercel dengan token baru** — tanpa
> itu, koneksi database produksi gagal (HTTP 401) begitu token lama
> kedaluwarsa.

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

1. Push repositori ke GitHub (`rutina-2.0`).
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
| `/api/state` | GET, PUT | Snapshot penuh — inti sync engine |
| `/api/habits` | GET, POST | Daftar kebiasaan + histori / buat |
| `/api/habits/[id]` | GET, PATCH, DELETE | Detail / sunting / hapus |
| `/api/habits/[id]/toggle` | POST | Tandai selesai / batalkan per tanggal |
| `/api/notes` | GET, POST | Catatan jurnal (`?folder=&limit=`) |
| `/api/notes/[id]` | PATCH, DELETE | Sematkan / sunting / hapus |
| `/api/transactions` | GET, POST | Transaksi (`?limit=&offset=&type=&walletId=`) |
| `/api/transactions/[id]` | DELETE | Hapus transaksi |
| `/api/wallets` | GET, POST | Dompet |
| `/api/budgets` | GET, PUT | Anggaran per kategori (ganti massal) |
| `/api/goals` | GET, POST | Target tabungan |
| `/api/goals/[id]` | PATCH, DELETE | Sunting (`{contribute}` = setor) / hapus |
| `/api/workouts` | GET, POST | Sesi latihan |
| `/api/workouts/[id]` | DELETE | Hapus sesi |
| `/api/foods` | GET, POST | Asupan makan (`?date=&limit=`) |
| `/api/foods/[id]` | DELETE | Hapus asupan |
| `/api/body` | GET, PUT | Catatan tubuh harian (UPSERT per tanggal) |
| `/api/settings` | GET, PUT | Preferensi `app.*` (k-v) |
| `/api/health` | GET | Health check database |

Semua muatan tulis divalidasi Zod (`src/lib/sync-schema.ts`) dengan batas
wajar (panjang string, jumlah item) — endpoint publik menolak muatan
sampah. Respons seragam `{ ok: true, ... }` / `{ ok: false, error }`.

## 6. Perintah database

| Perintah | Fungsi |
| --- | --- |
| `bun run db:generate` | Generate Prisma Client |
| `bun run db:push` | Terapkan skema ke SQLite lokal (sandbox) |
| `bun run db:sql` | Buat berkas DDL `db/turso-schema.sql` |
| `bun run db:push-turso` | Buat DDL + terapkan ke Turso + verifikasi tabel |
| `bun run db:smoke-turso` | Verifikasi jalur produksi Prisma↔Turso |

## 7. Catatan keamanan

- `.env` dan `db/custom.db` sudah **dihapus dari seluruh riwayat git**
  (git filter-branch + force push; commit lama tidak lagi memuat berkas
  tersebut). File `.env` tetap hidup lokal saja dan tergolong `.gitignore`.
- **Rotasi token:** token pernah terekspos di riwayat git publik sebelum
  pembersihan. Token saat ini (read-write, tanpa kedaluwarsa) hidup di
  `.env` lokal + sandbox. Bila dicurigai bocor, jalankan
  `turso db tokens invalidate <token>` lalu buat baru
  (`turso db tokens create habit-tracker-v2-anandategarch`) dan perbarui
  di dashboard Vercel serta `.env` lokal.
- Semua kredensial produksi hanya hidup di dashboard Vercel / `.env`
  lokal — tidak pernah di-commit.
- `postinstall: prisma generate` sudah ada di `package.json` agar build
  Vercel selalu memiliki Prisma Client yang ter-generate.

## 8. Checklist pasca-deploy

- [ ] `DATABASE_AUTH_TOKEN` di Vercel = token baru (bukan token 1 hari).
- [ ] `GET /api/health` → `connected: true, backend: turso`.
- [ ] Buka aplikasi di ponsel → tab Profil → chip waktu sinkron terisi.
- [ ] Centang satu misi → muat ulang di perangkat lain → tetap tercentang
      (verifikasi sinkronisasi lintas perangkat).
