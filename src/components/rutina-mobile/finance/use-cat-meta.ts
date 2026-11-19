'use client'

import { useRutina } from '../store'
import { catMetaOf, type CatMeta } from './cats'

/** Lookup meta kategori yang sadar kategori buatan (v2.17) — hook
 *  React tipis di atas catMetaOf agar komponen cukup satu baris:
 *  `const catMeta = useCatMeta()` lalu `catMeta(tx.cat).label`. */
export function useCatMeta(): (cat: string) => CatMeta {
  const customCats = useRutina((s) => s.customCats)
  return (cat: string) => catMetaOf(cat, customCats)
}
