import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/* =====================================================================
 * Shared secret untuk seluruh /api/* (audit v2.16 T5-b #2, keras v2.45).
 *
 * V2.62 — TIGA perbaikan akar-masalah atas laporan produksi
 * "Sinkronisasi ditolak server — Konfigurasi SYNC_TOKEN belum cocok":
 *
 * 1. KONFIGURASI SATU VARIABEL KINI SAH. Dulunya server hanya mengenali
 *    SYNC_TOKEN sedangkan klien hanya bisa mengirim nilai
 *    NEXT_PUBLIC_SYNC_TOKEN — pasang salah satu saja = 401 selamanya.
 *    Kini token efektif server = SYNC_TOKEN bila terpasang, ATAU
 *    NEXT_PUBLIC_SYNC_TOKEN sebagai berkas-akhir (di Vercel bundle klien
 *    dan env server lahir dari deployment yang sama, jadi satu variabel
 *    cukup). SYNC_TOKEN tetap diutamakan: begitu terpasang, HANYA nilai
 *    itu yang diterima (rahasia kuat tidak tergerus fallback publik).
 * 2. WHITESPACE DIRAPIKAN. Nilai env hasil salin-tempel di dashboard
 *    sering membawa spasi/baris-akhir tersembunyi — sumber klasik
 *    "sudah sama tapi tetap tidak cocok". Kedua sisi di-trim.
 * 3. ALASAN DITOLAK DAPAT DIBACA MESIN. Body 401 membawa `code`
 *    (`sync_token_unconfigured` | `sync_token_mismatch`) sehingga klien
 *    bisa menampilkan panduan perbaikan yang tepat sasaran, bukan tebak-tebakan.
 *
 * Fail-closed v2.45 tetap: produksi tanpa token sama sekali = seluruh
 * /api/* data ditolak — GET /api/state adalah bukaan seluruh data pribadi
 * (catatan, transaksi, berat badan, mood) dan PUT bisa menimpanya.
 * "Tanpa token" hanya diizinkan di pengembangan.
 * ===================================================================== */

/** Token efektif sisi server — SYNC_TOKEN diutamakan, NEXT_PUBLIC_SYNC_TOKEN
 *  sebagai fallback konfigurasi satu-variabel (v2.62). String kosong bila
 *  keduanya tidak terpasang. */
function effectiveToken(): string {
  const primary = (process.env.SYNC_TOKEN ?? '').trim()
  if (primary) return primary
  return (process.env.NEXT_PUBLIC_SYNC_TOKEN ?? '').trim()
}

/** Perbandingan konstan-waktu (XOR penuh panjang maksimum) — middleware
 *  berjalan di edge runtime tanpa node:crypto; network jitter membuat
 *  serangan timing nyaris mustahil, tapi audit yang benar tidak berspekulasi. */
function tokenEquals(presented: string, required: string): boolean {
  const a = presented
  const b = required
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

function reject(code: 'sync_token_unconfigured' | 'sync_token_mismatch') {
  return NextResponse.json(
    {
      ok: false,
      code,
      error:
        code === 'sync_token_unconfigured'
          ? 'Server belum dikonfigurasi untuk sinkronisasi'
          : 'Token sinkronisasi tidak valid',
    },
    { status: 401, headers: { 'cache-control': 'no-store' } },
  )
}

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (!path.startsWith('/api/') || path === '/api/health') {
    return NextResponse.next()
  }

  const required = effectiveToken()

  /* v2.45 (audit keamanan): berproduksi tanpa token apa pun = menolak
     semua API data (fail-closed). */
  if (!required && process.env.NODE_ENV === 'production') {
    console.error(
      '[proxy] SYNC_TOKEN/NEXT_PUBLIC_SYNC_TOKEN belum terpasang — /api/* ditolak (fail-closed).',
    )
    return reject('sync_token_unconfigured')
  }

  if (!required) return NextResponse.next()

  if (tokenEquals((req.headers.get('x-sync-token') ?? '').trim(), required)) {
    return NextResponse.next()
  }

  return reject('sync_token_mismatch')
}

export const config = { matcher: '/api/:path*' }
