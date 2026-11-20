'use client'

import { useCallback } from 'react'
import { useRutina } from '../store'
import { catMetaOf, type CatMeta } from './cats'

/** Lookup meta kategori yang sadar kategori buatan + ganti nama (v2.17,
 *  v2.22) — hook React tipis di atas catMetaOf agar komponen cukup satu
 *  baris: `const catMeta = useCatMeta()` lalu `catMeta(tx.cat).label`.
 *  Ganti nama kategori bawaan otomatis menular ke seluruh tampilan.
 *  Identitas stabil (v2.37 audit perf): callback dikunci useCallback pada
 *  data (customCats/catRenames) — memo pemanggil (MutasiWorkspace,
 *  findings) tidak batal tiap render karena closure baru. */
export function useCatMeta(): (cat: string) => CatMeta {
  const customCats = useRutina((s) => s.customCats)
  const catRenames = useRutina((s) => s.catRenames)
  return useCallback(
    (cat: string) => catMetaOf(cat, customCats, catRenames),
    [customCats, catRenames],
  )
}
