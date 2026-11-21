'use client'

import { useId } from 'react'

/**
 * useSvgId — ID aman untuk <gradient>/<clipPath>/<filter> SVG.
 *
 * useId() React menghasilkan string yang mengandung ":" (mis.
 * "«r0»" / ":r0:") yang TIDAK valid saat dirujuk via url(#…).
 * Sanitasi ini mengganti semua karakter non-alfanumerik sehingga
 * aman dipakai sebagai id + referensi url(#…) — mencegah kolisi
 * ID antar-instance grafik yang sama di satu layar.
 *
 * Pola ini diangkat dari WeightSpark (v2.45) menjadi utilitas bersama.
 */
export function useSvgId(prefix: string): string {
  const raw = useId()
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9]/g, '')}`
}
