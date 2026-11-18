# Panduan Deploy — Rutina 2.0 (Vercel + Turso)

Dokumen ini merangkum semua yang perlu disiapkan agar Rutina 2.0 berjalan
di Vercel dengan database Turso (libSQL).

## 1. Arsitektur

| Lapisan | Teknologi | Keterangan |
| --- | --- | --- |
| Frontend + API | Next.js 16 (App Router) | Deploy ke Vercel |
| Database | Turso (libSQL) | `libsql://habit-tracker-v2-anandategarch.aws-ap-northeast-1.turso.io` |
| ORM | Prisma 6 + `@prisma/adapter-libsql` | Driver adapter — lihat `src/lib/db.ts` |
| Data sementara | localStorage (Zustand persist) | Aplikasi saat ini client-side; layer DB telah disiapkan untuk migrasi bertahap |

`src/lib/db.ts` membaca `DATABASE_URL`:

- diawali `file:` → SQLite lokal (development sandbox);
- diawali `libsql:` → Turso via driver adapter (produksi Vercel).

## 2. Variabel lingkungan di Vercel

Set di **Project → Settings → Environment Variables**:

| Nama | Nilai |
| --- | --- |
| `DATABASE_URL` | `libsql://habit-tracker-v2-anandategarch.aws-ap-northeast-1.turso.io` |
| `DATABASE_AUTH_TOKEN` | token akses database Turso |

Catatan:

- Token ada di `.env` lokal (tidak di-commit). Buat token baru kapan pun
  lewat `turso db tokens create <nama-db>` bila perlu.
- Jangan menaruh nilai produksi di `.env.example`.

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
curl https://<proyek-anda>.vercel.app/api/health
# {"status":"ok","database":{"connected":true,"backend":"turso",...}}
```

## 5. Perintah database

| Perintah | Fungsi |
| --- | --- |
| `bun run db:generate` | Generate Prisma Client |
| `bun run db:push` | Terapkan skema ke SQLite lokal (sandbox) |
| `bun run db:sql` | Buat berkas DDL `db/turso-schema.sql` |
| `bun run db:push-turso` | Buat DDL + terapkan ke Turso + verifikasi tabel |

## 6. Catatan keamanan

- `.env` dan `db/custom.db` sudah **dihapus dari pelacakan git**
  (`git rm --cached`) dan masuk `.gitignore`. Riwayat lama masih memuat
  berkas tersebut — bila pernah ada kredensial sensitif, lakukan rotasi
  token dan pertimbangkan pembersihan riwayat (git filter-repo).
- Semua kredensial produksi hanya hidup di dashboard Vercel.
