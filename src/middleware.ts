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
 * Tanpa ini, GET/PUT /api/state di URL publik membaca/menimpa seluruh
 * data pribadi tanpa penghalang apa pun.
 * ===================================================================== */
export function middleware(req: NextRequest) {
  const required = process.env.SYNC_TOKEN
  if (!required) return NextResponse.next()

  const path = req.nextUrl.pathname
  if (!path.startsWith('/api/') || path === '/api/health') {
    return NextResponse.next()
  }

  if (req.headers.get('x-sync-token') === required) {
    return NextResponse.next()
  }

  return NextResponse.json(
    { ok: false, error: 'Token sinkronisasi tidak valid' },
    { status: 401 },
  )
}

export const config = { matcher: '/api/:path*' }
