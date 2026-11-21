import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/* =====================================================================
 * Shared secret opsional untuk seluruh /api/* (audit v2.16 T5-b #2).
 *
 * Bila process.env.SYNC_TOKEN diisi, setiap permintaan API (kecuali
 * /api/health yang dipakai uptime-probe) wajib membawa header
 * `x-sync-token` bernilai sama; klien mengirimkannya lewat
 * NEXT_PUBLIC_SYNC_TOKEN (lihat sync-engine.ts — kosong di sandbox
 * berarti autentikasi mati dan perilaku lama tetap berjalan).
 *
 * v2.45: di produksi token TIDAK LAGI opsional — tanpa SYNC_TOKEN,
 * seluruh /api/* data ditolak (fail-closed).
 *
 * Tanpa ini, GET/PUT /api/state di URL publik membaca/menimpa seluruh
 * data pribadi tanpa penghalang apa pun.
 * ===================================================================== */
export function middleware(req: NextRequest) {
  const required = process.env.SYNC_TOKEN
  const path = req.nextUrl.pathname
  if (!path.startsWith('/api/') || path === '/api/health') {
    return NextResponse.next()
  }

  /* v2.45 (audit keamanan): berproduksi tanpa SYNC_TOKEN = menolak
     semua API data — GET /api/state adalah bukaan seluruh data pribadi
     (catatan, transaksi, berat badan, mood) dan PUT bisa menimpanya.
     "Opsional" hanya di pengembangan; produksi wajib fail-closed. */
  if (!required && process.env.NODE_ENV === 'production') {
    console.error(
      '[middleware] SYNC_TOKEN belum diisi — /api/* ditolak (fail-closed).',
    )
    return NextResponse.json(
      { ok: false, error: 'Server belum dikonfigurasi untuk sinkronisasi' },
      { status: 401 },
    )
  }

  if (!required) return NextResponse.next()

  if (req.headers.get('x-sync-token') === required) {
    return NextResponse.next()
  }

  return NextResponse.json(
    { ok: false, error: 'Token sinkronisasi tidak valid' },
    { status: 401 },
  )
}

export const config = { matcher: '/api/:path*' }
