'use client'

import { useRutina } from '../store'
import { catMetaOf, type CatMeta } from './cats'

/** Lookup meta kategori yang sadar kategori buatan + ganti nama (v2.17,
 *  v2.22) — hook React tipis di atas catMetaOf agar komponen cukup satu
 *  baris: `const catMeta = useCatMeta()` lalu `catMeta(tx.cat).label`.
 *  Ganti nama kategori bawaan otomatis menular ke seluruh tampilan. */
export function useCatMeta(): (cat: string) => CatMeta {
  const customCats = useRutina((s) => s.customCats)
  const catRenames = useRutina((s) => s.catRenames)
  return (cat: string) => catMetaOf(cat, customCats, catRenames)
}
